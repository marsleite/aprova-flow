/**
 * Domain Types — Billing & Entitlements
 *
 * Pure types for subscription plan access control.
 * No gateway, no persistence, no framework concerns.
 */

export const PlanCode = {
    Free: 'free',
    Pro: 'pro',
} as const;

export type PlanCode = (typeof PlanCode)[keyof typeof PlanCode];

export const SubscriptionStatus = {
    Trialing: 'trialing',
    Active: 'active',
    PastDue: 'past_due',
    GracePeriod: 'grace_period',
    Canceled: 'canceled',
    Expired: 'expired',
} as const;

export type SubscriptionStatus =
    (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const AccessState = {
    Full: 'full',
    Restricted: 'restricted',
    FreeFallback: 'free_fallback',
} as const;

export type AccessState = (typeof AccessState)[keyof typeof AccessState];

export const EntitlementMode = {
    Boolean: 'boolean',
    Quota: 'quota',
} as const;

export type EntitlementMode = (typeof EntitlementMode)[keyof typeof EntitlementMode];

export const EntitlementPeriod = {
    Month: 'month',
    Lifetime: 'lifetime',
} as const;

export type EntitlementPeriod =
    (typeof EntitlementPeriod)[keyof typeof EntitlementPeriod];

export const FeatureCode = {
    StudyTimer: 'study_timer',
    DashboardBasic: 'dashboard_basic',
    ActivePlans: 'active_plans',
    QuestionsPracticeBasic: 'questions_practice_basic',
    SimulationsBasic: 'simulations_basic',
    SimulationsCustom: 'simulations_custom',
    SimulationsAnalytics: 'simulations_analytics',
    SubjectHealthBasic: 'subject_health_basic',
    SubjectHealthFull: 'subject_health_full',
    PriorityDay: 'priority_day',
    PriorityScoreFull: 'priority_score_full',
    RecommendationsBasic: 'recommendations_basic',
    RecommendationsFull: 'recommendations_full',
    WeeklyDiagnostic: 'weekly_diagnostic',
    AdaptiveDailyPlan: 'adaptive_daily_plan',
    RecoveryPlan: 'recovery_plan',
    MultiEdital: 'multi_edital',
    EditalParse: 'edital_parse',
    AiExplanations: 'ai_explanations',
    ContextualAiChat: 'contextual_ai_chat',
    WeeklyMentoring: 'weekly_mentoring',
    ErrorGapAnalyzer: 'error_gap_analyzer',
    PostSimuladoInteligente: 'post_simulado_inteligente',
} as const;

export type FeatureCode = (typeof FeatureCode)[keyof typeof FeatureCode];

export interface BooleanEntitlementValue {
    mode: typeof EntitlementMode.Boolean;
    enabled: boolean;
}

export interface QuotaEntitlementValue {
    mode: typeof EntitlementMode.Quota;
    enabled: boolean;
    limit: number;
    used: number;
    remaining: number;
    period: EntitlementPeriod;
}

export type EntitlementValue = BooleanEntitlementValue | QuotaEntitlementValue;

export interface BooleanEntitlementRule {
    mode: typeof EntitlementMode.Boolean;
    enabled: boolean;
}

export interface QuotaEntitlementRule {
    mode: typeof EntitlementMode.Quota;
    limit: number;
    period: EntitlementPeriod;
}

export type EntitlementRule = BooleanEntitlementRule | QuotaEntitlementRule;

export type EntitlementRuleSet = Record<FeatureCode, EntitlementRule>;
export type EntitlementValueSet = Record<FeatureCode, EntitlementValue>;
export type FeatureUsageMap = Partial<Record<FeatureCode, number>>;

export interface StatusEntitlementBehavior {
    accessState: AccessState;
    fallbackPlan?: PlanCode;
    disabledFeatures?: FeatureCode[];
}

export interface PlanEntitlementTemplate {
    plan: PlanCode;
    features: EntitlementRuleSet;
}

export interface EntitlementPolicy {
    plans: Record<PlanCode, PlanEntitlementTemplate>;
    statusBehavior: Record<SubscriptionStatus, StatusEntitlementBehavior>;
}

export interface ResolveUserEntitlementsInput {
    plan: PlanCode;
    status: SubscriptionStatus;
    usage?: FeatureUsageMap;
    billingPeriodEnd?: string | Date;
}

export interface UserEntitlements {
    catalogPlan: PlanCode;
    effectivePlan: PlanCode;
    status: SubscriptionStatus;
    accessState: AccessState;
    features: EntitlementValueSet;
}
