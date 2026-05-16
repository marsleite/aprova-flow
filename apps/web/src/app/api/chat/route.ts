/**
 * API Route — Chat Coach IA (Conversacional)
 *
 * Recebe histórico de mensagens + contexto de estudo.
 * O Gemini mantém a conversa com o "system prompt" grounded
 * nos dados reais do usuário a cada turno.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { runDedicatedAiText } from '@/lib/server/dedicatedAi';
import { LegacyEngineDataSource } from '@/infrastructure/legacy/LegacyEngineDataSource';
import { GetPlanEngineSnapshot } from '@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot';
import { FeatureCode } from '@aprovamind/domain';
import { requireEntitlementFeature } from '@/lib/server/userEntitlements';
import { resolveAiFailureState } from '@aprovamind/application/use-cases/ai/ResolveAiCapabilityState';

// ============================================================
// Tipos
// ============================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
  weeklyBreakdown: { day: string; hours: number; isToday: boolean }[];
  recentSessions: { subject: string; duration: number; date: string; startTime: string }[];
  activePlanName?: string | null;
}

interface ChatRequest {
  messages: ChatMessage[];
  context: StudyContext;
  activePlanName?: string | null;
}

// ============================================================
// System prompt — grounded, anti-alucinação
// ============================================================

function buildSystemPrompt(ctx: StudyContext, engineAnalysis: string = ''): string {
  const subjectSummary = ctx.subjectHours.length > 0
    ? ctx.subjectHours
      .map((s) => `  - ${s.subject}: ${s.hours}h`)
      .join('\n')
    : '  Nenhuma matéria registrada ainda.';

  const planSummary = ctx.planVsActual.length > 0
    ? ctx.planVsActual
      .map((p) => `  - ${p.subject}: planejado ${p.plannedPercent}%, real ${p.actualPercent}% [${p.status}]`)
      .join('\n')
    : '  Sem plano configurado.';

  return `Você é o Coach de Estudos do AprovaMind, assistente pessoal para concurseiros brasileiros.

PERSONALIDADE:
- Motivador, direto e prático. Fala como um mentor experiente.
- Usa linguagem informal mas respeitosa. Pode usar emojis com moderação.
- Respostas curtas (2-4 frases por tópico). Não dê aulas — dê DIREÇÃO.

REGRAS ABSOLUTAS:
- Base suas respostas EXCLUSIVAMENTE nos dados do estudante abaixo.
- NÃO invente dados, matérias ou estatísticas que não existam no contexto.
- NÃO cite leis, artigos ou conteúdo jurídico — você é coach de ROTINA, não professor.
- Se o estudante perguntar algo fora do escopo de rotina de estudos, redirecione gentilmente.
- Responda sempre em português brasileiro.

DADOS DO ESTUDANTE "${ctx.userName}":
${ctx.activePlanName ? `- EDITAL EM FOCO: ${ctx.activePlanName}` : '- Visão GERAL (todos os editais)'}
- Streak: ${ctx.currentStreak} dias (melhor: ${ctx.bestStreak})
- Meta semanal: ${ctx.weeklyGoalHours}h | Estudado: ${ctx.weeklyTotalHours.toFixed(1)}h (${ctx.weeklyProgressPercent}%)
- Dias estudados esta semana: ${ctx.daysStudiedThisWeek}/7
- Hoje: ${ctx.todayTotalMinutes} min${ctx.todayDominantSubject ? ` (foco: ${ctx.todayDominantSubject})` : ''}

${engineAnalysis}

HORAS POR MATÉRIA (mês):
${subjectSummary}

PLANO VS REAL:
${planSummary}

EVOLUÇÃO SEMANAL (Seg a Dom):
${ctx.weeklyBreakdown?.length > 0
      ? ctx.weeklyBreakdown
        .map((d) => `  - ${d.day}: ${d.hours > 0 ? d.hours + 'h' : 'não estudou'}${d.isToday ? ' (HOJE)' : ''}`)
        .join('\n')
      : '  Sem dados da semana.'}

ÚLTIMAS SESSÕES:
${ctx.recentSessions?.length > 0
      ? ctx.recentSessions
        .map((s) => `  - ${s.date} | ${s.subject} | ${Math.round(s.duration / 60)} min`)
        .join('\n')
      : '  Nenhuma sessão recente.'}

CAPACIDADES:
- Montar planos de estudo diários/semanais baseados nos dados
- Sugerir qual matéria estudar e por quanto tempo
- Motivar baseado no streak e progresso real
- Analisar equilíbrio entre matérias
- Ajudar a definir metas realistas
- Analisar a evolução dia a dia da semana (quais dias foram fortes/fracos)
- Comparar sessões recentes para identificar padrões (horários, matérias repetidas, duração média)`;
}

// ============================================================
// Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;

    const entitlement = await requireEntitlementFeature({
      identity: {
        uid: auth.uid,
        email: auth.email,
        idToken: auth.idToken,
      },
      featureCode: FeatureCode.ContextualAiChat,
    });
    if (!entitlement.allowed) return entitlement.response;

    const quota = await enforceAiTaskQuota({
      uid: auth.uid,
      email: auth.email,
      idToken: auth.idToken,
      task: 'chat',
    });
    if (!quota.allowed) return quota.response;

    const { messages, context } = (await request.json()) as ChatRequest;

    if (!context?.userName || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    if (messages.length > 20) {
      return NextResponse.json({ error: 'Histórico excede o limite permitido.' }, { status: 400 });
    }

    const hasInvalidMessage = messages.some(
      (msg) =>
        !msg ||
        (msg.role !== 'user' && msg.role !== 'assistant') ||
        typeof msg.content !== 'string' ||
        msg.content.trim().length === 0 ||
        msg.content.length > 2000
    );
    if (hasInvalidMessage) {
      return NextResponse.json({ error: 'Mensagens inválidas.' }, { status: 400 });
    }

    let engineContext = '';
    try {
      const useCase = new GetPlanEngineSnapshot(new LegacyEngineDataSource(auth.idToken));
      const todayISO = new Date().toISOString().slice(0, 10);
      const engineResult = await useCase.execute({
        userId: auth.uid,
        today: todayISO,
        planId: null,
      });

      if (engineResult.found) {
        engineContext = `
[DIRETRIZES DO MOTOR DE DECISÃO DETERMINÍSTICO]
Estas são as recomendações formais que o sistema gerou para o usuário. Use-as como base para guiar suas respostas quando o aluno pedir o que estudar em seguida:
${engineResult.snapshot.recommendations.map(r => `- Recomendação top: Focar em ${r.targetSubject} (Tipo: ${r.type}, Urgência: ${r.urgency}). Motivo: ${r.reasons.join(', ')}`).join('\n')}

- Status Críticos/Atenção identificados:
${engineResult.snapshot.subjects.filter(s => ['critical', 'neglected', 'warning'].includes(s.status)).map(s => `  ${s.subject}: ${s.status}`).join('\n')}
`;
      }
    } catch (e) {
      console.warn('Motor indisponível para o chat', e);
    }

    // Monta system prompt como instrução nativa do Gemini (não embutido no prompt)
    const systemPrompt = buildSystemPrompt(context, engineContext);

    // Constrói o prompt com histórico formatado de forma limpa
    // O system prompt vai separado via systemInstruction (mais eficaz no Gemini)
    const historyParts: string[] = [];
    for (const msg of messages.slice(0, -1)) {
      if (msg.role === 'user') {
        historyParts.push(`Estudante: ${msg.content}`);
      } else {
        historyParts.push(`Coach: ${msg.content}`);
      }
    }

    // Última mensagem do usuário é o prompt principal
    const lastMessage = messages[messages.length - 1];
    const prompt = historyParts.length > 0
      ? `${historyParts.join('\n\n')}\n\nEstudante: ${lastMessage.content}`
      : lastMessage.content;

    const aiResponse = await runDedicatedAiText({
      idToken: auth.idToken,
      payload: {
        task: 'chat',
        prompt,
        systemInstruction: systemPrompt,
        temperature: 0.5,
        maxOutputTokens: 420,
        userId: auth.uid,
        route: '/api/chat',
        budgetTier: quota.planTier,
        allowFallback: false,
      },
    });

    if (aiResponse.budgetBlocked) {
      return NextResponse.json(
        {
          error: aiResponse.userMessage || 'Limite de orçamento de IA atingido para este recurso.',
          status: aiResponse.status || 'blocked_by_budget',
          budgetBlocked: true,
          task: 'chat',
          errorCode: aiResponse.errorCode,
        },
        {
          status: 429,
          headers: {
            ...quota.headers,
            'x-ai-provider': aiResponse.provider,
            'x-ai-model': aiResponse.model,
            'x-ai-latency-ms': String(aiResponse.latencyMs),
            'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
          },
        }
      );
    }

    const text = aiResponse.text?.trim() || 'Desculpe, não consegui gerar uma resposta. Tente novamente.';

    // Limpa prefixos se o modelo repetir ("Coach:", "Estudante:", etc.)
    const cleaned = text
      .replace(/^(Coach|Estudante|Assistant|User):\s*/i, '')
      .trim();

    return NextResponse.json(
      {
        reply: cleaned,
        status: aiResponse.status || 'success',
        fallbackUsed: Boolean(aiResponse.fallbackUsed),
        budgetBlocked: Boolean(aiResponse.budgetBlocked),
      },
      {
        headers: {
          ...quota.headers,
          'x-ai-provider': aiResponse.provider,
          'x-ai-model': aiResponse.model,
          'x-ai-latency-ms': String(aiResponse.latencyMs),
          'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Erro no chat:', error);
    const failure = resolveAiFailureState({
      capability: 'chat',
      error,
    });
    return NextResponse.json(
      {
        error: failure.message,
        aiCapability: failure,
      },
      { status: 500 }
    );
  }
}
