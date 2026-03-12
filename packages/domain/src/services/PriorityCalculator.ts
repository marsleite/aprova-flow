/**
 * PriorityCalculator — AprovaMind Decision Engine
 *
 * Computes strategic priority from policy-driven factors:
 * weight, negative deviation, recency, performance deficit and exam proximity.
 */

import { SubjectHealthStatus } from '../enums';
import type { PriorityBand, ExamPhase } from '../enums';
import {
    DEFAULT_ENGINE_POLICY,
    resolvePriorityBand,
    type EnginePolicy,
    type PriorityWeightsPolicy,
} from '../policies/engine-policy';
import type { SubjectHealth, PriorityScoreResult } from '../types';
import type { PlanningWindow } from '../value-objects';
import { clampScore } from '../value-objects';

export type PriorityWeights = PriorityWeightsPolicy;
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights =
    DEFAULT_ENGINE_POLICY.priority.weights;

function isEnginePolicy(value: PriorityWeights | EnginePolicy): value is EnginePolicy {
    return 'priority' in value;
}

function resolvePolicy(
    config: PriorityWeights | EnginePolicy | undefined
): EnginePolicy {
    if (!config) return DEFAULT_ENGINE_POLICY;
    return isEnginePolicy(config)
        ? config
        : {
            ...DEFAULT_ENGINE_POLICY,
            priority: {
                ...DEFAULT_ENGINE_POLICY.priority,
                weights: config,
            },
        };
}

function resolveWeights(
    window: PlanningWindow,
    policy: EnginePolicy
): PriorityWeightsPolicy {
    const override = policy.priority.phaseOverrides.find(
        (rule) => rule.examPhase === (window.examPhase as ExamPhase)
    );

    return {
        ...policy.priority.weights,
        ...(override?.weights ?? {}),
    };
}

function computeExamProximityFactor(
    window: PlanningWindow,
    policy: EnginePolicy
): number {
    const multiplierGap = Math.max(0, window.urgencyMultiplier - 1);
    return clampScore(
        multiplierGap * policy.priority.factors.examProximityFactorMultiplier
    );
}

function generateReasons(
    health: SubjectHealth,
    window: PlanningWindow,
    factors: PriorityScoreResult['influencingFactors']
): string[] {
    const reasons: string[] = [];

    if (health.status === SubjectHealthStatus.NoData) {
        reasons.push('Sem histórico recente suficiente para medir a matéria.');

        if (health.weight >= 10) {
            reasons.push(`Matéria de peso relevante no edital (${health.weight}%).`);
        }

        if (health.raw.deviationPercent < 0) {
            reasons.push(
                `Esforço ainda abaixo da meta semanal (${health.raw.deviationPercent.toFixed(0)}% de desvio).`
            );
        }

        if (health.metrics.performanceScore === null) {
            reasons.push('Ainda não há base suficiente de questões para diagnóstico completo.');
        }

        return reasons.slice(0, 3);
    }

    if (health.weight >= 10) {
        reasons.push(`Matéria de peso relevante no edital (${health.weight}%).`);
    }

    if (window.urgencyMultiplier > 1) {
        reasons.push(
            `Proximidade da prova aumenta a urgência (${window.examPhase}).`
        );
    }

    if (health.raw.deviationPercent < 0) {
        reasons.push(
            `Esforço abaixo da meta semanal (${health.raw.deviationPercent.toFixed(0)}% de desvio).`
        );
    }

    if (health.raw.daysSinceLastStudy > 0) {
        reasons.push(
            `${health.raw.daysSinceLastStudy} dias sem contato com a matéria.`
        );
    }

    if (
        health.metrics.performanceScore !== null &&
        health.metrics.performanceScore < 60
    ) {
        reasons.push(
            `Desempenho recente em questões em ${health.metrics.performanceScore.toFixed(0)}%.`
        );
    }

    if (reasons.length >= 3) {
        return reasons.slice(0, 3);
    }

    const topFactor = Object.entries(factors).reduce((current, next) =>
        current[1] >= next[1] ? current : next
    )[0];

    if (topFactor === 'weight' && !reasons.some((reason) => reason.includes('peso'))) {
        reasons.push('Peso do edital puxando a prioridade para cima.');
    }

    return reasons.slice(0, 3);
}

