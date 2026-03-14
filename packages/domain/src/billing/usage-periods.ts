import { DEFAULT_ENTITLEMENT_POLICY } from './entitlement-policy';
import {
    EntitlementMode,
    EntitlementPeriod,
    type EntitlementPolicy,
    type FeatureCode,
    type FeatureUsageMap,
    type PlanCode,
    type SubscriptionStatus,
} from './types';

export type FeatureUsagePeriodMap = Partial<Record<FeatureCode, string>>;

function getEffectivePlan(
    plan: PlanCode,
    status: SubscriptionStatus,
    policy: EntitlementPolicy
): PlanCode {
    const behavior = policy.statusBehavior[status];
    return behavior?.fallbackPlan ?? plan;
}

function getPeriodBucket(period: EntitlementPeriod, now: Date): string {
    if (period === EntitlementPeriod.Lifetime) {
        return 'lifetime';
    }

    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function resolveEntitlementUsagePeriodBucket(input: {
    plan: PlanCode;
    status: SubscriptionStatus;
    featureCode: FeatureCode;
    now?: Date;
    policy?: EntitlementPolicy;
}): string | null {
    const policy = input.policy ?? DEFAULT_ENTITLEMENT_POLICY;
    const effectivePlan = getEffectivePlan(input.plan, input.status, policy);
    const template = policy.plans[effectivePlan];
    const rule = template.features[input.featureCode];

    if (!rule || rule.mode !== EntitlementMode.Quota) {
        return null;
    }

    return getPeriodBucket(rule.period, input.now ?? new Date());
}

export function materializeCurrentFeatureUsage(input: {
    plan: PlanCode;
    status: SubscriptionStatus;
    usage?: FeatureUsageMap;
    usagePeriods?: FeatureUsagePeriodMap;
    now?: Date;
    policy?: EntitlementPolicy;
}): FeatureUsageMap | undefined {
    if (!input.usage || Object.keys(input.usage).length === 0) {
        return undefined;
    }

    const policy = input.policy ?? DEFAULT_ENTITLEMENT_POLICY;
    const effectivePlan = getEffectivePlan(input.plan, input.status, policy);
    const template = policy.plans[effectivePlan];
    const now = input.now ?? new Date();

    const entries = Object.entries(input.usage).flatMap(([featureCode, rawValue]) => {
        const rule = template.features[featureCode as FeatureCode];
        if (!rule || rule.mode !== EntitlementMode.Quota) {
            return [];
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return [];
        }

        const expectedBucket = getPeriodBucket(rule.period, now);
        const storedBucket = input.usagePeriods?.[featureCode as FeatureCode];
        const currentValue =
            !storedBucket || storedBucket === expectedBucket
                ? Math.max(0, Math.floor(numericValue))
                : 0;

        if (currentValue <= 0) {
            return [];
        }

        return [[featureCode as FeatureCode, currentValue]];
    });

    return entries.length > 0
        ? (Object.fromEntries(entries) as FeatureUsageMap)
        : undefined;
}

export function buildFeatureUsagePeriods(input: {
    plan: PlanCode;
    status: SubscriptionStatus;
    usage?: FeatureUsageMap;
    now?: Date;
    policy?: EntitlementPolicy;
}): FeatureUsagePeriodMap | undefined {
    if (!input.usage || Object.keys(input.usage).length === 0) {
        return undefined;
    }

    const policy = input.policy ?? DEFAULT_ENTITLEMENT_POLICY;
    const effectivePlan = getEffectivePlan(input.plan, input.status, policy);
    const template = policy.plans[effectivePlan];
    const now = input.now ?? new Date();

    const entries = Object.entries(input.usage).flatMap(([featureCode, rawValue]) => {
        const rule = template.features[featureCode as FeatureCode];
        if (!rule || rule.mode !== EntitlementMode.Quota) {
            return [];
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return [];
        }

        return [[featureCode as FeatureCode, getPeriodBucket(rule.period, now)]];
    });

    return entries.length > 0
        ? (Object.fromEntries(entries) as FeatureUsagePeriodMap)
        : undefined;
}
