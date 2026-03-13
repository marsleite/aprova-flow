/**
 * AprovaMind Domain Layer
 *
 * Pure domain model for the Decision Engine.
 * No Firestore, no UI, no framework dependencies.
 *
 * Usage:
 *   import { StrategicState, computeAllSubjectHealth, ... } from '@aprovamind/domain';
 */
// ── Enums ──
export { SubjectHealthStatus, SubjectStrategicState, STRATEGIC_STATE_SEVERITY, RecommendationType, RecommendationUrgency, PriorityBand, ExamPhase, AccuracyTrend, RecommendationCategory, } from './enums';
// ── Billing & Entitlements ──
export { AccessState, EntitlementMode, EntitlementPeriod, FeatureCode, PlanCode, SubscriptionStatus, DEFAULT_ENTITLEMENT_POLICY, createEntitlementPolicy, resolveUserEntitlements, } from './billing';
// ── Policies ──
export { DEFAULT_ENGINE_POLICY, createEnginePolicy, resolvePriorityBand, resolveTierValue, } from './policies/engine-policy';
// ── Value Objects ──
export { clampScore, computeUrgency, createPlanningWindow, daysBetween, computeUrgencyFactor, } from './value-objects';
// ── Services ──
export { computeAllSubjectHealth, applyPriorityCalculation, computeFullPriority, selectTopPriorities, DEFAULT_PRIORITY_WEIGHTS, generateRecommendationsForPlan, generateRecommendationsForHealthEntries, runPlanEngine, computePortfolio, computeBonusFactor, computeCreditedMinutes, } from './services';
