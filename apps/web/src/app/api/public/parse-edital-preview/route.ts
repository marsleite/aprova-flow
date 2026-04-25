/**
 * API Route pública — Preview de parse de edital
 *
 * Rate limit:
 *   - 1 parse por email (lifetime) via Firestore edital_parse_tokens
 *   - 3 requests por hora por IP via Firestore edital_parse_ip_limits
 *
 * Não requer autenticação Firebase.
 * Não armazena email em texto plano nas coleções de rate limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { parseJsonFromModelText } from '@/lib/ai';
import { generateGeminiPdf } from '@/lib/ai/providers/gemini';

const MAX_SIZE_MB = 10;
const IP_RATE_LIMIT = 3;
const IP_WINDOW_MS = 60 * 60 * 1000;
const PREVIEW_SUBJECTS_MAX = 5;

// ── Helpers ────────────────────────────────────────────────────

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function getFirestoreBaseUrl(): string {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    '';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

type FirestorePrimitive = string | number | boolean | null;

function toFields(data: Record<string, FirestorePrimitive>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) { fields[k] = { nullValue: null }; continue; }
    if (typeof v === 'string') { fields[k] = { stringValue: v }; continue; }
    if (typeof v === 'boolean') { fields[k] = { booleanValue: v }; continue; }
    if (Number.isInteger(v)) { fields[k] = { integerValue: String(v) }; continue; }
    fields[k] = { doubleValue: v };
  }
  return fields;
}

function fromFields(fields: Record<string, unknown> | undefined): Record<string, FirestorePrimitive> {
  if (!fields) return {};
  const out: Record<string, FirestorePrimitive> = {};
  for (const [k, raw] of Object.entries(fields)) {
    if (!raw || typeof raw !== 'object') continue;
    const v = raw as Record<string, unknown>;
    if ('stringValue' in v) out[k] = String(v.stringValue ?? '');
    else if ('booleanValue' in v) out[k] = Boolean(v.booleanValue);
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = Number(v.doubleValue);
    else out[k] = null;
  }
  return out;
}

async function fsGet(collection: string, docId: string): Promise<{ exists: boolean; data?: Record<string, FirestorePrimitive> }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const url = `${getFirestoreBaseUrl()}/${collection}/${encodeURIComponent(docId)}?key=${apiKey}`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`Firestore GET ${collection}/${docId} failed: ${res.status}`);
  const body = (await res.json()) as { fields?: Record<string, unknown> };
  return { exists: true, data: fromFields(body.fields) };
}

async function fsPatch(
  collection: string,
  docId: string,
  data: Record<string, FirestorePrimitive>,
  createOnly = false,
): Promise<{ ok: boolean; status: number }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const params = new URLSearchParams({ key: apiKey });
  if (createOnly) params.set('currentDocument.exists', 'false');
  const url = `${getFirestoreBaseUrl()}/${collection}/${encodeURIComponent(docId)}?${params.toString()}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status };
}

async function fsCreate(collection: string, data: Record<string, FirestorePrimitive>): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const url = `${getFirestoreBaseUrl()}/${collection}?key=${apiKey}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
    cache: 'no-store',
  });
}

// ── Rate limit por IP ───────────────────────────────────────────

async function checkIpRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const docId = sha256(ip);
  const now = Date.now();

  try {
    const doc = await fsGet('edital_parse_ip_limits', docId);
    if (!doc.exists || !doc.data) {
      await fsPatch('edital_parse_ip_limits', docId, { count: 1, windowStart: now });
      return { allowed: true };
    }

    const windowStart = Number(doc.data.windowStart ?? 0);
    const count = Number(doc.data.count ?? 0);

    if (now - windowStart > IP_WINDOW_MS) {
      await fsPatch('edital_parse_ip_limits', docId, { count: 1, windowStart: now });
      return { allowed: true };
    }

    if (count >= IP_RATE_LIMIT) return { allowed: false };

    await fsPatch('edital_parse_ip_limits', docId, { count: count + 1, windowStart });
    return { allowed: true };
  } catch {
    // Se Firestore falhar, libera para não travar usuários
    return { allowed: true };
  }
}

// ── Rate limit por email (1 por lifetime) ──────────────────────

async function checkEmailToken(email: string): Promise<{ allowed: boolean }> {
  const docId = sha256(email.toLowerCase().trim());
  try {
    const doc = await fsGet('edital_parse_tokens', docId);
    return { allowed: !doc.exists };
  } catch {
    return { allowed: true };
  }
}

async function consumeEmailToken(email: string): Promise<void> {
  const docId = sha256(email.toLowerCase().trim());
  await fsPatch(
    'edital_parse_tokens',
    docId,
    { emailHash: docId, usedAt: new Date().toISOString() },
    true, // createOnly — garante idempotência
  );
}

// ── Salvar na waitlist ─────────────────────────────────────────

async function saveToWaitlist(email: string): Promise<void> {
  await fsCreate('waitlist', {
    email: email.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
    source: 'edital_parse',
  });
}

// ── Prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um especialista em editais de concursos públicos brasileiros.

Analise o PDF e extraia as matérias/disciplinas cobradas na prova.

REGRAS:
1. Extraia APENAS matérias explicitamente mencionadas no edital
2. Estime o peso de cada matéria proporcionalmente ao número de tópicos
3. Os pesos DEVEM somar exatamente 100
4. Sugira uma meta semanal realista em horas (entre 8 e 30h)
5. Extraia o nome oficial do concurso/órgão
6. Se a data da prova objetiva estiver disponível, retorne em examDate no formato YYYY-MM-DD, caso contrário null

RESPONDA EXCLUSIVAMENTE em JSON válido, sem markdown:

{
  "planName": "Nome do Concurso/Órgão + Ano",
  "examDate": "2026-09-13",
  "subjects": [
    { "subject": "Nome da Matéria", "weight": 20 }
  ],
  "suggestedWeeklyGoalHours": 15,
  "totalSubjectsFound": 8
}

Use nomes CURTOS para matérias (ex: "Direito Civil", "Português").
Arredonde pesos para inteiros.`;

// ── Handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1. Rate limit por IP
  const ipCheck = await checkIpRateLimit(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em 1 hora.' },
      { status: 429 },
    );
  }

  let body: { pdfBase64?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const { pdfBase64, email } = body;

  // 2. Validação básica
  if (!email || typeof email !== 'string' || email.trim().length < 5 || email.trim().length > 255 || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return NextResponse.json({ error: 'PDF não fornecido.' }, { status: 400 });
  }

  const sizeBytes = (pdfBase64.length * 3) / 4;
  if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `PDF excede o limite de ${MAX_SIZE_MB}MB.` }, { status: 400 });
  }

  // 3. Rate limit por email (1 por lifetime)
  const emailCheck = await checkEmailToken(email);
  if (!emailCheck.allowed) {
    return NextResponse.json(
      { error: 'email_already_used', message: 'Você já usou seu parse gratuito. Crie sua conta para analisar mais editais.' },
      { status: 429 },
    );
  }

  // 4. Processa com Gemini direto (requer GEMINI_API_KEY no apps/web/.env.local)
  let rawText = '';
  try {
    const aiResponse = await generateGeminiPdf({
      model: 'gemini-2.0-flash',
      request: {
        task: 'parse-edital',
        pdfBase64,
        prompt: 'Analise este edital de concurso público e extraia as matérias cobradas.',
        temperature: 0.2,
        maxOutputTokens: 4096,
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    rawText = aiResponse.text?.trim() ?? '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('GEMINI_API_KEY')) {
      console.error('[parse-edital-preview] GEMINI_API_KEY não configurada no apps/web/.env.local');
      return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 });
    }
    if (msg.includes('timeout') || msg.includes('DEADLINE')) {
      return NextResponse.json({ error: 'O PDF é muito grande. Tente um edital menor.' }, { status: 408 });
    }
    console.error('[parse-edital-preview] AI error:', msg);
    return NextResponse.json({ error: 'Erro ao processar o edital. Verifique se é um PDF válido.' }, { status: 500 });
  }

  const raw = rawText;
  if (!raw) {
    return NextResponse.json({ error: 'Não foi possível ler o PDF. Verifique se é um edital válido.' }, { status: 422 });
  }

  const parsed = parseJsonFromModelText<{
    planName: string;
    examDate?: string | null;
    subjects: { subject: string; weight: number }[];
    suggestedWeeklyGoalHours: number;
    totalSubjectsFound: number;
  }>(raw);

  if (!parsed || !Array.isArray(parsed.subjects) || parsed.subjects.length === 0) {
    return NextResponse.json({ error: 'Não foi possível interpretar o edital. Tente novamente.' }, { status: 422 });
  }

  // 5. Normaliza pesos para somar 100
  const sanitized = parsed.subjects.map((s) => ({
    ...s,
    weight: Number.isFinite(s.weight) ? Math.max(0, s.weight) : 0,
  }));
  const totalWeight = sanitized.reduce((a, s) => a + s.weight, 0);
  let subjects = sanitized;
  if (totalWeight > 0 && totalWeight !== 100) {
    const factor = 100 / totalWeight;
    subjects = sanitized.map((s) => ({ ...s, weight: Math.round(s.weight * factor) }));
    const sum = subjects.reduce((a, s) => a + s.weight, 0);
    if (sum !== 100) subjects[0].weight += 100 - sum;
  }

  const totalSubjectsFound = subjects.length;
  const previewSubjects = subjects.slice(0, PREVIEW_SUBJECTS_MAX);

  // 6. Consome o token de email e salva na waitlist (fire-and-forget)
  void consumeEmailToken(email);
  void saveToWaitlist(email);

  return NextResponse.json({
    planName: parsed.planName,
    examDate:
      typeof parsed.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.examDate)
        ? parsed.examDate
        : null,
    subjects: previewSubjects,
    suggestedWeeklyGoalHours: Math.max(5, Math.min(40, parsed.suggestedWeeklyGoalHours || 15)),
    totalSubjectsFound,
    isPreviewTruncated: totalSubjectsFound > PREVIEW_SUBJECTS_MAX,
    hiddenSubjectsCount: Math.max(0, totalSubjectsFound - PREVIEW_SUBJECTS_MAX),
  });
}
