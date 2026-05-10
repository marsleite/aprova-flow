import { GetUserEntitlements } from '@aprovamind/application/use-cases/billing/GetUserEntitlements';
import type {
  GetUserSubscriptionStateParams,
  GetUserSubscriptionStateResult,
  SubscriptionStateDataSource,
} from '@aprovamind/application/ports/SubscriptionStateDataSource';
import {
  AccessState,
  FeatureCode,
  PlanCode,
  SubscriptionStatus,
  type FeatureCode as FeatureCodeValue,
} from '@aprovamind/domain';
import {
  materializeCurrentFeatureUsage,
  type FeatureUsagePeriodMap,
} from '@aprovamind/domain/billing/usage-periods';
import { NextResponse } from 'next/server';
import { isAdminIdentity } from '@/lib/admin';
import { getFirestoreDocumentWithUserToken } from '@/lib/server/firestoreRest';

const USER_STATS_COLLECTION = 'user_stats';
const PLAN_CANDIDATE_FIELDS = [
  'planTier',
  'aiPlanTier',
  'subscriptionTier',
  'planType',
  'tier',
] as const;
const STATUS_CANDIDATE_FIELDS = [
  'subscriptionStatus',
  'billingStatus',
  'planStatus',
  'status',
];
const USAGE_CANDIDATE_FIELDS = [
  'entitlementUsage',
  'entitlementsUsage',
  'featureUsage',
  'featureUsageJson',
];
const USAGE_PERIOD_CANDIDATE_FIELDS = [
  'entitlementUsagePeriods',
  'entitlementsUsagePeriods',
  'featureUsagePeriods',
  'featureUsagePeriodsJson',
];

type AdminIdentity = {
  uid: string;
  email?: string | null;
};

type ServerEntitlementContext = {
  uid: string;
  email?: string | null;
  idToken: string;
};

function normalizePlanCode(value: string | null | undefined): PlanCode {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized === PlanCode.Pro) return PlanCode.Pro;

  return PlanCode.Free;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  const normalized = (value || '').trim().toLowerCase();

  switch (normalized) {
    case SubscriptionStatus.Trialing:
      return SubscriptionStatus.Trialing;
    case SubscriptionStatus.PastDue:
    case 'past-due':
      return SubscriptionStatus.PastDue;
    case SubscriptionStatus.GracePeriod:
    case 'grace':
      return SubscriptionStatus.GracePeriod;
    case SubscriptionStatus.Canceled:
    case 'cancelled':
      return SubscriptionStatus.Canceled;
    case SubscriptionStatus.Expired:
      return SubscriptionStatus.Expired;
    case SubscriptionStatus.Active:
    default:
      return SubscriptionStatus.Active;
  }
}

function extractPlanCode(data: Record<string, unknown> | undefined): PlanCode {
  if (!data) return PlanCode.Free;

  for (const field of PLAN_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return normalizePlanCode(raw);
    }
  }

  return PlanCode.Free;
}

function extractSubscriptionStatus(
  data: Record<string, unknown> | undefined
): SubscriptionStatus {
  if (!data) return SubscriptionStatus.Active;

  for (const field of STATUS_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return normalizeSubscriptionStatus(raw);
    }
  }

  return SubscriptionStatus.Active;
}

