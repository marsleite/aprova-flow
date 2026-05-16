import { generateGeminiPdf, generateGeminiText } from './providers/gemini';
import { generateOpenAiText } from './providers/openai';
import { estimateOutputTokensFromLimit, estimatePromptTokens } from './metrics';
import { buildUsage } from './metrics';
import { estimateRequestCostUsd } from './pricing';
import type {
  AiBudgetDecision,
  AiPdfRequest,
  AiProvider,
  AiProviderQualityTier,
  AiResponse,
  AiTask,
  AiTaskPolicy,
  AiTextRequest,
} from './types';

interface TaskConfig {
  provider: AiProvider;
  model: string;
}

const DEFAULT_POLICIES: Record<AiTask, AiTaskPolicy> = {
  chat: { task: 'chat', provider: 'openrouter', model: 'qwen/qwen3-8b', maxOutputTokens: 320, allowFallback: false, estimatedInputTokens: 700, estimatedOutputTokens: 220, qualityTier: 'economical' },
  'weekly-mentoring': { task: 'weekly-mentoring', provider: 'openrouter', model: 'deepseek/deepseek-v4-flash', maxOutputTokens: 900, allowFallback: true, estimatedInputTokens: 1800, estimatedOutputTokens: 650, qualityTier: 'balanced' },
  'parse-edital': { task: 'parse-edital', provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 4000, allowFallback: false, estimatedInputTokens: 8000, estimatedOutputTokens: 2500, qualityTier: 'premium' },
  'planner-daily': { task: 'planner-daily', provider: 'openrouter', model: 'qwen/qwen3-8b', maxOutputTokens: 900, allowFallback: true, estimatedInputTokens: 1500, estimatedOutputTokens: 650, qualityTier: 'economical' },
  'smart-schedule': { task: 'smart-schedule', provider: 'openrouter', model: 'qwen/qwen3-14b', maxOutputTokens: 1200, allowFallback: true, estimatedInputTokens: 2000, estimatedOutputTokens: 800, qualityTier: 'economical' },
  interrogation: { task: 'interrogation', provider: 'openrouter', model: 'qwen/qwen3-8b', maxOutputTokens: 700, allowFallback: false, estimatedInputTokens: 1200, estimatedOutputTokens: 450, qualityTier: 'economical' },
  'predictive-exam': { task: 'predictive-exam', provider: 'openrouter', model: 'deepseek/deepseek-v4-flash', maxOutputTokens: 1200, allowFallback: false, estimatedInputTokens: 2200, estimatedOutputTokens: 900, qualityTier: 'balanced' },
  'explain-answer': { task: 'explain-answer', provider: 'openrouter', model: 'qwen/qwen3-8b', maxOutputTokens: 600, allowFallback: false, estimatedInputTokens: 1000, estimatedOutputTokens: 420, qualityTier: 'economical' },
  'error-diagnosis': { task: 'error-diagnosis', provider: 'openrouter', model: 'deepseek/deepseek-v4-flash', maxOutputTokens: 1200, allowFallback: true, estimatedInputTokens: 2200, estimatedOutputTokens: 900, qualityTier: 'balanced' },
};

const DEFAULTS: Record<AiTask, TaskConfig> = Object.fromEntries(
  Object.entries(DEFAULT_POLICIES).map(([task, policy]) => [task, {
    provider: policy.provider,
    model: policy.model,
  }])
) as Record<AiTask, TaskConfig>;

const GEMINI_FALLBACK_MODELS: Record<AiTask, string> = {
  chat: 'gemini-2.5-flash-lite',
  'weekly-mentoring': 'gemini-2.5-flash',
  'parse-edital': 'gemini-2.5-flash',
  'planner-daily': 'gemini-2.5-flash-lite',
  'smart-schedule': 'gemini-2.5-flash-lite',
  interrogation: 'gemini-2.5-flash-lite',
  'predictive-exam': 'gemini-2.5-flash',
  'explain-answer': 'gemini-2.5-flash-lite',
  'error-diagnosis': 'gemini-2.5-flash',
};

function envNameForTask(task: AiTask): string {
  return task.toUpperCase().replace(/-/g, '_');
}

