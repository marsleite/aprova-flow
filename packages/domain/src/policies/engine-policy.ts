import {
    ExamPhase,
    PriorityBand,
    RecommendationType,
    RecommendationUrgency,
    SubjectHealthStatus,
} from '../enums';

export type RecommendationDueWindow = 'today' | 'this_week' | 'next_week' | 'routine';

export interface WeightTierValue<T> {
    minWeight?: number;
    maxWeight?: number;
    value: T;
}

export interface HealthScoreWeights {
    withPerformance: {
        performance: number;
        volume: number;
        adherence: number;
        recency: number;
        frequency: number;
    };
    withoutPerformance: {
        volume: number;
        adherence: number;
        recency: number;
        frequency: number;
    };
}

export interface SubjectStatusThresholdPolicy {
    healthyMinOverall: number;
    matureMinOverall: number;
    matureMinPerformance: number;
    warningMinOverall: number;
    criticalMaxOverall: number;
    criticalMinWeight: number;
    neglectedMinNegativeDeviation: number;
    neglectedMinWeightForShortRecencyWindow: number;
    neglectedMaxDaysSinceStudyHighWeight: number;
    neglectedMaxDaysSinceStudyDefault: number;
    criticalMinNegativeDeviation: number;
    criticalMaxDaysSinceStudy: number;
    blindSpotMinVolume: number;
    inefficientMinVolume: number;
    inefficientMaxPerformance: number;
    noDataMaxRecentStudyDays: number;
}

export interface SubjectHealthPolicy {
    windows: {
        rollingVolumeDays: number;
        rollingFrequencyDays: number;
        rollingPerformanceDays: number;
        noDataDays: number;
    };
    sample: {
        minQuestionsForPerformance: number;
        minQuestionsForInefficiency: number;
        minStudySessionSeconds: number;
        minQuestionSessionQuestions: number;
    };
    scoreWeights: HealthScoreWeights;
    frequency: {
        idealContactsByWeight: WeightTierValue<number>[];
    };
    recency: {
        safetyLimitDaysByWeight: WeightTierValue<number>[];
        scoreDecayPerExtraDay: number;
    };
    adherence: {
        understudyPenaltyMultiplier: number;
        overstudyPenaltyMultiplier: number;
    };
    statusThresholds: SubjectStatusThresholdPolicy;
}

export interface PriorityWeightsPolicy {
    weight: number;
    deviation: number;
    recency: number;
    accuracy: number;
    examProximity: number;
}

export interface PriorityPhaseOverridePolicy {
    examPhase: ExamPhase;
    weights?: Partial<PriorityWeightsPolicy>;
    minWeight?: number;
}

export interface PriorityBandRule {
    minScore: number;
    band: PriorityBand;
}

export interface PriorityPolicy {
    weights: PriorityWeightsPolicy;
    factors: {
        recencyPointsPerDayWithoutStudy: number;
        maxRecencyFactor: number;
        examProximityFactorMultiplier: number;
        missingPerformanceFallbackFactor: number;
        noDataRecencyFactor: number;
    };
    bands: PriorityBandRule[];
    phaseOverrides: PriorityPhaseOverridePolicy[];
}

export interface RecommendationRoutingRule {
    type: RecommendationType;
    urgency: RecommendationUrgency;
    dueWindow: RecommendationDueWindow;
}

export interface RecommendationPolicy {
    actionableStatuses: SubjectHealthStatus[];
    maxRecommendations: number;
    statusRouting: Partial<Record<SubjectHealthStatus, RecommendationRoutingRule>>;
    examPush: {
        enabled: boolean;
        eligiblePhases: ExamPhase[];
        minWeight: number;
        excludedStatuses: SubjectHealthStatus[];
        routing: RecommendationRoutingRule;
    };
}

