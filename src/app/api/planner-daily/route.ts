import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { logAiUsageEvent, parseJsonFromModelText, runAiText } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';
import { saveDailyAiPlanSnapshot } from '@/lib/server/dailyAiPlanStore';
import { LegacyEngineDataSource } from '@/infrastructure/legacy/LegacyEngineDataSource';
import { GetPlanEngineSnapshot } from '@/application/use-cases/engine/GetPlanEngineSnapshot';

interface PlannerDailyRequest {
  userName: string;
  activePlanName?: string | null;
  dateISO?: string;
  replanMode?: 'manual' | 'session_saved' | 'recovery';
  weeklyGoalHours: number;
  weeklyTotalHours: number;
  weeklyProgressPercent: number;
  currentStreak: number;
  daysStudiedThisWeek: number;
  availableMinutesToday?: number;
  todayTotalMinutes: number;
  subjectHours: { subject: string; hours: number }[];
  planVsActual: { subject: string; plannedPercent: number; actualPercent: number; status: string }[];
  accuracyBySubject?: { subject: string; accuracy: number; totalQuestions: number }[];
  gapInsights?: {
    materia: string;
    subtema?: string;
    description: string;
    severity: number;
    dimension: string;
  }[];
  executionContext?: {
    completedBlockIndexes?: number[];
    deferredBlockIndexes?: number[];
    currentBlocks?: {
      subject: string;
      durationMinutes: number;
      objective: string;
      taskType: 'teoria' | 'questoes' | 'revisao' | 'simulado';
      priority: 'alta' | 'media' | 'baixa';
    }[];
  };
}

interface DailyPlanBlock {
  subject: string;
  durationMinutes: number;
  objective: string;
  taskType: 'teoria' | 'questoes' | 'revisao' | 'simulado';
  priority: 'alta' | 'media' | 'baixa';
}

interface PlannerDailyResponse {
  dateISO: string;
  rationale: string;
  blocks: DailyPlanBlock[];
  contingencies: string[];
  estimatedTotalMinutes: number;
}