function resolveConfig(task: AiTask): TaskConfig {
  const fallback = DEFAULTS[task];

  const globalProvider = (process.env.AI_PROVIDER_DEFAULT || '').toLowerCase();
  const globalModel = process.env.AI_MODEL_DEFAULT;
  const taskKey = envNameForTask(task);

  const providerByTask =
    process.env[`AI_PROVIDER_${taskKey}`] ||
    globalProvider;

  const modelByTask =
    process.env[`AI_MODEL_${taskKey}`] ||
    globalModel;

  const provider =
    providerByTask === 'openrouter'
      ? 'openrouter'
      : providerByTask === 'openai' || providerByTask === 'openai-compatible'
      ? 'openai-compatible'
      : providerByTask === 'gemini'
        ? 'gemini'
        : fallback.provider;

  return {
    provider,
    model: modelByTask?.trim() || fallback.model,
  };
}

export function resolveAiTaskPolicy(task: AiTask): AiTaskPolicy {
  const base = DEFAULT_POLICIES[task];
  const config = resolveConfig(task);
  const maxOutputEnv = Number(process.env[`AI_MAX_OUTPUT_${envNameForTask(task)}`]);
  const maxOutputTokens = Number.isFinite(maxOutputEnv) && maxOutputEnv > 0
    ? Math.floor(maxOutputEnv)
    : base.maxOutputTokens;

  const qualityTier = ((): AiProviderQualityTier => {
    const value = (process.env[`AI_QUALITY_${envNameForTask(task)}`] || '').toLowerCase();
    if (value === 'premium' || value === 'balanced' || value === 'economical') return value;
    return base.qualityTier;
  })();

  return {
    ...base,
    provider: config.provider,
    model: config.model,
    maxOutputTokens,
    qualityTier,
  };
}

function toOptionalBudgetNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, parsed);
}

function resolveBudgetDecision(params: {
  task: AiTask;
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  requestBudget?: AiTextRequest['budget'] | AiPdfRequest['budget'];
}): AiBudgetDecision {
  const estimatedRequestCostUsd = estimateRequestCostUsd({
    model: params.model,
    estimatedInputTokens: params.estimatedInputTokens,
    estimatedOutputTokens: params.estimatedOutputTokens,
  });

  const userDailyBudgetUsd = toOptionalBudgetNumber(
    params.requestBudget?.userDailyBudgetUsd ?? process.env.AI_DAILY_USER_BUDGET_USD
  );
  const globalMonthlyBudgetUsd = toOptionalBudgetNumber(
    params.requestBudget?.globalMonthlyBudgetUsd ?? process.env.AI_MONTHLY_GLOBAL_BUDGET_USD
  );

  const limits: AiBudgetDecision['limits'] = [];
  if (userDailyBudgetUsd !== undefined) {
    const consumedUsd = toOptionalBudgetNumber(
      params.requestBudget?.userDailyConsumedUsd ?? process.env.AI_DAILY_USER_CONSUMED_USD
    ) ?? 0;
    const reservedUsd = toOptionalBudgetNumber(
      params.requestBudget?.userDailyReservedUsd ?? process.env.AI_DAILY_USER_RESERVED_USD
    ) ?? 0;
    limits.push({
      scope: 'user',
      window: 'day',
      limitUsd: userDailyBudgetUsd,
      consumedUsd,
      reservedUsd,
      remainingUsd: Number(Math.max(0, userDailyBudgetUsd - consumedUsd - reservedUsd).toFixed(8)),
    });
  }

  if (globalMonthlyBudgetUsd !== undefined) {
    const consumedUsd = toOptionalBudgetNumber(
      params.requestBudget?.globalMonthlyConsumedUsd ?? process.env.AI_MONTHLY_GLOBAL_CONSUMED_USD
    ) ?? 0;
    const reservedUsd = toOptionalBudgetNumber(
      params.requestBudget?.globalMonthlyReservedUsd ?? process.env.AI_MONTHLY_GLOBAL_RESERVED_USD
    ) ?? 0;
    limits.push({
      scope: 'global',
      window: 'month',
      limitUsd: globalMonthlyBudgetUsd,
      consumedUsd,
      reservedUsd,
      remainingUsd: Number(Math.max(0, globalMonthlyBudgetUsd - consumedUsd - reservedUsd).toFixed(8)),
    });
  }

  const userLimit = limits.find((limit) => limit.scope === 'user');
  if (userLimit && estimatedRequestCostUsd > userLimit.remainingUsd) {
    return {
      allowed: false,
      task: params.task,
      estimatedRequestCostUsd,
      limits,
      blockReason: 'user_daily_budget',
    };
  }

  const globalLimit = limits.find((limit) => limit.scope === 'global');
  if (globalLimit && estimatedRequestCostUsd > globalLimit.remainingUsd) {
    return {
      allowed: false,
      task: params.task,
      estimatedRequestCostUsd,
      limits,
      blockReason: 'global_monthly_budget',
    };
  }

  return {
    allowed: true,
    task: params.task,
    estimatedRequestCostUsd,
    limits,
  };
}

