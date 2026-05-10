import {
  PlanCode,
  SubscriptionStatus,
  type FeatureCode,
  type FeatureUsageMap,
} from '@aprovamind/domain';
import {
  buildFeatureUsagePeriods,
  materializeCurrentFeatureUsage,
  type FeatureUsagePeriodMap,
} from '@aprovamind/domain/billing/usage-periods';

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
] as const;

const USAGE_CANDIDATE_FIELDS = [
  'entitlementUsage',
  'entitlementsUsage',
  'featureUsage',
  'featureUsageJson',
] as const;

const USAGE_PERIOD_CANDIDATE_FIELDS = [
  'entitlementUsagePeriods',
  'entitlementsUsagePeriods',
  'featureUsagePeriods',
  'featureUsagePeriodsJson',
] as const;

const BOOTSTRAP_ADMIN_EMAILS = [
  'marsleite@gmail.com',
  'graceandradeleite@gmail.com',
  'marcelop3251@gmail.com',
];

export interface AdminIdentity {
  uid?: string | null;
  email?: string | null;
}

export interface SubscriptionPatchInput {
  plan?: PlanCode;
  status?: SubscriptionStatus;
  usage?: FeatureUsageMap;
  resetUsage?: boolean;
}

export function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function defaultIsAdminIdentity(identity: AdminIdentity): boolean {
  const adminUids = [
    ...parseCsv(process.env.ADMIN_UIDS),
    ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_UIDS),
  ];
  const adminEmails = [
    ...BOOTSTRAP_ADMIN_EMAILS.map((item) => item.toLowerCase()),
    ...parseCsv(process.env.ADMIN_EMAILS),
    ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
  ];

  const uid = (identity.uid || '').trim().toLowerCase();
  const email = (identity.email || '').trim().toLowerCase();

  if (uid && adminUids.includes(uid)) return true;
  if (email && adminEmails.includes(email)) return true;

  return false;
}

export function normalizePlanCode(value: string | null | undefined): PlanCode {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized === PlanCode.Pro) return PlanCode.Pro;

  return PlanCode.Free;
}

export function normalizeSubscriptionStatus(
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

export function extractPlanCode(data: Record<string, unknown> | undefined): PlanCode {
  if (!data) return PlanCode.Free;

  for (const field of PLAN_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return normalizePlanCode(raw);
    }
  }

  return PlanCode.Free;
}

export function extractSubscriptionStatus(
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

export function toFeatureUsageMap(
  value: unknown
): FeatureUsageMap | undefined {
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

  const usageEntries = Object.entries(parsed).flatMap(([featureCode, rawValue]) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return [];
    }

    return [[featureCode as FeatureCode, Math.floor(numericValue)]];
  });

  return usageEntries.length > 0
    ? (Object.fromEntries(usageEntries) as FeatureUsageMap)
    : undefined;
}

export function toFeatureUsagePeriodMap(
  value: unknown
): FeatureUsagePeriodMap | undefined {
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

  const usageEntries = Object.entries(parsed).flatMap(([featureCode, rawValue]) => {
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      return [];
    }

    return [[featureCode as FeatureCode, rawValue.trim()]];
  });

  return usageEntries.length > 0
    ? (Object.fromEntries(usageEntries) as FeatureUsagePeriodMap)
    : undefined;
}

export function extractUsage(
  data: Record<string, unknown> | undefined
): FeatureUsageMap | undefined {
  if (!data) return undefined;

  const rawUsage = (() => {
    for (const field of USAGE_CANDIDATE_FIELDS) {
      const usage = toFeatureUsageMap(data[field]);
      if (usage) return usage;
    }

    return undefined;
  })();

  if (!rawUsage) {
    return undefined;
  }

  const usagePeriods = (() => {
    for (const field of USAGE_PERIOD_CANDIDATE_FIELDS) {
      const periods = toFeatureUsagePeriodMap(data[field]);
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

export function buildSubscriptionPatch(
  input: SubscriptionPatchInput & {
    currentPlan?: PlanCode;
    currentStatus?: SubscriptionStatus;
  }
): Record<string, string> {
  const patch: Record<string, string> = {
    subscriptionUpdatedAt: new Date().toISOString(),
  };

  if (input.plan) {
    patch.planTier = input.plan;
  }

  if (input.status) {
    patch.subscriptionStatus = input.status;
  }

  if (input.resetUsage) {
    patch.entitlementUsage = '{}';
    patch.entitlementUsagePeriods = '{}';
  } else if (input.usage) {
    const resolvedPlan = input.plan ?? input.currentPlan ?? PlanCode.Free;
    const resolvedStatus =
      input.status ?? input.currentStatus ?? SubscriptionStatus.Active;
    patch.entitlementUsage = JSON.stringify(input.usage);
    patch.entitlementUsagePeriods = JSON.stringify(
      buildFeatureUsagePeriods({
        plan: resolvedPlan,
        status: resolvedStatus,
        usage: input.usage,
      }) ?? {}
    );
  }

  return patch;
}