export function calculateSubjectPriorityScore(
    health: SubjectHealth,
    window: PlanningWindow,
    config?: PriorityWeights | EnginePolicy,
): PriorityScoreResult {
    const policy = resolvePolicy(config);
    const weights = resolveWeights(window, policy);
    const isNoData = health.status === SubjectHealthStatus.NoData;

    const weightFactor = clampScore(health.weight);
    const deviationFactor = clampScore(Math.max(0, -health.raw.deviationPercent));
    const recencyFactor = isNoData
        ? policy.priority.factors.noDataRecencyFactor
        : clampScore(
            Math.min(
                policy.priority.factors.maxRecencyFactor,
                health.raw.daysSinceLastStudy *
                    policy.priority.factors.recencyPointsPerDayWithoutStudy
            )
        );
    const accuracyFactor =
        health.metrics.performanceScore !== null
            ? clampScore(100 - health.metrics.performanceScore)
            : policy.priority.factors.missingPerformanceFallbackFactor;
    const proximityFactor = computeExamProximityFactor(window, policy);

    const rawScore =
        weightFactor * weights.weight +
        deviationFactor * weights.deviation +
        recencyFactor * weights.recency +
        accuracyFactor * weights.accuracy +
        proximityFactor * weights.examProximity;

    const finalScore = clampScore(rawScore * window.urgencyMultiplier);
    const band = resolvePriorityBand(finalScore, policy);

    const totalWeight =
        weights.weight +
        weights.deviation +
        weights.recency +
        weights.accuracy +
        weights.examProximity;

    const factors = {
        weight: (weightFactor * weights.weight) / totalWeight,
        deviation: (deviationFactor * weights.deviation) / totalWeight,
        recency: (recencyFactor * weights.recency) / totalWeight,
        accuracy: (accuracyFactor * weights.accuracy) / totalWeight,
        proximity: (proximityFactor * weights.examProximity) / totalWeight,
    };

    return {
        score: finalScore,
        band,
        influencingFactors: factors,
        reasons: generateReasons(health, window, factors),
    };
}

export function applyPriorityCalculation(
    healthEntries: SubjectHealth[],
    window: PlanningWindow,
    config?: PriorityWeights | EnginePolicy,
): SubjectHealth[] {
    return [...healthEntries]
        .map((health) => {
            const priority = calculateSubjectPriorityScore(health, window, config);
            return {
                ...health,
                priority,
                priorityScore: priority.score,
                priorityBand: priority.band,
            };
        })
        .sort((a, b) => b.priority.score - a.priority.score);
}

export function selectTopPriorities(
    healthEntries: SubjectHealth[],
    window: PlanningWindow,
    maxSubjects: number = 5,
    config?: PriorityWeights | EnginePolicy,
): SubjectHealth[] {
    const policy = resolvePolicy(config);
    const phaseOverride = policy.priority.phaseOverrides.find(
        (rule) => rule.examPhase === (window.examPhase as ExamPhase)
    );
    const minWeight = phaseOverride?.minWeight ?? 0;

    return [...healthEntries]
        .filter((health) => health.weight >= minWeight)
        .sort((a, b) => b.priority.score - a.priority.score)
        .slice(0, maxSubjects);
}

/** @deprecated use calculateSubjectPriorityScore */
export function computeFullPriority(
    health: SubjectHealth,
    window: PlanningWindow,
    config?: PriorityWeights | EnginePolicy,
): number {
    return calculateSubjectPriorityScore(health, window, config).score;
}
