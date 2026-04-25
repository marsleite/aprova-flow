export type ProductEventPrimitive = string | number | boolean | null | undefined;

export type ProductEventMetadata = Record<string, ProductEventPrimitive>;

export const PRODUCT_EVENT_NAMES = [
  'feature_blocked',
  'upgrade_cta_viewed',
  'upgrade_cta_clicked',
  'ai_quota_exhausted',
  'simulation_completed',
  'plan_status_changed',
  'tester_subscription_updated',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const CLIENT_PRODUCT_EVENT_NAMES = [
  'feature_blocked',
  'upgrade_cta_viewed',
  'upgrade_cta_clicked',
  'simulation_completed',
] as const;

export type ClientProductEventName = (typeof CLIENT_PRODUCT_EVENT_NAMES)[number];

export const PUBLIC_PRODUCT_EVENT_NAMES = [
  'feature_blocked',
  'upgrade_cta_viewed',
  'upgrade_cta_clicked',
  'ai_quota_exhausted',
  'simulation_completed',
] as const;

export type PublicProductEventName = (typeof PUBLIC_PRODUCT_EVENT_NAMES)[number];

export interface ProductEventInput {
  actorUserId: string;
  eventName: ProductEventName;
  userId?: string | null;
  route?: string | null;
  surface?: string | null;
  featureCode?: string | null;
  recommendedPlan?: string | null;
  planTier?: string | null;
  task?: string | null;
  status?: string | null;
  ctaHref?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  metadata?: ProductEventMetadata;
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function isClientProductEventName(value: unknown): value is ClientProductEventName {
  return typeof value === 'string' && CLIENT_PRODUCT_EVENT_NAMES.includes(value as ClientProductEventName);
}

export function isPublicProductEventName(value: unknown): value is PublicProductEventName {
  return typeof value === 'string' && PUBLIC_PRODUCT_EVENT_NAMES.includes(value as PublicProductEventName);
}

export function normalizeProductEventMetadata(
  metadata?: ProductEventMetadata | null
): ProductEventMetadata | undefined {
  if (!metadata) return undefined;

  const normalized: ProductEventMetadata = {};

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    const key = rawKey.trim();
    if (!key) continue;

    if (rawValue === undefined) continue;
    if (rawValue === null) {
      normalized[key] = null;
      continue;
    }

    if (typeof rawValue === 'string') {
      const value = rawValue.trim();
      if (value) {
        normalized[key] = value;
      }
      continue;
    }

    if (typeof rawValue === 'boolean') {
      normalized[key] = rawValue;
      continue;
    }

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      normalized[key] = rawValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function serializeProductEventMetadata(
  metadata?: ProductEventMetadata | null
): string | undefined {
  const normalized = normalizeProductEventMetadata(metadata);
  return normalized ? JSON.stringify(normalized) : undefined;
}

export function buildProductEventDocument(
  event: ProductEventInput,
  createdAt = new Date().toISOString()
): Record<string, ProductEventPrimitive> {
  const actorUserId = normalizeOptionalString(event.actorUserId);
  if (!actorUserId) {
    throw new Error('product_event_actor_required');
  }

  const userId = normalizeOptionalString(event.userId) || actorUserId;

  return {
    actorUserId,
    userId,
    eventName: event.eventName,
    route: normalizeOptionalString(event.route),
    surface: normalizeOptionalString(event.surface),
    featureCode: normalizeOptionalString(event.featureCode),
    recommendedPlan: normalizeOptionalString(event.recommendedPlan),
    planTier: normalizeOptionalString(event.planTier),
    task: normalizeOptionalString(event.task),
    status: normalizeOptionalString(event.status),
    ctaHref: normalizeOptionalString(event.ctaHref),
    targetUserId: normalizeOptionalString(event.targetUserId),
    targetEmail: normalizeOptionalString(event.targetEmail),
    metadataJson: serializeProductEventMetadata(event.metadata),
    createdAt,
  };
}

export function buildAiQuotaExhaustedEvent(params: {
  uid: string;
  task: string;
  planTier: string;
  limit: number;
  window: string;
  route?: string | null;
  featureCode?: string | null;
  retryAfterSeconds?: number | null;
}): ProductEventInput {
  const normalizedPlanTier = normalizeOptionalString(params.planTier);
  const recommendedPlan =
    normalizedPlanTier === 'free'
      ? 'pro'
      : normalizedPlanTier === 'pro'
        ? 'premium'
        : undefined;

  return {
    actorUserId: params.uid,
    userId: params.uid,
    eventName: 'ai_quota_exhausted',
    route: params.route,
    surface: 'ai_rate_limit',
    featureCode: params.featureCode,
    recommendedPlan,
    planTier: normalizedPlanTier,
    task: params.task,
    metadata: {
      limit: params.limit,
      window: params.window,
      retryAfterSeconds: params.retryAfterSeconds ?? null,
    },
  };
}

export function buildPlanStatusChangedEvent(params: {
  actorUserId: string;
  targetUserId: string;
  targetEmail?: string | null;
  previousPlan: string;
  nextPlan: string;
  previousStatus: string;
  nextStatus: string;
}): ProductEventInput {
  return {
    actorUserId: params.actorUserId,
    userId: params.targetUserId,
    eventName: 'plan_status_changed',
    surface: 'tester_subscription_admin',
    planTier: params.nextPlan,
    status: params.nextStatus,
    targetUserId: params.targetUserId,
    targetEmail: params.targetEmail,
    metadata: {
      previousPlan: params.previousPlan,
      nextPlan: params.nextPlan,
      previousStatus: params.previousStatus,
      nextStatus: params.nextStatus,
    },
  };
}

export function buildTesterSubscriptionUpdatedEvent(params: {
  actorUserId: string;
  targetUserId: string;
  targetEmail?: string | null;
  nextPlan: string;
  nextStatus: string;
  previousPlan: string;
  previousStatus: string;
  resetUsage: boolean;
  usageKeys?: string[];
}): ProductEventInput {
  return {
    actorUserId: params.actorUserId,
    userId: params.targetUserId,
    eventName: 'tester_subscription_updated',
    surface: 'tester_subscription_admin',
    planTier: params.nextPlan,
    status: params.nextStatus,
    targetUserId: params.targetUserId,
    targetEmail: params.targetEmail,
    metadata: {
      previousPlan: params.previousPlan,
      previousStatus: params.previousStatus,
      resetUsage: params.resetUsage,
      usageKeys: params.usageKeys?.join(',') || null,
    },
  };
}
