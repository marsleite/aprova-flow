/**
 * API Route — Mentoria Semanal AprovaMind
 *
 * Análise profunda gerada 1x por semana, salva no Firestore pelo client.
 * Recebe dados completos da semana e retorna:
 * - Diagnóstico semanal
 * - Pontos fortes e melhorias
 * - Plano de recuperação
 * - Metas sugeridas para próxima semana
 *
 * A GEMINI_API_KEY fica exclusivamente no server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// Tipos
// ============================================================

interface WeeklyMentoringRequest {
  userName: string;
  activePlanName?: string | null;
  currentStreak: number;
  bestStreak: number;
  weeklyGoalHours: number;
  weeklyTotalHours: number;
  weeklyProgressPercent: number;
  daysStudiedThisWeek: number;
  subjectHours: { subject: string; hours: number }[];
  planVsActual: {
    subject: string;
    plannedPercent: number;
    actualPercent: number;
    status: string;
  }[];
  weeklyBreakdown: { day: string; hours: number; isToday: boolean }[];
  recentSessions: {
    subject: string;
    duration: number;
    date: string;
  }[];
  accuracyBySubject?: {
    subject: string;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    sessions: number;
  }[];
}

// ============================================================
// System Prompt
// ============================================================

function buildPrompt(ctx: WeeklyMentoringRequest): string {
  const subjectSummary =
    ctx.subjectHours.length > 0
      ? ctx.subjectHours.map((s) => `  - ${s.subject}: ${s.hours}h`).join('\n')
      : '  Nenhuma matéria registrada.';

  const planSummary =
    ctx.planVsActual.length > 0
      ? ctx.planVsActual
          .map((p) => `  - ${p.subject}: planejado ${p.plannedPercent}%, real ${p.actualPercent}% [${p.status}]`)
          .join('\n')
      : '  Sem plano configurado.';

  const weeklySummary =
    ctx.weeklyBreakdown?.length > 0
      ? ctx.weeklyBreakdown
          .map((d) => `  - ${d.day}: ${d.hours > 0 ? d.hours + 'h' : 'não estudou'}`)
          .join('\n')
      : '  Sem dados da semana.';

  const accuracySummary =
    ctx.accuracyBySubject && ctx.accuracyBySubject.length > 0
      ? ctx.accuracyBySubject
          .map((a) => `  - ${a.subject}: ${a.accuracy}% (${a.correctAnswers}/${a.totalQuestions} em ${a.sessions} sessões)`)
          .join('\n')
      : '  Nenhuma questão registrada.';

  return `PERSONA:
Você é o "Mentor AprovaMind", especialista em aprovação em concursos públicos de alto nível.
Esta é a MENTORIA SEMANAL — uma análise profunda e estratégica entregue 1x por semana.

TOM DE VOZ:
- Estratégico, analítico e motivador.
- Fale como um mentor que já aprovou centenas de alunos.
- Use dados concretos do estudante para embasar cada recomendação.

REGRAS ABSOLUTAS:
- Responda EXCLUSIVAMENTE com base nos dados fornecidos. NÃO invente dados.
- NÃO cite leis, artigos ou conteúdo jurídico — você é MENTOR DE ESTRATÉGIA.
- NÃO faça perguntas — entregue respostas diretas e acionáveis.
- Responda em português brasileiro.

ANÁLISES OBRIGATÓRIAS:
1. DIAGNÓSTICO DA SEMANA: Avalie o volume total, a distribuição entre matérias, e se o estudante está no ritmo certo para a aprovação.
2. PONTOS FORTES: O que o estudante fez bem esta semana (matérias em dia, constância, evolução).
3. PONTOS DE MELHORIA: Matérias negligenciadas, queda de ritmo, falta de questões.
4. CRUZAMENTO CONSTÂNCIA × PRECISÃO: Se há dados de questões, identifique matérias onde o esforço não se converte em acerto.
5. PLANO DE RECUPERAÇÃO: Redistribuição concreta de horas para a próxima semana.
6. METAS PARA PRÓXIMA SEMANA: 3-5 metas específicas e mensuráveis.

DADOS DO ESTUDANTE "${ctx.userName}":
${ctx.activePlanName ? `- EDITAL EM FOCO: ${ctx.activePlanName}` : '- Visão GERAL'}
- Streak atual: ${ctx.currentStreak} dias | Melhor: ${ctx.bestStreak} dias
- Meta semanal: ${ctx.weeklyGoalHours}h | Estudado: ${ctx.weeklyTotalHours.toFixed(1)}h (${ctx.weeklyProgressPercent}%)
- Dias estudados: ${ctx.daysStudiedThisWeek}/7

HORAS POR MATÉRIA (semana):
${subjectSummary}

PLANO VS REAL:
${planSummary}

EVOLUÇÃO DIÁRIA (Seg a Dom):
${weeklySummary}

TAXA DE ACERTO EM QUESTÕES:
${accuracySummary}

Responda EXATAMENTE neste formato JSON (sem markdown, sem \`\`\`):
{
  "weekDiagnosis": "Diagnóstico geral da semana em 3-5 frases. Seja direto e baseado nos dados.",
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "improvements": ["Ponto de melhoria 1", "Ponto de melhoria 2"],
  "recoveryPlan": "Plano de redistribuição de horas concreto para a próxima semana. Inclua matérias específicas e tempos sugeridos.",
  "suggestedGoals": ["Meta 1 específica e mensurável", "Meta 2", "Meta 3"],
  "motivationalClose": "Frase de fechamento motivacional e energética. Máximo 2 frases."
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
        { error: 'GEMINI_API_KEY não configurada.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as WeeklyMentoringRequest;

    if (!body.userName) {
      return NextResponse.json(
        { error: 'Dados inválidos — userName obrigatório.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildPrompt(body),
      config: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });

    const text = response.text?.trim() || '';

    // Parse JSON com múltiplas estratégias
    let parsed;
    try {
      let cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }

      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[weekly-mentoring] JSON inválido:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Não foi possível gerar a mentoria. Tente novamente.' },
        { status: 422 }
      );
    }

    // Validação e defaults
    const result = {
      weekDiagnosis: typeof parsed.weekDiagnosis === 'string' ? parsed.weekDiagnosis : 'Análise indisponível.',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      recoveryPlan: typeof parsed.recoveryPlan === 'string' ? parsed.recoveryPlan : '',
      suggestedGoals: Array.isArray(parsed.suggestedGoals) ? parsed.suggestedGoals : [],
      motivationalClose: typeof parsed.motivationalClose === 'string' ? parsed.motivationalClose : 'Continue firme. A vaga é sua.',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[weekly-mentoring] Erro:', error);

    const errMsg = error instanceof Error ? error.message : String(error);
    const isQuota = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');

    if (isQuota) {
      return NextResponse.json(
        { error: 'Limite da API atingido. Tente novamente mais tarde.', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao gerar mentoria semanal. Tente novamente.' },
      { status: 500 }
    );
  }
}
