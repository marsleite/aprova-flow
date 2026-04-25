/**
 * API Route pública — Preview de parse de edital sem autenticação
 *
 * Rate limit: 3 requisições por hora por IP.
 * Retorna apenas as primeiras 5 matérias como preview (truncado intencionalmente).
 * O resultado completo exige criação de conta.
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseJsonFromModelText } from '@/lib/ai';
import { generateGeminiPdf } from '@/lib/ai/providers/gemini';

// Rate limit simples em memória (por IP, reinicia ao reiniciar o servidor)
// Para beta com baixo volume é suficiente; em produção escalar com Redis/KV
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const PREVIEW_SUBJECTS_MAX = 5;
const MAX_SIZE_MB = 8;

function getRateLimitInfo(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = getRateLimitInfo(ip);

  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite de 3 análises por hora atingido. Crie uma conta para análises ilimitadas.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-RateLimit-Remaining': '0' } }
    );
  }

  try {
    const body = await req.json();
    const { pdfBase64 } = body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return NextResponse.json({ error: 'PDF não fornecido.' }, { status: 400 });
    }

    const sizeBytes = (pdfBase64.length * 3) / 4;
    if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `PDF excede o limite de ${MAX_SIZE_MB}MB para preview.` },
        { status: 400 }
      );
    }

    const aiResponse = await generateGeminiPdf({
      model: 'gemini-2.0-flash',
      request: {
        task: 'parse-edital',
        pdfBase64,
        prompt: 'Analise este edital de concurso público e extraia as matérias cobradas conforme as instruções.',
        temperature: 0.2,
        maxOutputTokens: 4096,
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const raw = aiResponse.text?.trim() || '';
    if (!raw) {
      return NextResponse.json(
        { error: 'Não foi possível ler o PDF. Verifique se é um edital válido.' },
        { status: 422 }
      );
    }

    const parsed = parseJsonFromModelText<{
      planName: string;
      examDate?: string | null;
      subjects: { subject: string; weight: number }[];
      suggestedWeeklyGoalHours: number;
      totalSubjectsFound: number;
    }>(raw);

    if (!parsed || !Array.isArray(parsed.subjects)) {
      return NextResponse.json(
        { error: 'Não foi possível interpretar o edital. Tente novamente.' },
        { status: 422 }
      );
    }

    // Normaliza pesos para somar 100
    const sanitized = parsed.subjects.map((s) => ({
      ...s,
      weight: Number.isFinite(s.weight) ? Math.max(0, s.weight) : 0,
    }));
    const totalWeight = sanitized.reduce((acc, s) => acc + s.weight, 0);
    let subjects = sanitized;
    if (totalWeight > 0 && totalWeight !== 100) {
      const factor = 100 / totalWeight;
      subjects = sanitized.map((s) => ({ ...s, weight: Math.round(s.weight * factor) }));
      const sum = subjects.reduce((a, s) => a + s.weight, 0);
      if (sum !== 100) subjects[0].weight += 100 - sum;
    }

    const totalSubjectsFound = subjects.length;
    const previewSubjects = subjects.slice(0, PREVIEW_SUBJECTS_MAX);
    const isPreviewTruncated = totalSubjectsFound > PREVIEW_SUBJECTS_MAX;

    return NextResponse.json(
      {
        planName: parsed.planName,
        examDate:
          typeof parsed.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.examDate)
            ? parsed.examDate
            : null,
        subjects: previewSubjects,
        suggestedWeeklyGoalHours: Math.max(5, Math.min(40, parsed.suggestedWeeklyGoalHours || 15)),
        totalSubjectsFound,
        isPreviewTruncated,
        hiddenSubjectsCount: isPreviewTruncated ? totalSubjectsFound - PREVIEW_SUBJECTS_MAX : 0,
      },
      { headers: rateLimitHeaders }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout') || msg.includes('DEADLINE')) {
      return NextResponse.json(
        { error: 'O PDF é muito grande ou complexo. Tente um edital menor.' },
        { status: 408 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao processar o edital. Verifique se o arquivo é um PDF válido.' },
      { status: 500 }
    );
  }
}
