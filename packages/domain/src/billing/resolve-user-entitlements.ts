import {
    EntitlementMode,
    type EntitlementPolicy,
    type EntitlementRule,
    type EntitlementValue,
    type FeatureCode,
    type ResolveUserEntitlementsInput,
    type UserEntitlements,
} from './types';
import { DEFAULT_ENTITLEMENT_POLICY } from './entitlement-policy';

function toUsageValue(value: number | undefined): number {
    if (!Number.isFinite(value) || value == null) {
        return 0;
    }

    return Math.max(0, Math.floor(value));
}

function applyRule(
    rule: EntitlementRule,
    used: number,
    disabled: boolean
): EntitlementValue {
    if (rule.mode === EntitlementMode.Boolean) {
        return {
            mode: EntitlementMode.Boolean,
            enabled: rule.enabled && !disabled,
        };
    }

    const limit = disabled ? 0 : rule.limit;
    const remaining = Math.max(0, limit - used);

    return {
        mode: EntitlementMode.Quota,
        enabled: limit > 0 && remaining > 0,
        limit,
        used,
        remaining,
        period: rule.period,
    };
}

export function resolveUserEntitlements(
    input: ResolveUserEntitlementsInput,
    policy: EntitlementPolicy = DEFAULT_ENTITLEMENT_POLICY
): UserEntitlements {
    const behavior = policy.statusBehavior[input.status];
    const effectivePlan = behavior.fallbackPlan ?? input.plan;
    const template = policy.plans[effectivePlan];
    const disabledFeatures = new Set<FeatureCode>(behavior.disabledFeatures ?? []);

    const features = Object.fromEntries(
        Object.entries(template.features).map(([featureCode, rule]) => {
            const used = toUsageValue(input.usage?.[featureCode as FeatureCode]);
            return [
                featureCode,
                applyRule(rule, used, disabledFeatures.has(featureCode as FeatureCode)),
            ];
        })
    ) as UserEntitlements['features'];

    return {
        catalogPlan: input.plan,
        effectivePlan,
        status: input.status,
        accessState: behavior.accessState,
        features,
    };
}
