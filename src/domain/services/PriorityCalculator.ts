/**
 * PriorityCalculator — AprovaMind Decision Engine
 *
 * Computes the strategic priority score for a subject.
 * Based on the deterministic formula defined in business rules §7.5.
 *
 * Rules:
 * priorityScore = (weight×0.30 + deviation×0.25 + recency×0.20 + accuracy×0.15 + examProximity×0.10) × urgencyMultiplier
 */

import { PriorityBand } from '../enums';
import type { SubjectHealth, PriorityScoreResult } from '../types';
import type { PlanningWindow } from '../value-objects';
import { clampScore } from '../value-objects';

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

export interface PriorityWeights {
    weight: number;
    deviation: number;
    recency: number;
    accuracy: number;
    examProximity: number;
}

/** Default weights from business rules §7.5 */
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
    weight: 0.30,
    deviation: 0.25,
    recency: 0.20,
    accuracy: 0.15,
    examProximity: 0.10,
};

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * The core domain function to calculate subject priority.
 * Pure, auditable, and explainable.
 */
export function calculateSubjectPriorityScore(
    health: SubjectHealth,
    window: PlanningWindow,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
): PriorityScoreResult {
    const weightFactor = health.weight;
    const deviationFactor = Math.max(0, 100 - health.metrics.adherenceScore);
    const recencyFactor = Math.max(0, 100 - health.metrics.recencyScore);
    const accuracyFactor = health.metrics.performanceScore !== null
        ? Math.max(0, 100 - health.metrics.performanceScore)
        : 50;

    // Proximity factor: maps urgencyMultiplier (1.0 - 3.0) to a 0-100 scale
    const proximityMultiplierContribution = (window.urgencyMultiplier - 1) / 2; // 0.0 to 1.0
    const proximityFactor = clampScore(proximityMultiplierContribution * 100);

    // Calculate raw score (weighted average)
    const rawScore =
        weightFactor * weights.weight +
        deviationFactor * weights.deviation +
        recencyFactor * weights.recency +
        accuracyFactor * weights.accuracy +
        proximityFactor * weights.examProximity;

    // Apply urgency multiplier for final push / sprint
    const finalScore = clampScore(rawScore * window.urgencyMultiplier);
    const band = scoreToBand(finalScore);

    // Calculate influencing factors (contribution to the raw score before multiplier)
    const totalWeight = weights.weight + weights.deviation + weights.recency + weights.accuracy + weights.examProximity;
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

/**
 * Recomputes priority for all health entries and sorts them.
 */
export function applyPriorityCalculation(
    healthEntries: SubjectHealth[],
    window: PlanningWindow,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
): SubjectHealth[] {
    return healthEntries
        .map((h) => {
            const priority = calculateSubjectPriorityScore(h, window, weights);
            return {
                ...h,
                priority,
                priorityScore: priority.score, // maintain compat
                priorityBand: priority.band,   // maintain compat
            };
        })
        .sort((a, b) => b.priority.score - a.priority.score);
}

/**
 * Select the top N subjects by priority.
 */
export function selectTopPriorities(
    healthEntries: SubjectHealth[],
    window: PlanningWindow,
    maxSubjects: number = 5,
): SubjectHealth[] {
    let candidates = healthEntries;

    if (window.examPhase === 'final_push') {
        candidates = candidates.filter((h) => h.weight > 10);
    }

    return candidates
        .sort((a, b) => b.priority.score - a.priority.score)
        .slice(0, maxSubjects);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function generateReasons(health: SubjectHealth, window: PlanningWindow, factors: PriorityScoreResult['influencingFactors']): string[] {
    const reasons: string[] = [];

    if (health.weight > 20) {
        reasons.push(`Matéria de alto peso no edital (${health.weight}%).`);
    }

    if (health.metrics.adherenceScore < 60) {
        reasons.push('Volume de estudo está significativamente abaixo da meta.');
    }

    if (health.metrics.recencyScore < 50) {
        reasons.push(`${health.raw.daysSinceLastStudy} dias sem contato com a matéria (risco de esquecimento).`);
    }

    if (health.metrics.performanceScore !== null && health.metrics.performanceScore < 60) {
        reasons.push(`Desempenho em questões (${health.metrics.performanceScore.toFixed(0)}%) abaixo do ideal.`);
    }

    if (window.urgencyMultiplier > 1.5) {
        reasons.push(`Proximidade da prova (Fase: ${window.examPhase.toUpperCase()}) aumenta a urgência.`);
    }

    // Add a reason for the top influencing factor if not already covered
    const topFactor = Object.entries(factors).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    if (topFactor === 'weight' && health.weight > 10 && reasons.length < 2) {
        reasons.push('Prioridade impulsionada pelo peso relativo no concurso.');
    }

    return reasons;
}

function scoreToBand(score: number): PriorityBand {
    if (score >= 80) return PriorityBand.Critical;
    if (score >= 60) return PriorityBand.High;
    if (score >= 40) return PriorityBand.Medium;
    if (score >= 20) return PriorityBand.Low;
    return PriorityBand.Optional;
}

/** @deprecated use calculateSubjectPriorityScore */
export function computeFullPriority(
    health: SubjectHealth,
    window: PlanningWindow,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
): number {
    return calculateSubjectPriorityScore(health, window, weights).score;
}