export interface EnginePolicy {
    engineVersion: string;
    health: SubjectHealthPolicy;
    priority: PriorityPolicy;
    recommendations: RecommendationPolicy;
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U>
        ? U[]
        : T[K] extends object
            ? DeepPartial<T[K]>
            : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(base: T, overrides: DeepPartial<T>): T {
    if (Array.isArray(base)) {
        return (Array.isArray(overrides) ? overrides : base) as T;
    }

    if (isPlainObject(base) && isPlainObject(overrides)) {
        const output: Record<string, unknown> = { ...base };

        for (const [key, value] of Object.entries(overrides)) {
            const current = output[key];
            if (value === undefined) continue;

            if (Array.isArray(value)) {
                output[key] = value;
                continue;
            }

            if (isPlainObject(current) && isPlainObject(value)) {
                output[key] = mergeDeep(current, value);
                continue;
            }

            output[key] = value;
        }

        return output as T;
    }

    return (overrides ?? base) as T;
}

export const DEFAULT_ENGINE_POLICY: EnginePolicy = {
    engineVersion: '2026-03-08.v1',
    health: {
        windows: {
            rollingVolumeDays: 7,
            rollingFrequencyDays: 14,
            rollingPerformanceDays: 30,
            noDataDays: 30,
        },
        sample: {
            minQuestionsForPerformance: 15,
            minQuestionsForInefficiency: 20,
            minStudySessionSeconds: 60,
            minQuestionSessionQuestions: 5,
        },
        scoreWeights: {
            withPerformance: {
                performance: 0.35,
                volume: 0.25,
                adherence: 0.20,
                recency: 0.10,
                frequency: 0.10,
            },
            withoutPerformance: {
                volume: 0.40,
                adherence: 0.30,
                recency: 0.20,
                frequency: 0.10,
            },
        },
        frequency: {
            idealContactsByWeight: [
                { minWeight: 15, value: 5 },
                { minWeight: 10, maxWeight: 14.99, value: 4 },
                { minWeight: 5, maxWeight: 9.99, value: 3 },
                { maxWeight: 4.99, value: 2 },
            ],
        },
        recency: {
            safetyLimitDaysByWeight: [
                { minWeight: 10, value: 3 },
                { minWeight: 5, maxWeight: 9.99, value: 5 },
                { maxWeight: 4.99, value: 7 },
            ],
            scoreDecayPerExtraDay: 15,
        },
        adherence: {
            understudyPenaltyMultiplier: 2,
            overstudyPenaltyMultiplier: 1,
        },
        statusThresholds: {
            healthyMinOverall: 70,
            matureMinOverall: 80,
            matureMinPerformance: 80,
            warningMinOverall: 50,
            criticalMaxOverall: 49,
            criticalMinWeight: 8,
            neglectedMinNegativeDeviation: 25,
            neglectedMinWeightForShortRecencyWindow: 5,
            neglectedMaxDaysSinceStudyHighWeight: 5,
            neglectedMaxDaysSinceStudyDefault: 10,
            criticalMinNegativeDeviation: 50,
            criticalMaxDaysSinceStudy: 10,
            blindSpotMinVolume: 80,
            inefficientMinVolume: 100,
            inefficientMaxPerformance: 60,
            noDataMaxRecentStudyDays: 30,
        },
    },
    priority: {
        weights: {
            weight: 0.30,
            deviation: 0.25,
            recency: 0.20,
            accuracy: 0.15,
            examProximity: 0.10,
        },
        factors: {
            recencyPointsPerDayWithoutStudy: 10,
            maxRecencyFactor: 100,
            examProximityFactorMultiplier: 20,
            missingPerformanceFallbackFactor: 50,
            noDataRecencyFactor: 0,
        },
        bands: [
            { minScore: 80, band: PriorityBand.Critical },
            { minScore: 60, band: PriorityBand.High },
            { minScore: 40, band: PriorityBand.Medium },
            { minScore: 20, band: PriorityBand.Low },
            { minScore: 0, band: PriorityBand.Optional },
        ],
        phaseOverrides: [
            {
                examPhase: ExamPhase.Building,
                weights: {
                    weight: 0.40,
                    deviation: 0.20,
                    recency: 0.15,
                    accuracy: 0.15,
                    examProximity: 0.10,
                },
            },
            {
                examPhase: ExamPhase.Consolidating,
                weights: {
                    weight: 0.25,
                    deviation: 0.20,
                    recency: 0.15,
                    accuracy: 0.25,
                    examProximity: 0.15,
                },
            },
            {
                examPhase: ExamPhase.Sprinting,
                weights: {
                    weight: 0.20,
                    deviation: 0.35,
                    recency: 0.20,
                    accuracy: 0.15,
                    examProximity: 0.10,
                },
            },
            {
                examPhase: ExamPhase.FinalPush,
                minWeight: 10,
            },
        ],
    },
    recommendations: {
        actionableStatuses: [
            SubjectHealthStatus.Critical,
            SubjectHealthStatus.Neglected,
            SubjectHealthStatus.Inefficient,
            SubjectHealthStatus.BlindSpot,
            SubjectHealthStatus.Warning,
            SubjectHealthStatus.Healthy,
            SubjectHealthStatus.Mature,
            SubjectHealthStatus.NoData,
        ],
        maxRecommendations: 5,
        statusRouting: {
            [SubjectHealthStatus.Critical]: {
                type: RecommendationType.Rescue,
                urgency: RecommendationUrgency.Immediate,
                dueWindow: 'today',
            },
            [SubjectHealthStatus.Neglected]: {
                type: RecommendationType.Rescue,
                urgency: RecommendationUrgency.High,
                dueWindow: 'this_week',
            },
            [SubjectHealthStatus.Inefficient]: {
                type: RecommendationType.Deepen,
                urgency: RecommendationUrgency.High,
                dueWindow: 'this_week',
            },
            [SubjectHealthStatus.BlindSpot]: {
                type: RecommendationType.Diagnostic,
                urgency: RecommendationUrgency.High,
                dueWindow: 'this_week',
            },
            [SubjectHealthStatus.Warning]: {
                type: RecommendationType.Rebalance,
                urgency: RecommendationUrgency.Medium,
                dueWindow: 'this_week',
            },
            [SubjectHealthStatus.Healthy]: {
                type: RecommendationType.Maintain,
                urgency: RecommendationUrgency.Low,
                dueWindow: 'routine',
            },
            [SubjectHealthStatus.Mature]: {
                type: RecommendationType.Celebrate,
                urgency: RecommendationUrgency.Low,
                dueWindow: 'routine',
            },
            [SubjectHealthStatus.NoData]: {
                type: RecommendationType.Diagnostic,
                urgency: RecommendationUrgency.Medium,
                dueWindow: 'routine',
            },
        },
        examPush: {
            enabled: true,
            eligiblePhases: [ExamPhase.Sprinting, ExamPhase.FinalPush],
            minWeight: 10,
            excludedStatuses: [SubjectHealthStatus.Mature],
            routing: {
                type: RecommendationType.ExamPush,
                urgency: RecommendationUrgency.Immediate,
                dueWindow: 'today',
            },
        },
    },
};

export function createEnginePolicy(overrides: DeepPartial<EnginePolicy> = {}): EnginePolicy {
    return mergeDeep(DEFAULT_ENGINE_POLICY, overrides);
}

export function resolveTierValue<T>(weight: number, tiers: WeightTierValue<T>[]): T {
    const match = tiers.find((tier) => {
        const respectsMin = tier.minWeight === undefined || weight >= tier.minWeight;
        const respectsMax = tier.maxWeight === undefined || weight <= tier.maxWeight;
        return respectsMin && respectsMax;
    });

    if (!match) {
        throw new Error(`No policy tier matched weight ${weight}.`);
    }

    return match.value;
}

export function resolvePriorityBand(score: number, policy: EnginePolicy = DEFAULT_ENGINE_POLICY): PriorityBand {
    const match = policy.priority.bands.find((bandRule) => score >= bandRule.minScore);

    if (!match) {
        throw new Error(`No priority band matched score ${score}.`);
    }

    return match.band;
}
