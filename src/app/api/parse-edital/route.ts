/**
 * API Route — Parse Edital PDF via Gemini
 *
 * Recebe um PDF de edital de concurso em base64,
 * envia ao Gemini 2.5 Flash para extrair:
 * - Nome do concurso
 * - Matérias/disciplinas cobradas com pesos estimados
 * - Sugestão de meta semanal
 *
 * A API key fica exclusivamente no server — nunca exposta ao browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { logAiUsageEvent, parseJsonFromModelText, runAiPdf } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';

// ============================================================
// Tipos
// ============================================================

interface ParseEditalRequest {
  pdfBase64: string;
  fileName?: string;
}

interface ParsedSubject {
  subject: string;
  weight: number;
}

interface ParseEditalResponse {
  planName: string;
  subjects: ParsedSubject[];
  suggestedWeeklyGoalHours: number;
  totalSubjectsFound: number;
}

// ============================================================
// Prompt
// ============================================================

const SYSTEM_PROMPT = `Você é um especialista em editais de concursos públicos brasileiros.

Sua tarefa é analisar o PDF de um edital e extrair TODAS as matérias/disciplinas cobradas na prova.

REGRAS ABSOLUTAS:
1. Extraia APENAS matérias que estão EXPLICITAMENTE mencionadas no edital
2. NÃO invente matérias que não existem no documento
3. Estime o peso de cada matéria proporcionalmente ao número de tópicos/itens listados
4. Os pesos DEVEM somar exatamente 100
5. Sugira uma meta semanal realista em horas (entre 8 e 30h) baseada no volume de conteúdo
6. Extraia o nome oficial do concurso/órgão do edital
7. Se o PDF não contiver um edital de concurso ou não tiver matérias identificáveis, retorne subjects vazio

RESPONDA EXCLUSIVAMENTE em JSON válido, sem markdown, sem código, sem explicação.
Use exatamente este schema:

{
  "planName": "Nome do Concurso/Órgão + Ano",
  "subjects": [
    { "subject": "Nome da Matéria", "weight": 20 }
  ],
  "suggestedWeeklyGoalHours": 15,
  "totalSubjectsFound": 8
}

DICAS para estimar pesos:
- Se o edital lista 10 tópicos para Direito Constitucional e 5 para Informática, Constitucional tem peso ~2x maior
- Matérias de "conhecimentos básicos" geralmente têm peso menor que as de "conhecimentos específicos"
- Arredonde os pesos para números inteiros
- Se todas parecem ter peso igual, distribua igualmente

REGRAS DE NOMEAÇÃO:
- Use nomes CURTOS para as matérias (ex: "Direito Civil", "Direito Penal", "Português")
- NÃO inclua o conteúdo programático dentro do nome da matéria
- Se o edital tem "Noções Gerais de Direito e Formação Humanística" com sub-áreas, liste cada sub-área importante separadamente (ex: "Ética e Magistratura", "Direitos Humanos", "Direito Digital")
- Agrupe sub-áreas muito pequenas (ex: "Sociologia do Direito", "Psicologia Judiciária", "Filosofia do Direito" podem virar "Formação Humanística")`;

// ============================================================
// Handler
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ('response' in auth) return auth.response;

    const limited = enforceRateLimit({
      key: auth.key,
      bucket: 'api-parse-edital',
      max: 5,
      windowMs: 10 * 60_000,
    });
    if (limited) return limited;

    const body: ParseEditalRequest = await req.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return NextResponse.json(
        { error: 'PDF não fornecido.' },
        { status: 400 }
      );
    }

    // Valida tamanho (base64 é ~33% maior que o original, 10MB original = ~13.3MB base64)
    const sizeBytes = (pdfBase64.length * 3) / 4;
    const maxSizeMB = 10;
    if (sizeBytes > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `PDF excede o limite de ${maxSizeMB}MB.` },
        { status: 400 }
      );
    }

    const aiResponse = await runAiPdf({
      task: 'parse-edital',
      pdfBase64,
      prompt: 'Analise este edital de concurso público e extraia as matérias cobradas conforme as instruções.',
      temperature: 0.2,
      maxOutputTokens: 8192,
      systemInstruction: SYSTEM_PROMPT,
    });

    const raw = aiResponse.text?.trim() || '';

    console.log(
      `[parse-edital] Gemini retornou ${raw.length} caracteres para PDF "${pdfBase64.length > 100 ? '...' : ''}"`
    );

    if (!raw) {
      console.error('Gemini retornou resposta vazia para o PDF');
      return NextResponse.json(
        { error: 'O Gemini não conseguiu ler o PDF. Verifique se é um edital válido.' },
        { status: 422 }
      );
    }

    const parsed = parseJsonFromModelText<ParseEditalResponse>(raw);
    if (!parsed) {
      console.error(
        'Resposta do modelo não é JSON válido:',
        raw.slice(0, 1000)
      );
      const usageEvent = {
        route: '/api/parse-edital',
        task: 'parse-edital',
        provider: aiResponse.provider,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        estimatedCostUsd: aiResponse.usage.estimatedCostUsd,
        success: false,
        statusCode: 422,
        userId: auth.uid,
        errorCode: 'JSON_PARSE_FAILED',
      } as const;
      logAiUsageEvent(usageEvent);
      void saveAiUsageEvent(usageEvent, auth.idToken);
      return NextResponse.json(
        {
          error:
            'Não foi possível interpretar o edital. Tente novamente.',
        },
        { status: 422 }
      );
    }

    // Valida a resposta
    if (!parsed.subjects || !Array.isArray(parsed.subjects)) {
      return NextResponse.json(
        { error: 'Nenhuma matéria encontrada no edital.' },
        { status: 422 }
      );
    }

    // Garante que os pesos somam 100
    const sanitizedSubjects = parsed.subjects.map((s) => ({
      ...s,
      weight: Number.isFinite(s.weight) ? Math.max(0, s.weight) : 0,
    }));
    const totalWeight = sanitizedSubjects.reduce((acc, s) => acc + s.weight, 0);

    if (sanitizedSubjects.length > 0) {
      if (totalWeight > 0 && totalWeight !== 100) {
        // Ajusta proporcionalmente
        const factor = 100 / totalWeight;
        const adjusted = sanitizedSubjects.map((s) => ({
          ...s,
          weight: Math.round(s.weight * factor),
        }));

        // Corrige arredondamento
        const adjustedTotal = adjusted.reduce((acc, s) => acc + s.weight, 0);
        if (adjustedTotal !== 100) {
          adjusted[0].weight += 100 - adjustedTotal;
        }
        parsed.subjects = adjusted;
      } else if (totalWeight <= 0) {
        // Fallback: distribuição igualitária quando a IA não retornou pesos válidos
        const base = Math.floor(100 / sanitizedSubjects.length);
        const remainder = 100 - base * sanitizedSubjects.length;
        parsed.subjects = sanitizedSubjects.map((s, index) => ({
          ...s,
          weight: base + (index === 0 ? remainder : 0),
        }));
      } else {
        parsed.subjects = sanitizedSubjects;
      }
    }

    // Garante meta dentro de faixa razoável
    parsed.suggestedWeeklyGoalHours = Math.max(
      5,
      Math.min(40, parsed.suggestedWeeklyGoalHours || 15)
    );
    parsed.totalSubjectsFound = parsed.subjects.length;

    const usageEvent = {
      route: '/api/parse-edital',
      task: 'parse-edital',
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
      totalTokens: aiResponse.usage.totalTokens,
      estimatedCostUsd: aiResponse.usage.estimatedCostUsd,
      success: true,
      statusCode: 200,
      userId: auth.uid,
    } as const;
    logAiUsageEvent(usageEvent);
    void saveAiUsageEvent(usageEvent, auth.idToken);

    return NextResponse.json(parsed, {
      headers: {
        'x-ai-provider': aiResponse.provider,
        'x-ai-model': aiResponse.model,
        'x-ai-latency-ms': String(aiResponse.latencyMs),
        'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
      },
    });
  } catch (err) {
    console.error('Erro ao processar edital:', err);

    // Extrai mensagem útil do erro
    const errMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = errMsg.includes('timeout') || errMsg.includes('DEADLINE');
    const isQuota = errMsg.includes('quota') || errMsg.includes('429');

    if (isTimeout) {
      return NextResponse.json(
        { error: 'O PDF é muito grande ou complexo. Tente um edital menor.' },
        { status: 408 }
      );
    }
    if (isQuota) {
      return NextResponse.json(
        { error: 'Limite da API Gemini atingido. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao processar o edital. Verifique se o arquivo é um PDF válido.' },
      { status: 500 }
    );
  }
}