function buildFallbackPlan(ctx: PlannerDailyRequest, dateISO: string): PlannerDailyResponse {
  const available = Math.max(60, Math.min(360, ctx.availableMinutesToday ?? 180));
  const completedIndexes = new Set(ctx.executionContext?.completedBlockIndexes || []);
  const deferredIndexes = new Set(ctx.executionContext?.deferredBlockIndexes || []);
  const deferredSubjects = (ctx.executionContext?.currentBlocks || [])
    .map((block, idx) => ({ block, idx }))
    .filter(({ idx }) => deferredIndexes.has(idx) && !completedIndexes.has(idx))
    .map(({ block }) => block.subject);

  const neglectedSubjects = [...ctx.planVsActual]
    .filter((p) => p.status === 'neglected')
    .sort((a, b) => (a.actualPercent - a.plannedPercent) - (b.actualPercent - b.plannedPercent))
    .map((p) => p.subject);

  const lowAccuracySubjects = [...(ctx.accuracyBySubject || [])]
    .filter((a) => a.totalQuestions >= 5 && a.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((a) => a.subject);

  const topHoursSubjects = [...ctx.subjectHours]
    .sort((a, b) => b.hours - a.hours)
    .map((s) => s.subject);

  const candidates = [...new Set([...deferredSubjects, ...neglectedSubjects, ...lowAccuracySubjects, ...topHoursSubjects])];
  const selected = (candidates.length > 0 ? candidates : ['Matéria prioritária']).slice(0, 3);

  const base = Math.floor(available / selected.length);
  const blocks: DailyPlanBlock[] = selected.map((subject, idx) => ({
    subject,
    durationMinutes: Math.max(30, Math.min(120, idx === 0 ? base + (available - base * selected.length) : base)),
    objective:
      idx === 0
        ? 'Avançar no tópico principal e consolidar pontos críticos.'
        : 'Resolver questões e revisar erros mais recorrentes.',
    taskType: idx === 0 ? 'teoria' : 'questoes',
    priority: idx === 0 ? 'alta' : idx === 1 ? 'media' : 'baixa',
  }));

  const estimatedTotalMinutes = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  return {
    dateISO,
    rationale:
      'Plano gerado em modo resiliente: prioriza matéria negligenciada e treino por questões para manter ritmo hoje.',
    blocks,
    contingencies: [
      'Se faltar tempo, execute apenas o primeiro bloco e 10 questões do segundo.',
      'Se sobrar tempo, faça revisão ativa de erros do último simulado.',
    ],
    estimatedTotalMinutes,
  };
}

function buildPlannerPrompt(ctx: PlannerDailyRequest, engineAnalysis: string = ''): string {
  const subjectSummary =
    ctx.subjectHours.length > 0
      ? ctx.subjectHours.map((s) => `  - ${s.subject}: ${s.hours}h`).join('\n')
      : '  Sem dados de horas por matéria.';

  const planSummary =
    ctx.planVsActual.length > 0
      ? ctx.planVsActual
        .map((p) => `  - ${p.subject}: planejado ${p.plannedPercent}% | real ${p.actualPercent}% [${p.status}]`)
        .join('\n')
      : '  Sem plano vs real disponível.';

  const accuracySummary =
    ctx.accuracyBySubject && ctx.accuracyBySubject.length > 0
      ? ctx.accuracyBySubject
        .map((a) => `  - ${a.subject}: ${a.accuracy}% (${a.totalQuestions} questões)`)
        .join('\n')
      : '  Sem dados de questões.';

  const gapSummary =
    ctx.gapInsights && ctx.gapInsights.length > 0
      ? ctx.gapInsights
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 4)
        .map((g) => `  - [SEV ${g.severity}/10] ${g.materia} (${g.subtema || 'Geral'}): ${g.description}`)
        .join('\n')
      : '  Sem gaps críticos identificados.';

  const dateISO = ctx.dateISO || new Date().toISOString().slice(0, 10);
  const available = Math.max(30, Math.min(720, ctx.availableMinutesToday ?? 180));
  const hasExecutionContext =
    Array.isArray(ctx.executionContext?.currentBlocks) && ctx.executionContext.currentBlocks.length > 0;
  const completedIndexes = new Set(ctx.executionContext?.completedBlockIndexes || []);
  const deferredIndexes = new Set(ctx.executionContext?.deferredBlockIndexes || []);
  const executionSummary = hasExecutionContext
    ? ctx.executionContext!.currentBlocks!
      .map((block, idx) => {
        const status = completedIndexes.has(idx)
          ? 'concluído'
          : deferredIndexes.has(idx)
            ? 'adiado'
            : 'pendente';
        return `  - [${idx + 1}] ${block.subject} (${block.durationMinutes} min, ${block.taskType}, prioridade ${block.priority}) -> ${status}`;
      })
      .join('\n')
    : '  Sem execução anterior para hoje.';
  const replanMode = ctx.replanMode || 'manual';

  return `Você é o planejador estratégico do AprovaMind.

OBJETIVO:
Gerar um plano diário de estudo altamente executável para HOJE, baseado estritamente nos dados do aluno.

REGRAS GERAIS:
- Responda APENAS em JSON válido. Sem formatação markdown de código ao redor ou delimitadores (retorne cru).
- Não invente matérias fora do contexto fornecido (Plano vs Real).
- Priorize matérias negligenciadas, de menor acurácia, e principalmente os GAPS DIAGNÓSTICADOS de alta severidade.
- Entregue entre 3 e 6 blocos. Cada bloco deve ter duração entre 20 e 120 minutos.
- A soma dos blocos deve ficar próxima de ${available} minutos (variação máxima de 20%).
- Idioma: português brasileiro.

REGRAS DE REPLANEJAMENTO E RECUPERAÇÃO:
- Se replanMode = "session_saved": assuma que o aluno acabou de terminar uma sessão. Evite blocos já concluídos. Tente recolocar blocos pendentes/adiados de forma realista.
- Se replanMode = "recovery": o aluno perdeu dias de estudo ou está com frequência baixa. Gere um "Plano de Resgate". Corte gordura e conteúdos excessivamente teóricos. Foque EXCLUSIVAMENTE em matérias negligenciadas e recuperação dos Gaps diagnosticados usando blocos de revisão e questões. O "rationale" deve ser motivacional, focado em recuperar a semana.
- Se houver GAPS DIAGNÓSTICADOS, crie ao menos 1 bloco focado explicitamente em corrigir o gap mais grave (Prioridade Alta, tarefa tipo 'revisao' ou 'questoes', citando o subtema no objective).

DADOS DO ALUNO:
- Nome: ${ctx.userName}
- Data do plano: ${dateISO}
- Edital em foco: ${ctx.activePlanName || 'Visão Geral'}
- Meta semanal: ${ctx.weeklyGoalHours}h
- Estudado na semana: ${ctx.weeklyTotalHours.toFixed(1)}h (${ctx.weeklyProgressPercent}%)
- Streak atual: ${ctx.currentStreak} dias
- Dias estudados na semana: ${ctx.daysStudiedThisWeek}/7
- Minutos já estudados hoje: ${ctx.todayTotalMinutes}
- Janela disponível hoje (alvo): ${available} minutos
- Tipo de solicitação: ${replanMode}

${engineAnalysis}

GAPS DIAGNÓSTICADOS (Alta Prioridade):
${gapSummary}

HORAS POR MATÉRIA:
${subjectSummary}

PLANO VS REAL:
${planSummary}

ACERTO POR MATÉRIA:
${accuracySummary}

EXECUÇÃO DO PLANO DE HOJE:
${executionSummary}

Schema de saída (JSON exato, sem chaves extras):
{
  "dateISO": "${dateISO}",
  "rationale": "resumo em 2-4 frases da estratégia do dia. Se modo recovery, tom energizante e focado em resgate.",
  "blocks": [
    {
      "subject": "Nome exato da matéria tirado do Plano vs Real",
      "durationMinutes": 50,
      "objective": "objetivo concreto do bloco apontando o que fazer (ex: revisar gap em Controle de Constitucionalidade)",
      "taskType": "teoria|questoes|revisao|simulado",
      "priority": "alta|media|baixa"
    }
  ],
  "contingencies": [
    "Se atrasar, reduzir bloco X para 30 min e manter bloco Y",
    "Se sobrar tempo, fazer 10 questões da matéria Z para melhorar acurácia"
  ],
  "estimatedTotalMinutes": 180
}`;
}