function shouldFallbackToGemini(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('openai_api_key') || msg.includes('openrouter_api_key') || msg.includes('openai') || msg.includes('openrouter') || msg.includes('429') || msg.includes('quota');
}

export async function runAiText(request: AiTextRequest): Promise<AiResponse> {
  const policy = resolveAiTaskPolicy(request.task);
  const estimatedInputTokens = Math.max(
    policy.estimatedInputTokens,
    estimatePromptTokens({ prompt: request.prompt, systemInstruction: request.systemInstruction })
  );
  const estimatedOutputTokens = estimateOutputTokensFromLimit(
    request.maxOutputTokens ?? policy.maxOutputTokens,
    policy.estimatedOutputTokens
  );
  const budgetDecision = resolveBudgetDecision({
    task: request.task,
    model: policy.model,
    estimatedInputTokens,
    estimatedOutputTokens,
    requestBudget: request.budget,
  });

  if (!budgetDecision.allowed) {
    return {
      text: 'Limite de orçamento de IA atingido para este recurso. Usei uma rota segura sem custo quando disponível.',
      provider: 'local-heuristic',
      model: 'budget-policy',
      latencyMs: 0,
      usage: buildUsage({
        model: policy.model,
        inputTokens: 0,
        outputTokens: 0,
      }),
      status: 'blocked_by_budget',
      fallbackUsed: Boolean(request.allowFallback ?? policy.allowFallback),
      budgetBlocked: true,
      userMessage: 'Limite de orçamento de IA atingido. Mantive a experiência protegida para evitar custo acima do planejado.',
      errorCode: budgetDecision.blockReason,
      budgetDecision,
    };
  }

  const requestWithPolicy = {
    ...request,
    maxOutputTokens: Math.min(
      request.maxOutputTokens ?? policy.maxOutputTokens,
      policy.maxOutputTokens
    ),
  };

  if (policy.provider === 'openai' || policy.provider === 'openai-compatible' || policy.provider === 'openrouter') {
    try {
      const result = await generateOpenAiText({ provider: policy.provider, model: policy.model, request: requestWithPolicy });
      return {
        ...result,
        provider: policy.provider,
        status: 'success',
        fallbackUsed: false,
        budgetBlocked: false,
        userMessage: 'Resposta gerada com IA.',
        budgetDecision,
      };
    } catch (err) {
      if (!shouldFallbackToGemini(err)) throw err;
      const result = await generateGeminiText({
        model: GEMINI_FALLBACK_MODELS[request.task],
        request: requestWithPolicy,
      });
      return {
        ...result,
        status: 'success',
        fallbackUsed: true,
        budgetBlocked: false,
        userMessage: 'Provider alternativo indisponível; usei o fallback seguro.',
        errorCode: 'provider_fallback',
        budgetDecision,
      };
    }
  }

  const result = await generateGeminiText({ model: policy.model, request: requestWithPolicy });
  return {
    ...result,
    status: 'success',
    fallbackUsed: false,
    budgetBlocked: false,
    userMessage: 'Resposta gerada com IA.',
    budgetDecision,
  };
}

export async function runAiPdf(request: AiPdfRequest): Promise<AiResponse> {
  const policy = resolveAiTaskPolicy(request.task);

  // Parse de PDF multimodal: fallback direto para Gemini nesta fase.
  const result = await generateGeminiPdf({
    model: policy.provider === 'gemini' ? policy.model : DEFAULTS[request.task].model,
    request,
  });
  return {
    ...result,
    status: 'success',
    fallbackUsed: false,
    budgetBlocked: false,
    userMessage: 'Resposta gerada com IA.',
  };
}
