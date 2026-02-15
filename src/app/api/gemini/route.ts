/**
 * API Route — Gemini AI Coach
 *
 * Recebe o contexto de estudo do usuário, monta um prompt grounded
 * (baseado APENAS nos dados reais), e retorna motivação + sugestão.
 *
 * A API key fica exclusivamente no server — nunca exposta ao browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// Tipos
// ============================================================

interface StudyContext {
  userName: string;
  currentStreak: number;
  bestStreak: number;
  weeklyGoalHours: number;
  weeklyTotalHours: number;
  weeklyProgressPercent: number;
  daysStudiedThisWeek: number;
  subjectHours: { subject: string; hours: number }[];
  planVsActual: { subject: string; plannedPercent: number; actualPercent: number; status: string }[];
  todayTotalMinutes: number;
  todayDominantSubject: string | null;
}

interface GeminiResponse {
  motivation: string;
  suggestion: string;
  focusSubject: string;
  encouragement: string;
}

// ============================================================
// Prompt engenharia — grounded, anti-alucinação
// ============================================================

function buildPrompt(ctx: StudyContext): string {
  const subjectSummary = ctx.subjectHours.length > 0
    ? ctx.subjectHours
        .map((s) => `  - ${s.subject}: ${s.hours}h`)
        .join('\n')
    : '  Nenhuma matéria registrada ainda.';

  const planSummary = ctx.planVsActual.length > 0
    ? ctx.planVsActual
        .map((p) => `  - ${p.subject}: planejado ${p.plannedPercent}%, real ${p.actualPercent}% [${p.status}]`)
        .join('\n')
    : '  Nenhum plano de estudo configurado.';

  return `Você é o coach de estudos do AprovaFlow, uma plataforma para concurseiros brasileiros.

REGRAS ABSOLUTAS:
- Responda EXCLUSIVAMENTE com base nos dados fornecidos abaixo.
- NÃO invente dados, matérias ou números que não existam no contexto.
- NÃO cite leis, artigos ou conteúdo jurídico — você é coach de ROTINA, não professor.
- Responda em português brasileiro, tom motivacional mas direto.
- Limite: 2-3 frases por campo.

DADOS DO ESTUDANTE:
- Nome: ${ctx.userName}
- Streak atual: ${ctx.currentStreak} dias | Melhor: ${ctx.bestStreak} dias
- Meta semanal: ${ctx.weeklyGoalHours}h | Estudado: ${ctx.weeklyTotalHours.toFixed(1)}h (${ctx.weeklyProgressPercent}%)
- Dias estudados esta semana: ${ctx.daysStudiedThisWeek}/7
- Hoje: ${ctx.todayTotalMinutes} minutos${ctx.todayDominantSubject ? ` (foco: ${ctx.todayDominantSubject})` : ''}

HORAS POR MATÉRIA (mês):
${subjectSummary}

PLANO VS REAL:
${planSummary}

Responda EXATAMENTE neste formato JSON (sem markdown, sem \`\`\`):
{
  "motivation": "Parágrafo motivacional personalizado baseado nos dados acima",
  "suggestion": "Sugestão específica e acionável de qual matéria estudar hoje e por quê, baseada nos dados",
  "focusSubject": "Nome exato da matéria sugerida (deve existir nos dados acima, ou string vazia se não houver dados)",
  "encouragement": "Frase curta de encorajamento sobre o streak ou progresso da meta"
}`;
}

// ============================================================
// Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no .env.local' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as StudyContext;

    // Validação básica
    if (!body.userName) {
      return NextResponse.json(
        { error: 'Contexto de estudo inválido' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildPrompt(body),
      config: {
        temperature: 0.3,       // Baixa — respostas conservadoras
        maxOutputTokens: 1024,  // Suficiente para JSON completo
      },
    });

    const text = response.text?.trim() || '';

    // Tenta parsear JSON da resposta com múltiplas estratégias
    let parsed: GeminiResponse;
    try {
      // Estratégia 1: Remove backticks markdown
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Estratégia 2: Extrai JSON de qualquer posição no texto
      const jsonMatch = cleaned.match(/\{[\s\S]*"motivation"[\s\S]*"suggestion"[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      parsed = JSON.parse(cleaned);

      // Valida que os campos existem e são strings
      if (typeof parsed.motivation !== 'string') parsed.motivation = '';
      if (typeof parsed.suggestion !== 'string') parsed.suggestion = '';
      if (typeof parsed.focusSubject !== 'string') parsed.focusSubject = '';
      if (typeof parsed.encouragement !== 'string') parsed.encouragement = '';
    } catch {
      // Fallback: extrai texto limpo ignorando chaves JSON
      const cleanText = text
        .replace(/[{}"]/g, '')
        .replace(/motivation:|suggestion:|focusSubject:|encouragement:/g, '')
        .replace(/,\s*/g, ' ')
        .trim();

      parsed = {
        motivation: cleanText.slice(0, 300) || 'Continue com dedicação!',
        suggestion: 'Mantenha a consistência nos estudos.',
        focusSubject: '',
        encouragement: 'Cada minuto conta!',
      };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Erro na API Gemini:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar IA. Tente novamente.' },
      { status: 500 }
    );
  }
}
