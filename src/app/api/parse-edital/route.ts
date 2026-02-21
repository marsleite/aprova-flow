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
import { GoogleGenAI } from '@google/genai';
import { enforceRateLimit, requireAuthenticatedUser } from '@/lib/server/apiGuard';

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

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

    // Chama Gemini com o PDF inline
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              text: 'Analise este edital de concurso público e extraia as matérias cobradas conforme as instruções.',
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const raw = response.text?.trim() || '';

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

    // Tenta parsear JSON da resposta com múltiplas estratégias
    let parsed: ParseEditalResponse;
    try {
      // Estratégia 1: Remove backticks markdown e whitespace
      let cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Estratégia 2: Encontra o primeiro '{' e o último '}' para extrair o JSON
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }

      parsed = JSON.parse(cleaned);
    } catch {
      // Estratégia 3: Regex mais específica como fallback
      try {
        const jsonMatch = raw.match(
          /\{\s*"planName"[\s\S]*?"subjects"\s*:\s*\[[\s\S]*?\]\s*[,}][\s\S]*?\}/
        );
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Nenhum JSON encontrado');
        }
      } catch {
        console.error(
          'Resposta do Gemini não é JSON válido:',
          raw.slice(0, 1000)
        );
        return NextResponse.json(
          {
            error:
              'Não foi possível interpretar o edital. Tente novamente.',
          },
          { status: 422 }
        );
      }
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

    return NextResponse.json(parsed);
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