function toUsage(value: unknown): Record<string, number> | undefined {
  if (!value) return undefined;

  const parsed =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : value;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  const entries = Object.entries(parsed).flatMap(([key, raw]) => {
    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue < 0) return [];
    return [[key, Math.floor(numericValue)]];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function toUsagePeriods(value: unknown): FeatureUsagePeriodMap | undefined {
  if (!value) return undefined;

  const parsed =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : value;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  const entries = Object.entries(parsed).flatMap(([key, raw]) => {
    if (typeof raw !== 'string' || raw.trim().length === 0) return [];
    return [[key, raw.trim()]];
  });

  return entries.length > 0 ? (Object.fromEntries(entries) as FeatureUsagePeriodMap) : undefined;
}

function extractUsage(
  data: Record<string, unknown> | undefined
): Record<string, number> | undefined {
  if (!data) return undefined;

  const rawUsage = (() => {
    for (const field of USAGE_CANDIDATE_FIELDS) {
      const usage = toUsage(data[field]);
      if (usage) return usage;
    }

    return undefined;
  })();

  if (!rawUsage) {
    return undefined;
  }

  const usagePeriods = (() => {
    for (const field of USAGE_PERIOD_CANDIDATE_FIELDS) {
      const periods = toUsagePeriods(data[field]);
      if (periods) return periods;
    }

    return undefined;
  })();

  return materializeCurrentFeatureUsage({
    plan: extractPlanCode(data),
    status: extractSubscriptionStatus(data),
    usage: rawUsage,
    usagePeriods,
  });
}

class FirestoreSubscriptionStateDataSource
  implements SubscriptionStateDataSource
{
  constructor(private readonly identity: ServerEntitlementContext) {}

  async getUserSubscriptionState(
    params: GetUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult> {
    if (
      isAdminIdentity({
        uid: params.userId || this.identity.uid,
        email: params.email || this.identity.email,
      } as AdminIdentity)
    ) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Pro,
          status: SubscriptionStatus.Active,
        },
      };
    }

    const stats = await getFirestoreDocumentWithUserToken({
      collection: USER_STATS_COLLECTION,
      documentId: params.userId,
      idToken: this.identity.idToken,
    });

    if (!stats.ok) {
      throw new Error(
        `subscription_state_read_failed:${stats.status ?? 'unknown'}:${
          stats.error || 'unknown_error'
        }`
      );
    }

    if (!stats.exists || !stats.data) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Free,
          status: SubscriptionStatus.Active,
        },
      };
    }

    const data = stats.data as Record<string, unknown>;

    return {
      found: true,
      subscription: {
        userId: params.userId,
        plan: extractPlanCode(data),
        status: extractSubscriptionStatus(data),
        usage: extractUsage(data),
      },
    };
  }
}

export async function resolveUserEntitlementsSnapshot(
  identity: ServerEntitlementContext
) {
  const useCase = new GetUserEntitlements(
    new FirestoreSubscriptionStateDataSource(identity)
  );

  const result = await useCase.execute({
    userId: identity.uid,
    email: identity.email,
  });

  if (!result.found) {
    throw new Error(`entitlements_not_found:${result.reason}`);
  }

  return result.entitlements;
}

function inferRequiredPlan(featureCode: FeatureCodeValue): PlanCode {
  switch (featureCode) {
    case FeatureCode.ErrorGapAnalyzer:
    case FeatureCode.PostSimuladoInteligente:
    case FeatureCode.MultiEdital:
    case FeatureCode.AdaptiveDailyPlan:
    case FeatureCode.RecoveryPlan:
      return PlanCode.Pro;
    default:
      return PlanCode.Pro;
  }
}

export async function requireEntitlementFeature(params: {
  identity: ServerEntitlementContext;
  featureCode: FeatureCodeValue;
}) {
  const entitlements = await resolveUserEntitlementsSnapshot(params.identity);
  const feature = entitlements.features[params.featureCode];

  if (feature?.enabled) {
    return {
      allowed: true as const,
      entitlements,
    };
  }

  if (entitlements.accessState === AccessState.Restricted) {
    return {
      allowed: false as const,
      response: NextResponse.json(
        {
          error:
            'Seu acesso a este recurso está temporariamente restrito pelo status atual da assinatura.',
          code: 'FEATURE_RESTRICTED',
          feature: params.featureCode,
          status: entitlements.status,
          accessState: entitlements.accessState,
        },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: false as const,
    response: NextResponse.json(
      {
        error: 'Este recurso exige um plano superior.',
        code: 'FEATURE_REQUIRES_UPGRADE',
        feature: params.featureCode,
        requiredPlan: inferRequiredPlan(params.featureCode),
        currentPlan: entitlements.effectivePlan,
        status: entitlements.status,
      },
      { status: 403 }
    ),
  };
}
