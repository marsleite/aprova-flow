import {
    AccessState,
    EntitlementMode,
    EntitlementPeriod,
    FeatureCode,
    PlanCode,
    SubscriptionStatus,
    type EntitlementPolicy,
    type PlanEntitlementTemplate,
} from './types';

const EFFECTIVELY_UNLIMITED_MONTHLY_LIMIT = 9999;

type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U>
        ? U[]
        : T[K] extends object
            ? DeepPartial<T[K]>
            : T[K];
};

function mergeDeep<T>(base: T, override?: DeepPartial<T>): T {
    if (!override) {
        return base;
    }

    if (Array.isArray(base)) {
        return ([...(override as unknown as T[])] as unknown) as T;
    }

    if (base && typeof base === 'object') {
        const result: Record<string, unknown> = {
            ...(base as Record<string, unknown>),
        };

        for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
            if (value === undefined) {
                continue;
            }

            const current = result[key];
            if (
                current &&
                typeof current === 'object' &&
                !Array.isArray(current) &&
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
            ) {
                result[key] = mergeDeep(current, value);
            } else {
                result[key] = value;
            }
        }

        return result as T;
    }

    return override as T;
}

function createPlan(plan: PlanCode, template: PlanEntitlementTemplate['features']): PlanEntitlementTemplate {
    return {
        plan,
        features: template,
    };
}

export const DEFAULT_ENTITLEMENT_POLICY: EntitlementPolicy = {
    plans: {
        [PlanCode.Free]: createPlan(PlanCode.Free, {
            [FeatureCode.StudyTimer]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.DashboardBasic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.ActivePlans]: {
                mode: EntitlementMode.Quota,
                limit: 1,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.QuestionsPracticeBasic]: {
                mode: EntitlementMode.Boolean,
                enabled: true,
            },
            [FeatureCode.SimulationsBasic]: {
                mode: EntitlementMode.Quota,
                limit: 2,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.SimulationsCustom]: {
                mode: EntitlementMode.Boolean,
                enabled: false,
            },
            [FeatureCode.SimulationsAnalytics]: {
                mode: EntitlementMode.Boolean,
                enabled: false,
            },
            [FeatureCode.SubjectHealthBasic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.SubjectHealthFull]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.PriorityDay]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.PriorityScoreFull]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.RecommendationsBasic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.RecommendationsFull]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.WeeklyDiagnostic]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.AdaptiveDailyPlan]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.RecoveryPlan]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.MultiEdital]: { mode: EntitlementMode.Boolean, enabled: false },
            [FeatureCode.EditalParse]: {
                mode: EntitlementMode.Quota,
                limit: 1,
                period: EntitlementPeriod.Lifetime,
            },
            [FeatureCode.AiExplanations]: {
                mode: EntitlementMode.Quota,
                limit: 3,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.ContextualAiChat]: {
                mode: EntitlementMode.Quota,
                limit: 5,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.WeeklyMentoring]: {
                mode: EntitlementMode.Quota,
                limit: 0,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.ErrorGapAnalyzer]: {
                mode: EntitlementMode.Boolean,
                enabled: false,
            },
            [FeatureCode.PostSimuladoInteligente]: {
                mode: EntitlementMode.Quota,
                limit: 0,
                period: EntitlementPeriod.Month,
            },
        }),
        [PlanCode.Pro]: createPlan(PlanCode.Pro, {
            [FeatureCode.StudyTimer]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.DashboardBasic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.ActivePlans]: {
                mode: EntitlementMode.Quota,
                limit: 3,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.QuestionsPracticeBasic]: {
                mode: EntitlementMode.Boolean,
                enabled: true,
            },
            [FeatureCode.SimulationsBasic]: {
                mode: EntitlementMode.Quota,
                limit: EFFECTIVELY_UNLIMITED_MONTHLY_LIMIT,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.SimulationsCustom]: {
                mode: EntitlementMode.Boolean,
                enabled: true,
            },
            [FeatureCode.SimulationsAnalytics]: {
                mode: EntitlementMode.Boolean,
                enabled: true,
            },
            [FeatureCode.SubjectHealthBasic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.SubjectHealthFull]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.PriorityDay]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.PriorityScoreFull]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.RecommendationsBasic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.RecommendationsFull]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.WeeklyDiagnostic]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.AdaptiveDailyPlan]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.RecoveryPlan]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.MultiEdital]: { mode: EntitlementMode.Boolean, enabled: true },
            [FeatureCode.EditalParse]: {
                mode: EntitlementMode.Quota,
                limit: 10,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.AiExplanations]: {
                mode: EntitlementMode.Quota,
                limit: 300,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.ContextualAiChat]: {
                mode: EntitlementMode.Quota,
                limit: 150,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.WeeklyMentoring]: {
                mode: EntitlementMode.Quota,
                limit: 8,
                period: EntitlementPeriod.Month,
            },
            [FeatureCode.ErrorGapAnalyzer]: {
                mode: EntitlementMode.Boolean,
                enabled: true,
            },
            [FeatureCode.PostSimuladoInteligente]: {
                mode: EntitlementMode.Quota,
                limit: 8,
                period: EntitlementPeriod.Month,
            },
        }),
    },
    statusBehavior: {
        [SubscriptionStatus.Trialing]: {
            accessState: AccessState.Full,
        },
        [SubscriptionStatus.Active]: {
            accessState: AccessState.Full,
        },
        [SubscriptionStatus.PastDue]: {
            accessState: AccessState.Restricted,
            disabledFeatures: [
                FeatureCode.MultiEdital,
                FeatureCode.AdaptiveDailyPlan,
                FeatureCode.RecoveryPlan,
                FeatureCode.EditalParse,
                FeatureCode.AiExplanations,
                FeatureCode.ContextualAiChat,
                FeatureCode.WeeklyMentoring,
                FeatureCode.ErrorGapAnalyzer,
                FeatureCode.PostSimuladoInteligente,
            ],
        },
        [SubscriptionStatus.GracePeriod]: {
            accessState: AccessState.Full,
        },
        [SubscriptionStatus.Canceled]: {
            accessState: AccessState.Full,
        },
        [SubscriptionStatus.Expired]: {
            accessState: AccessState.FreeFallback,
            fallbackPlan: PlanCode.Free,
        },
    },
};

export function createEntitlementPolicy(
    overrides: DeepPartial<EntitlementPolicy> = {}
): EntitlementPolicy {
    return mergeDeep(DEFAULT_ENTITLEMENT_POLICY, overrides);
}
