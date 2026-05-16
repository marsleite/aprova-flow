import { FeatureCode } from '@aprovamind/domain';
import { getBetaUpgradeNarrative } from '@/lib/beta-plan-presentation';
import type { AiTask } from '@/lib/ai/types';

type RecommendedPlan = 'pro';
type QuotaWindow = 'hour' | 'day' | 'week' | 'month' | 'lifetime' | 'none';

const AI_TASK_FEATURE_CODES: Partial<Record<AiTask, string>> = {
  chat: FeatureCode.ContextualAiChat,
  'weekly-mentoring': FeatureCode.WeeklyMentoring,
  'parse-edital': FeatureCode.EditalParse,
  'planner-daily': FeatureCode.AdaptiveDailyPlan,
  'explain-answer': FeatureCode.AiExplanations,
  'error-diagnosis': FeatureCode.ErrorGapAnalyzer,
};

export interface AiQuotaErrorPayload {
  error?: string;
  code?: string;
  task?: string;
  planTier?: string;
  featureCode?: string | null;
  recommendedPlan?: string | null;
  limit?: number;
  window?: string | null;
  retryAfterSeconds?: number | null;
  upgradeHint?: string | null;
  status?: string;
  budgetBlocked?: boolean;
  userMessage?: string | null;
  errorCode?: string | null;
}

export interface AiQuotaNoticeData {
  title: string;
  message: string;
  detail?: string;
  recommendedPlan?: RecommendedPlan;
  planTier?: string;
  task?: string;
  featureCode?: string;
  limit?: number;
  window?: QuotaWindow;
  retryAfterSeconds?: number | null;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface AiBudgetNoticeData {
  title: string;
  message: string;
  detail?: string;
  task?: string;
  errorCode?: string;
}

function normalizeRecommendedPlan(value: string | null | undefined): RecommendedPlan | undefined {
  if (value === 'pro') {
    return 'pro';
  }

  return undefined;
}

function normalizeWindow(value: string | null | undefined): QuotaWindow | undefined {
  if (
    value === 'hour' ||
    value === 'day' ||
    value === 'week' ||
    value === 'month' ||
    value === 'lifetime' ||
    value === 'none'
  ) {
    return value;
  }

  return undefined;
}

function formatLimitWindow(limit: number, window?: QuotaWindow): string {
  if (window === 'hour') return `${limit}/hora`;
  if (window === 'day') return `${limit}/dia`;
  if (window === 'week') return `${limit}/semana`;
  if (window === 'month') return `${limit}/mês`;
  if (window === 'lifetime') return `${limit} no ciclo atual`;
  return `${limit} usos`;
}

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;

  const days = Math.round(hours / 24);
  return `${days} dia${days === 1 ? '' : 's'}`;
}

function normalizeTask(value: unknown): AiTask | undefined {
  if (
    value === 'chat' ||
    value === 'weekly-mentoring' ||
    value === 'parse-edital' ||
    value === 'planner-daily' ||
    value === 'smart-schedule' ||
    value === 'interrogation' ||
    value === 'predictive-exam' ||
    value === 'explain-answer' ||
    value === 'error-diagnosis'
  ) {
    return value;
  }

  return undefined;
}

