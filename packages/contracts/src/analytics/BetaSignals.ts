import type { ProductEventName } from './ProductEvents';

const DEFAULT_WINDOW_DAYS = 7;

export interface BetaProductEventDoc {
  id?: string;
  actorUserId?: string;
  userId?: string;
  eventName: ProductEventName;
  route?: string;
  surface?: string;
  featureCode?: string;
  recommendedPlan?: string;
  planTier?: string;
  task?: string;
  status?: string;
  ctaHref?: string;
  targetUserId?: string;
  targetEmail?: string;
  metadataJson?: string;
  createdAt: string;
}

export interface BetaAiUsageEventDoc {
  id?: string;
  userId: string;
  route: string;
  task: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  status?: string;
  fallbackUsed?: boolean;
  budgetBlocked?: boolean;
  errorCode?: string;
  statusCode: number;
  createdAt: string;
}

export interface BetaUpgradePlanSummary {
  recommendedPlan: string;
  blocked: number;
  quotaExhausted: number;
  views: number;
  clicks: number;
  ctrPercent: number;
  uniqueUsers: number;
}

export interface BetaQuotaTaskSummary {
  task: string;
  count: number;
}

export interface BetaPlanTransitionSummary {
  label: string;
  count: number;
}

export interface BetaSignalsSummary {
  windowDays: number;
  dataWarnings?: string[];
  activeUsers: number;
  productEventUsers: number;
  aiUsers: number;
  featureBlocked: number;
  upgradeViews: number;
  upgradeClicks: number;
  upgradeCtrPercent: number;
  aiQuotaExhausted: number;
  simulationCompleted: number;
  testerSubscriptionUpdated: number;
  planStatusChanged: number;
  aiEvents: number;
  aiCostUsd: number;
  upgradeByRecommendedPlan: BetaUpgradePlanSummary[];
  topBlockedFeatures: { label: string; count: number }[];
  topUpgradeSurfaces: { label: string; views: number; clicks: number; ctrPercent: number }[];
  topQuotaTasks: BetaQuotaTaskSummary[];
  topPlanTransitions: BetaPlanTransitionSummary[];
  topAiTasks: { task: string; events: number; costUsd: number }[];
  aiFallbacks: number;
  aiBudgetBlocks: number;
  aiFailures: number;
  aiFallbackRatePercent: number;
  aiFailureRatePercent: number;
  topAiProviders: { provider: string; model: string; events: number; costUsd: number; fallbackRatePercent: number; failureRatePercent: number }[];
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCutoffTimestamp(now: Date, windowDays: number): number {
  return now.getTime() - windowDays * 24 * 60 * 60 * 1000;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeLabel(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readMetadataJson(value?: string): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getPlanSortWeight(plan: string): number {
  const normalized = plan.trim().toLowerCase();
  if (normalized === 'pro') return 0;
  return 1;
}

export function buildBetaSignalsSummary(
  productEvents: BetaProductEventDoc[],
  aiEvents: BetaAiUsageEventDoc[],
  now = new Date(),
  windowDays = DEFAULT_WINDOW_DAYS
): BetaSignalsSummary {
  const cutoffTs = getCutoffTimestamp(now, windowDays);
  const activeUsers = new Set<string>();
  const productEventUsers = new Set<string>();
  const aiUsers = new Set<string>();
  const blockedFeatures = new Map<string, number>();
  const upgradeSurfaces = new Map<string, { views: number; clicks: number }>();
  const recommendedPlanSignals = new Map<
    string,
    {
      blocked: number;
      quotaExhausted: number;
      views: number;
      clicks: number;
      users: Set<string>;
    }
  >();
  const quotaTasks = new Map<string, number>();
  const planTransitions = new Map<string, number>();
  const aiTasks = new Map<string, { events: number; costUsd: number }>();
  const aiProviders = new Map<string, { provider: string; model: string; events: number; costUsd: number; fallbacks: number; failures: number }>();

  let featureBlocked = 0;
  let upgradeViews = 0;
  let upgradeClicks = 0;
  let aiQuotaExhausted = 0;
  let simulationCompleted = 0;
  let testerSubscriptionUpdated = 0;
  let planStatusChanged = 0;
  let aiEventsCount = 0;
  let aiCostUsd = 0;
  let aiFallbacks = 0;
  let aiBudgetBlocks = 0;
  let aiFailures = 0;

  for (const event of productEvents) {
    const createdAt = toDate(event.createdAt);
    if (!createdAt || createdAt.getTime() < cutoffTs) continue;

    const userId = event.userId?.trim();
    if (userId) {
      activeUsers.add(userId);
      productEventUsers.add(userId);
    }

    const recommendedPlan = normalizeLabel(event.recommendedPlan);
    const recommendedPlanSummary = recommendedPlan
      ? (recommendedPlanSignals.get(recommendedPlan) ?? {
          blocked: 0,
          quotaExhausted: 0,
          views: 0,
          clicks: 0,
          users: new Set<string>(),
        })
      : null;

    if (recommendedPlan && userId && recommendedPlanSummary) {
      recommendedPlanSummary.users.add(userId);
    }

    if (event.eventName === 'feature_blocked') {
      featureBlocked += 1;
      const label = normalizeLabel(event.featureCode)
        || normalizeLabel(event.surface)
        || normalizeLabel(event.route)
        || 'desconhecido';
      blockedFeatures.set(label, (blockedFeatures.get(label) || 0) + 1);
      if (recommendedPlan && recommendedPlanSummary) {
        recommendedPlanSummary.blocked += 1;
        recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
      }
      continue;
    }

    if (event.eventName === 'upgrade_cta_viewed' || event.eventName === 'upgrade_cta_clicked') {
      const label = normalizeLabel(event.surface) || normalizeLabel(event.route) || 'desconhecido';
      const current = upgradeSurfaces.get(label) || { views: 0, clicks: 0 };
      if (event.eventName === 'upgrade_cta_viewed') {
        upgradeViews += 1;
        current.views += 1;
        if (recommendedPlan && recommendedPlanSummary) {
          recommendedPlanSummary.views += 1;
          recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
        }
      } else {
        upgradeClicks += 1;
        current.clicks += 1;
        if (recommendedPlan && recommendedPlanSummary) {
          recommendedPlanSummary.clicks += 1;
          recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
        }
      }
      upgradeSurfaces.set(label, current);
      continue;
    }

    if (event.eventName === 'ai_quota_exhausted') {
      aiQuotaExhausted += 1;
      const label = normalizeLabel(event.task)
        || normalizeLabel(event.featureCode)
        || normalizeLabel(event.route)
        || 'desconhecido';
      quotaTasks.set(label, (quotaTasks.get(label) || 0) + 1);
      if (recommendedPlan && recommendedPlanSummary) {
        recommendedPlanSummary.quotaExhausted += 1;
        recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
      }
      continue;
    }

    if (event.eventName === 'simulation_completed') {
      simulationCompleted += 1;
      continue;
    }

    if (event.eventName === 'tester_subscription_updated') {
      testerSubscriptionUpdated += 1;
      continue;
    }

    if (event.eventName === 'plan_status_changed') {
      planStatusChanged += 1;

      const metadata = readMetadataJson(event.metadataJson);
      const previousPlan = normalizeLabel(
        typeof metadata?.['previousPlan'] === 'string' ? metadata['previousPlan'] : undefined
      );
      const nextPlan = normalizeLabel(
        typeof metadata?.['nextPlan'] === 'string'
          ? metadata['nextPlan']
          : event.planTier
      );
      const previousStatus = normalizeLabel(
        typeof metadata?.['previousStatus'] === 'string' ? metadata['previousStatus'] : undefined
      );
      const nextStatus = normalizeLabel(
        typeof metadata?.['nextStatus'] === 'string' ? metadata['nextStatus'] : event.status
      );

      let label = 'desconhecido';
      if (previousPlan && nextPlan && previousPlan !== nextPlan) {
        label = `${previousPlan} -> ${nextPlan}`;
      } else if (nextPlan && previousStatus && nextStatus && previousStatus !== nextStatus) {
        label = `${nextPlan} (${previousStatus} -> ${nextStatus})`;
      } else if (nextPlan) {
        label = nextPlan;
      } else if (previousPlan) {
        label = previousPlan;
      }

      planTransitions.set(label, (planTransitions.get(label) || 0) + 1);
    }
  }

  for (const event of aiEvents) {
    const createdAt = toDate(event.createdAt);
    if (!createdAt || createdAt.getTime() < cutoffTs) continue;

    aiEventsCount += 1;
    aiCostUsd += Number(event.estimatedCostUsd || 0);

    const userId = event.userId?.trim();
    if (userId) {
      activeUsers.add(userId);
      aiUsers.add(userId);
    }

    const task = event.task?.trim() || 'unknown';
    const status = event.status?.trim() || (event.success ? 'success' : 'failed');
    const fallbackUsed = event.fallbackUsed === true || status === 'fallback';
    const budgetBlocked = event.budgetBlocked === true || status === 'blocked_by_budget';
    const failed = !event.success || status === 'failed';
    if (fallbackUsed) aiFallbacks += 1;
    if (budgetBlocked) aiBudgetBlocks += 1;
    if (failed && !budgetBlocked && !fallbackUsed) aiFailures += 1;

    const current = aiTasks.get(task) || { events: 0, costUsd: 0 };
    current.events += 1;
    current.costUsd += Number(event.estimatedCostUsd || 0);
    aiTasks.set(task, current);

    const provider = event.provider?.trim() || (fallbackUsed ? 'local-heuristic' : 'unknown');
    const model = event.model?.trim() || (fallbackUsed ? 'fallback' : 'unknown');
    const providerKey = `${provider}::${model}`;
    const providerCurrent = aiProviders.get(providerKey) || {
      provider,
      model,
      events: 0,
      costUsd: 0,
      fallbacks: 0,
      failures: 0,
    };
    providerCurrent.events += 1;
    providerCurrent.costUsd += Number(event.estimatedCostUsd || 0);
    if (fallbackUsed) providerCurrent.fallbacks += 1;
    if (failed && !budgetBlocked && !fallbackUsed) providerCurrent.failures += 1;
    aiProviders.set(providerKey, providerCurrent);
  }

  const topBlockedFeatures = Array.from(blockedFeatures.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  const topUpgradeSurfaces = Array.from(upgradeSurfaces.entries())
    .map(([label, value]) => ({
      label,
      views: value.views,
      clicks: value.clicks,
      ctrPercent: value.views > 0 ? Math.round((value.clicks / value.views) * 100) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, 5);

  const upgradeByRecommendedPlan = Array.from(recommendedPlanSignals.entries())
    .map(([recommendedPlan, value]) => ({
      recommendedPlan,
      blocked: value.blocked,
      quotaExhausted: value.quotaExhausted,
      views: value.views,
      clicks: value.clicks,
      ctrPercent: value.views > 0 ? Math.round((value.clicks / value.views) * 100) : 0,
      uniqueUsers: value.users.size,
    }))
    .sort(
      (a, b) =>
        getPlanSortWeight(a.recommendedPlan) - getPlanSortWeight(b.recommendedPlan)
        || b.clicks - a.clicks
        || b.views - a.views
        || a.recommendedPlan.localeCompare(b.recommendedPlan)
    );

  const topQuotaTasks = Array.from(quotaTasks.entries())
    .map(([task, count]) => ({ task, count }))
    .sort((a, b) => b.count - a.count || a.task.localeCompare(b.task))
    .slice(0, 5);

  const topPlanTransitions = Array.from(planTransitions.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  const topAiTasks = Array.from(aiTasks.entries())
    .map(([task, value]) => ({
      task,
      events: value.events,
      costUsd: roundCurrency(value.costUsd),
    }))
    .sort((a, b) => b.events - a.events || b.costUsd - a.costUsd || a.task.localeCompare(b.task))
    .slice(0, 5);

  const topAiProviders = Array.from(aiProviders.values())
    .map((value) => ({
      provider: value.provider,
      model: value.model,
      events: value.events,
      costUsd: roundCurrency(value.costUsd),
      fallbackRatePercent: value.events > 0 ? Math.round((value.fallbacks / value.events) * 100) : 0,
      failureRatePercent: value.events > 0 ? Math.round((value.failures / value.events) * 100) : 0,
    }))
    .sort((a, b) => b.events - a.events || b.costUsd - a.costUsd || a.provider.localeCompare(b.provider))
    .slice(0, 5);

  return {
    windowDays,
    activeUsers: activeUsers.size,
    productEventUsers: productEventUsers.size,
    aiUsers: aiUsers.size,
    featureBlocked,
    upgradeViews,
    upgradeClicks,
    upgradeCtrPercent: upgradeViews > 0 ? Math.round((upgradeClicks / upgradeViews) * 100) : 0,
    aiQuotaExhausted,
    simulationCompleted,
    testerSubscriptionUpdated,
    planStatusChanged,
    aiEvents: aiEventsCount,
    aiCostUsd: roundCurrency(aiCostUsd),
    upgradeByRecommendedPlan,
    topBlockedFeatures,
    topUpgradeSurfaces,
    topQuotaTasks,
    topPlanTransitions,
    topAiTasks,
    aiFallbacks,
    aiBudgetBlocks,
    aiFailures,
    aiFallbackRatePercent: aiEventsCount > 0 ? Math.round((aiFallbacks / aiEventsCount) * 100) : 0,
    aiFailureRatePercent: aiEventsCount > 0 ? Math.round((aiFailures / aiEventsCount) * 100) : 0,
    topAiProviders,
  };
}
