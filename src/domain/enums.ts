/**
 * Domain Enumerations — AprovaMind Decision Engine
 *
 * All strategic enums for the domain layer.
 * Zero coupling with Firestore, UI, or framework concerns.
 */

// ─────────────────────────────────────────────
// Subject Health & Strategic State
// ─────────────────────────────────────────────

/**
 * Granular health status reflecting a mathematical diagnostic of a subject.
 */
export const SubjectHealthStatus = {
    /** High consistency and performance */
    Healthy: 'healthy',
    /** Top tier: High consistency AND performance >= 80% */
    Mature: 'mature',
    /** Slight deviation in volume or performance */
    Warning: 'warning',
    /** High deviation or critical negligence in high-weight subject */
    Critical: 'critical',
    /** > 7-10 days without contact */
    Neglected: 'neglected',
    /** High volume but low performance (< 60%) */
    Inefficient: 'inefficient',
    /** High theory volume but zero/few questions */
    BlindSpot: 'blind_spot',
    /** No data in the last 30 days */
    NoData: 'no_data',
} as const;

export type SubjectHealthStatus = (typeof SubjectHealthStatus)[keyof typeof SubjectHealthStatus];

/**
 * Macro-strategy state focusing on what the student should do next.
 */
export const SubjectStrategicState = {
    /** Focus on retention (e.g., Mature) */
    Maintenance: 'maintenance',
    /** Regular theory/practice cycles (e.g., Healthy) */
    ActiveGrowth: 'active_growth',
    /** Immediate effort to cover gaps (e.g., Critical/Neglected) */
    Recovery: 'recovery',
} as const;

export type SubjectStrategicState = (typeof SubjectStrategicState)[keyof typeof SubjectStrategicState];

/** Severity ranking for SubjectHealthStatus (lower = more severe) */
export const STRATEGIC_STATE_SEVERITY: Record<SubjectHealthStatus, number> = {
    [SubjectHealthStatus.Critical]: 1,
    [SubjectHealthStatus.Neglected]: 2,
    [SubjectHealthStatus.Inefficient]: 3,
    [SubjectHealthStatus.BlindSpot]: 3,
    [SubjectHealthStatus.Warning]: 4,
    [SubjectHealthStatus.Healthy]: 5,
    [SubjectHealthStatus.Mature]: 6,
    [SubjectHealthStatus.NoData]: 7,
};

// ─────────────────────────────────────────────
// Recommendation Type
// ─────────────────────────────────────────────

/**
 * The kind of actionable recommendation the engine produces.
 */
export const RecommendationType = {
    /** Subject in critical/neglected > 7 days — immediate rescue session */
    Rescue: 'rescue',
    /** Effort distribution deviated > 20% from target — redistribute hours */
    Rebalance: 'rebalance',
    /** High effort but low accuracy (< 60%) — switch to questions */
    Deepen: 'deepen',
    /** Subject healthy — maintain rhythm */
    Maintain: 'maintain',
    /** Subject exceeding goals in effort and accuracy — celebrate */
    Celebrate: 'celebrate',
    /** Overtraining detected (effort > 150% sustained) — moderate */
    Rest: 'rest',
    /** Exam < 30 days, high-weight subject with low health — intensive mode */
    ExamPush: 'exam_push',
    /** High theory volume but zero/few questions — force assessment */
    Diagnostic: 'diagnostic',
} as const;

export type RecommendationType = (typeof RecommendationType)[keyof typeof RecommendationType];

// ─────────────────────────────────────────────
// Recommendation Urgency
// ─────────────────────────────────────────────

/** Nível situacional de quem consome a recomendação */
export const RecommendationUrgency = {
    Immediate: 'immediate', // Exemplo: Executar hoje obrigatoriamente
    High: 'high',           // Priorizar na semana
    Medium: 'medium',       // Agendar normalmente
    Low: 'low',             // Cumprir se tiver tempo livre
} as const;

export type RecommendationUrgency = (typeof RecommendationUrgency)[keyof typeof RecommendationUrgency];

// ─────────────────────────────────────────────
// Priority Band
// ─────────────────────────────────────────────

/**
 * Discrete urgency levels mapped from the continuous priorityScore (0–100).
 */
export const PriorityBand = {
    /** Score ≥ 80 — must act today */
    Critical: 1,
    /** Score 60–79 — act this week */
    High: 2,
    /** Score 40–59 — scheduled attention */
    Medium: 3,
    /** Score 20–39 — low urgency */
    Low: 4,
    /** Score < 20 — optional / maintenance */
    Optional: 5,
} as const;

export type PriorityBand = (typeof PriorityBand)[keyof typeof PriorityBand];

// ─────────────────────────────────────────────
// Exam Phase
// ─────────────────────────────────────────────

/**
 * The preparation phase for a study plan, computed from daysToExam.
 *
 * > 90 days  → building
 * 30–90 days → consolidating
 * 15–30 days → sprinting
 * < 15 days  → final_push
 * past date  → post_exam
 * no date    → building (default)
 */
export const ExamPhase = {
    /** No exam date or > 90 days. Broad coverage, regular rhythm */
    Building: 'building',
    /** 30–90 days. Balance theory & questions, identify gaps */
    Consolidating: 'consolidating',
    /** 15–30 days. Focus on questions & review, close effort gaps */
    Sprinting: 'sprinting',
    /** < 15 days. Only high-weight subjects, pure review */
    FinalPush: 'final_push',
    /** Exam date has passed */
    PostExam: 'post_exam',
} as const;

export type ExamPhase = (typeof ExamPhase)[keyof typeof ExamPhase];

// ─────────────────────────────────────────────
// Accuracy Trend
// ─────────────────────────────────────────────

/**
 * Direction of accuracy change between two measurement periods.
 *
 * Thresholds: ±5 percentage points.
 */
export const AccuracyTrend = {
    /** Recent − Previous ≥ +5pp */
    Improving: 'improving',
    /** |Recent − Previous| < 5pp */
    Stable: 'stable',
    /** Recent − Previous ≤ −5pp */
    Declining: 'declining',
    /** Insufficient data (< 10 questions in either period) */
    Unknown: 'unknown',
} as const;

export type AccuracyTrend = (typeof AccuracyTrend)[keyof typeof AccuracyTrend];

// ─────────────────────────────────────────────
// Recommendation Category
// ─────────────────────────────────────────────

/**
 * The kind of study activity a recommendation prescribes.
 */
export const RecommendationCategory = {
    /** Read theory, watch lecture, take notes */
    Study: 'study',
    /** Spaced review, consolidation */
    Review: 'review',
    /** Solve practice questions */
    Questions: 'questions',
    /** Rest, reduce intensity */
    Rest: 'rest',
} as const;

export type RecommendationCategory =
    (typeof RecommendationCategory)[keyof typeof RecommendationCategory];
