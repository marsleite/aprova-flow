export {
    AccessState,
    EntitlementMode,
    EntitlementPeriod,
    FeatureCode,
    PlanCode,
    SubscriptionStatus,
    type AccessState as AccessStateType,
    type BooleanEntitlementRule,
    type BooleanEntitlementValue,
    type EntitlementPolicy,
    type EntitlementRule,
    type EntitlementRuleSet,
    type EntitlementValue,
    type EntitlementValueSet,
    type FeatureCode as FeatureCodeType,
    type FeatureUsageMap,
    type PlanCode as PlanCodeType,
    type PlanEntitlementTemplate,
    type QuotaEntitlementRule,
    type QuotaEntitlementValue,
    type ResolveUserEntitlementsInput,
    type StatusEntitlementBehavior,
    type SubscriptionStatus as SubscriptionStatusType,
    type UserEntitlements,
} from './types';

export {
    DEFAULT_ENTITLEMENT_POLICY,
    createEntitlementPolicy,
} from './entitlement-policy';

export { resolveUserEntitlements } from './resolve-user-entitlements';
export {
    buildFeatureUsagePeriods,
    materializeCurrentFeatureUsage,
    resolveEntitlementUsagePeriodBucket,
    type FeatureUsagePeriodMap,
} from './usage-periods';