export function extractAiQuotaNotice(
  payload: unknown
): AiQuotaNoticeData | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as AiQuotaErrorPayload;
  if (data.code !== 'QUOTA_EXCEEDED') {
    return null;
  }

  const recommendedPlan = normalizeRecommendedPlan(data.recommendedPlan);
  const planNarrative = recommendedPlan
    ? getBetaUpgradeNarrative(recommendedPlan)
    : null;
  const normalizedTask = normalizeTask(data.task);
  const normalizedPlanTier = typeof data.planTier === 'string' && data.planTier
    ? data.planTier.trim().toLowerCase()
    : null;
  const normalizedWindow = normalizeWindow(data.window);
  const title =
    normalizedPlanTier === 'free'
      ? 'Quota de IA do Free atingida'
      : 'Quota de IA do Pro atingida';

  const detailParts: string[] = [];

  if (typeof data.limit === 'number' && Number.isFinite(data.limit)) {
    detailParts.push(
      `Limite atual: ${formatLimitWindow(
        data.limit,
        normalizedWindow
      )}.`
    );
  }

  if (
    typeof data.retryAfterSeconds === 'number' &&
    Number.isFinite(data.retryAfterSeconds)
  ) {
    detailParts.push(
      `Nova tentativa em cerca de ${formatRetryAfter(data.retryAfterSeconds)}.`
    );
  }

  const upgradeHint =
    typeof data.upgradeHint === 'string' && data.upgradeHint.trim()
      ? data.upgradeHint.trim()
      : planNarrative?.bridgeCopy;

  if (upgradeHint) {
    detailParts.push(upgradeHint);
  }

  return {
    title,
    message:
      typeof data.error === 'string' && data.error.trim()
        ? data.error.trim()
        : 'Limite de uso de IA atingido para este recurso.',
    detail: detailParts.join(' '),
    recommendedPlan,
    planTier: normalizedPlanTier ?? undefined,
    task: normalizedTask,
    featureCode:
      typeof data.featureCode === 'string' && data.featureCode.trim()
        ? data.featureCode.trim()
        : normalizedTask
          ? AI_TASK_FEATURE_CODES[normalizedTask]
          : undefined,
    limit:
      typeof data.limit === 'number' && Number.isFinite(data.limit)
        ? data.limit
        : undefined,
    window: normalizedWindow,
    retryAfterSeconds:
      typeof data.retryAfterSeconds === 'number' &&
      Number.isFinite(data.retryAfterSeconds)
        ? data.retryAfterSeconds
        : null,
    ctaLabel: planNarrative?.ctaLabel,
    ctaHref: planNarrative ? '/settings' : undefined,
  };
}

export function extractAiBudgetNotice(payload: unknown): AiBudgetNoticeData | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as AiQuotaErrorPayload;
  const budgetBlocked = data.budgetBlocked === true || data.status === 'blocked_by_budget';
  if (!budgetBlocked) {
    return null;
  }

  return {
    title: 'Orçamento de IA protegido',
    message:
      typeof data.userMessage === 'string' && data.userMessage.trim()
        ? data.userMessage.trim()
        : typeof data.error === 'string' && data.error.trim()
          ? data.error.trim()
          : 'Limite de orçamento de IA atingido para este recurso.',
    detail: 'A ação foi interrompida antes de gerar custo externo. Quando houver fallback local, o app continua oferecendo uma orientação segura.',
    task: typeof data.task === 'string' ? data.task : undefined,
    errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
  };
}

export async function readAiErrorResponse(params: {
  response: Response;
  fallbackMessage: string;
}): Promise<{
  message: string;
  quotaNotice: AiQuotaNoticeData | null;
  payload: unknown;
}> {
  const payload = await params.response.json().catch(() => ({}));
  const quotaNotice = extractAiQuotaNotice(payload);
  const budgetNotice = extractAiBudgetNotice(payload);

  if (quotaNotice) {
    return {
      message: quotaNotice.message,
      quotaNotice,
      payload,
    };
  }

  if (budgetNotice) {
    return {
      message: budgetNotice.message,
      quotaNotice: null,
      payload,
    };
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string' &&
    payload.error.trim()
  ) {
    return {
      message: payload.error.trim(),
      quotaNotice: null,
      payload,
    };
  }

  return {
    message: params.fallbackMessage,
    quotaNotice: null,
    payload,
  };
}

export function buildAiQuotaChatMessage(notice: AiQuotaNoticeData): string {
  const parts = [notice.title, notice.message];

  if (notice.detail) {
    parts.push(notice.detail);
  }

  if (notice.ctaLabel) {
    parts.push(`${notice.ctaLabel} em /settings.`);
  }

  return parts.join(' ');
}

export function buildAiBudgetChatMessage(notice: AiBudgetNoticeData): string {
  return [notice.title, notice.message, notice.detail].filter(Boolean).join(' ');
}