function sanitizePlan(raw: Record<string, unknown>, fallbackDateISO: string): PlannerDailyResponse {
  const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks : [];

  const blocks: DailyPlanBlock[] = blocksRaw
    .map((b) => {
      const block = b as Record<string, unknown>;
      const taskType = typeof block.taskType === 'string' ? block.taskType : 'revisao';
      const priority = typeof block.priority === 'string' ? block.priority : 'media';
      const duration = Number(block.durationMinutes);
      const taskTypeTyped: DailyPlanBlock['taskType'] =
        taskType === 'teoria' || taskType === 'questoes' || taskType === 'revisao' || taskType === 'simulado'
          ? taskType
          : 'revisao';
      const priorityTyped: DailyPlanBlock['priority'] =
        priority === 'alta' || priority === 'media' || priority === 'baixa' ? priority : 'media';

      return {
        subject: typeof block.subject === 'string' ? block.subject : 'Matéria principal',
        durationMinutes: Number.isFinite(duration) ? Math.max(20, Math.min(120, Math.round(duration))) : 45,
        objective: typeof block.objective === 'string' ? block.objective : 'Avançar no conteúdo prioritário',
        taskType: taskTypeTyped,
        priority: priorityTyped,
      };
    })
    .slice(0, 6);

  const safeBlocks: DailyPlanBlock[] = blocks.length > 0
    ? blocks
    : [
      {
        subject: 'Matéria prioritária',
        durationMinutes: 45,
        objective: 'Revisão ativa + questões de fixação',
        taskType: 'revisao',
        priority: 'alta',
      },
    ];

  const contingencies = Array.isArray(raw.contingencies)
    ? raw.contingencies.filter((c): c is string => typeof c === 'string').slice(0, 4)
    : [];

  const estimatedTotalMinutes = safeBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  return {
    dateISO: typeof raw.dateISO === 'string' ? raw.dateISO : fallbackDateISO,
    rationale:
      typeof raw.rationale === 'string' && raw.rationale.trim().length > 0
        ? raw.rationale
        : 'Plano diário estruturado para manter consistência e priorizar pontos críticos.',
    blocks: safeBlocks,
    contingencies:
      contingencies.length > 0
        ? contingencies
        : ['Se faltar tempo, execute apenas os blocos de prioridade alta.'],
    estimatedTotalMinutes,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;

    const quota = await enforceAiTaskQuota({
      uid: auth.uid,
      email: auth.email,
      idToken: auth.idToken,
      task: 'planner-daily',
    });
    if (!quota.allowed) return quota.response;

    const body = (await request.json()) as PlannerDailyRequest;
    if (!body?.userName || !Number.isFinite(body.weeklyGoalHours)) {
      return NextResponse.json({ error: 'Dados inválidos para gerar plano diário.' }, { status: 400 });
    }

    const dateISO = body.dateISO || new Date().toISOString().slice(0, 10);

    let engineAnalysis = '';
    try {
      const useCase = new GetPlanEngineSnapshot(new LegacyEngineDataSource(auth.idToken));
      const engineResult = await useCase.execute({
        userId: auth.uid,
        today: dateISO,
        planId: body.activePlanName ? undefined : null,
        maxRecommendations: 3,
      });

      if (engineResult.found) {
        engineAnalysis = `
[INJETADO PELO DECISION ENGINE - PRIORIDADE MÁXIMA]
O motor avaliou estruturalmente este plano de estudos e determinou o seguinte:

Top Recomendações (Tente encampar na sua sugestão):
${engineResult.snapshot.recommendations.map(r =>
          `- Matéria: ${r.targetSubject} | Ação (Tipo): ${r.type.toUpperCase()} | Motivo: ${r.reasons.join(' ')}`
        ).join('\n')}

Ranking de Saúde (Priorize as piores ou Críticas/Negligenciadas):
${engineResult.snapshot.subjects.slice(0, 5).map(s =>
          `- ${s.subject}: Status [${s.status.toUpperCase()}] (Saúde global = ${s.metrics.overallScore}/100)`
        ).join('\n')}
`;
      }
    } catch (e) {
      console.warn('Erro passivo ao carregar o motor:', e);
    }

    const aiResponse = await runAiText({
      task: 'planner-daily',
      prompt: buildPlannerPrompt(body, engineAnalysis),
      temperature: 0.35,
      maxOutputTokens: 2200,
      preferJson: true,
    });

    const parsed = parseJsonFromModelText<Record<string, unknown>>(aiResponse.text || '');
    let usedFallback = false;
    if (!parsed) {
      usedFallback = true;
      const fallbackPlan = buildFallbackPlan(body, dateISO);
      const usageEvent = {
        route: '/api/planner-daily',
        task: 'planner-daily',
        provider: aiResponse.provider,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        estimatedCostUsd: aiResponse.usage.estimatedCostUsd,
        success: false,
        statusCode: 200,
        userId: auth.uid,
        errorCode: 'JSON_PARSE_FAILED_FALLBACK',
      } as const;
      logAiUsageEvent(usageEvent);
      void saveAiUsageEvent(usageEvent, auth.idToken);

      void saveDailyAiPlanSnapshot(
        {
          userId: auth.uid,
          dateISO: fallbackPlan.dateISO,
          estimatedTotalMinutes: fallbackPlan.estimatedTotalMinutes,
          blocksCount: fallbackPlan.blocks.length,
          rationale: fallbackPlan.rationale,
          planJson: JSON.stringify(fallbackPlan),
          provider: aiResponse.provider,
          model: aiResponse.model,
        },
        auth.idToken
      );

      return NextResponse.json(
        { ...fallbackPlan, fallbackUsed: true },
        {
          headers: {
            ...quota.headers,
            'x-ai-provider': aiResponse.provider,
            'x-ai-model': aiResponse.model,
            'x-ai-latency-ms': String(aiResponse.latencyMs),
            'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
            'x-ai-fallback': 'true',
          },
        }
      );
    }

    const plan = sanitizePlan(parsed, dateISO);

    void saveDailyAiPlanSnapshot(
      {
        userId: auth.uid,
        dateISO: plan.dateISO,
        estimatedTotalMinutes: plan.estimatedTotalMinutes,
        blocksCount: plan.blocks.length,
        rationale: plan.rationale,
        planJson: JSON.stringify(plan),
        provider: aiResponse.provider,
        model: aiResponse.model,
      },
      auth.idToken
    );

    const usageEvent = {
      route: '/api/planner-daily',
      task: 'planner-daily',
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

    return NextResponse.json(plan, {
      headers: {
        ...quota.headers,
        'x-ai-provider': aiResponse.provider,
        'x-ai-model': aiResponse.model,
        'x-ai-latency-ms': String(aiResponse.latencyMs),
        'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
        'x-ai-fallback': usedFallback ? 'true' : 'false',
      },
    });
  } catch (error) {
    console.error('[planner-daily] Erro:', error);
    return NextResponse.json({ error: 'Erro ao gerar plano diário.' }, { status: 500 });
  }
}
