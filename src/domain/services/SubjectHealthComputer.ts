/**
 * SubjectHealthComputer — AprovaMind Decision Engine
 *
 * Determinisitc engine that computes SubjectHealth based on 5 sub-scores:
 * Volume, Frequency, Adherence, Recency, and Performance.
 *
 * Rules defined in: saude_da_materia_regras.md
 */

import {
    SubjectHealthStatus,
    SubjectStrategicState,
    AccuracyTrend,
    PriorityBand,
} from '../enums';
import type {
    SubjectHealth,
    SubjectHealthMetrics,
    AggregatedMetrics,
    PlanEngineContext,
    StudySessionInput,
    QuestionSessionInput,
} from '../types';
import { clampScore, daysBetween } from '../value-objects';

// ─────────────────────────────────────────────
// Constants & Thresholds
// ─────────────────────────────────────────────

const MIN_QUESTIONS_FOR_PERFORMANCE = 15;
const FREQUENCY_WINDOW_DAYS = 14;

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Computes SubjectHealth for every subject in the plan.
 */
export function computeAllSubjectHealth(ctx: PlanEngineContext): SubjectHealth[] {
    const { plan, today } = ctx;

    return plan.subjects.map((subjectPlan) => {
        return calculateSubjectHealth(
            subjectPlan.subject,
            subjectPlan.weight,
            subjectPlan.priorityOverride,
            plan.planId,
            plan.weeklyGoalHours,
            ctx.sessions,
            ctx.questions,
            ctx.allTimeSessions,
            ctx.allTimeQuestions,
            today,
        );
    });
}

/**
 * The core domain function to calculate subject health.
 * Pure and auditable.
 */
export function calculateSubjectHealth(
    subject: string,
    weight: number,
    priorityOverride: number | null,
    planId: string,
    weeklyGoalHours: number,
    recentSessions: StudySessionInput[],
    recentQuestions: QuestionSessionInput[],
    allTimeSessions: StudySessionInput[],
    allTimeQuestions: QuestionSessionInput[],
    today: string,
): SubjectHealth {
    // 1. Filter data
    const subjectSessions = recentSessions.filter((s) => s.subject === subject);
    const subjectQuestions = recentQuestions.filter((q) => q.subject === subject);
    const allSubjectSessions = allTimeSessions.filter((s) => s.subject === subject);
    const allSubjectQuestions = allTimeQuestions.filter((q) => q.subject === subject);

    // 2. Compute raw metrics
    const raw = computeAggregatedMetrics(
        subject,
        subjectSessions,
        subjectQuestions,
        allSubjectSessions,
        allSubjectQuestions,
        weeklyGoalHours,
        weight,
        today,
    );

    // 3. Compute sub-scores (0-100/150)
    const metrics = computeSubScores(raw, weight);

    // 4. Determine Status & State
    const { status, strategicState } = determineStatusAndState(metrics, raw, weight);

    // 5. Compute Priority (simplified for now, refined by PriorityCalculator)
    const priorityScore = priorityOverride !== null
        ? clampScore((6 - priorityOverride) * 20)
        : computeInitialPriority(metrics, weight);

    return {
        subject,
        planId,
        weight,
        status,
        strategicState,
        metrics,
        raw,
        priority: {
            score: priorityScore,
            band: scoreToBand(priorityScore),
            influencingFactors: {
                weight: 0,
                deviation: 0,
                recency: 0,
                accuracy: 0,
                proximity: 0,
            },
            reasons: [],
        },
        priorityScore,
        priorityBand: scoreToBand(priorityScore),
    };
}

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

function computeAggregatedMetrics(
    subject: string,
    sessions: StudySessionInput[],
    questions: QuestionSessionInput[],
    allSessions: StudySessionInput[],
    allQuestions: QuestionSessionInput[],
    weeklyGoalHours: number,
    weight: number,
    today: string,
): AggregatedMetrics {
    const weeklyTargetHours = (weight / 100) * weeklyGoalHours;
    const weeklyActualHours = computeWeeklyHours(sessions, today);

    const daysSinceLastStudy = sessions.length > 0
        ? daysBetween([...sessions].sort((a, b) => b.date.localeCompare(a.date))[0].date, today)
        : 999;

    const daysSinceLastQuestion = questions.length > 0
        ? daysBetween([...questions].sort((a, b) => b.date.localeCompare(a.date))[0].date, today)
        : null;

    const recentTotalQs = questions.reduce((sum, q) => sum + q.totalQuestions, 0);
    const recentCorrects = questions.reduce((sum, q) => sum + q.correctAnswers, 0);
    const recentAccuracy = recentTotalQs >= MIN_QUESTIONS_FOR_PERFORMANCE
        ? (recentCorrects / recentTotalQs) * 100
        : null;

    return {
        weeklyActualHours,
        weeklyTargetHours,
        daysSinceLastStudy,
        daysSinceLastQuestion,
        recentAccuracy,
        recentQuestionsCount: recentTotalQs,
        totalHoursAllTime: allSessions.reduce((sum, s) => sum + s.durationSeconds / 3600, 0),
        totalQuestionsAllTime: allQuestions.reduce((sum, q) => sum + q.totalQuestions, 0),
    };
}

function computeSubScores(raw: AggregatedMetrics, weight: number): SubjectHealthMetrics {
    // Volume: (Actual / Target) * 100. Cap at 150.
    const volumeScore = raw.weeklyTargetHours > 0
        ? Math.min(150, (raw.weeklyActualHours / raw.weeklyTargetHours) * 100)
        : (raw.weeklyActualHours > 0 ? 100 : 0);

    // Frequency: Days with study in last 14 days / Ideal contacts
    // Ideal contacts heuristic: weight > 15% -> 5 days, > 10% -> 4 days, > 5% -> 3 days, else 2 days.
    const idealContacts = weight > 15 ? 5 : weight > 10 ? 4 : weight > 5 ? 3 : 2;
    // This is a simplified frequency check based on daysSinceLastStudy and session count for brevity
    const frequencyScore = clampScore((volumeScore / 100) * 100); // Simplified for MVP

    // Adherence: Closeness to target weight share
    const adherenceScore = clampScore(100 - Math.abs(volumeScore - 100));

    // Recency: Decays after safety limit
    const limit = weight > 10 ? 3 : weight > 5 ? 5 : 7;
    const recencyScore = raw.daysSinceLastStudy <= limit
        ? 100
        : clampScore(100 - (raw.daysSinceLastStudy - limit) * 15);

    // Performance: Pure accuracy
    const performanceScore = raw.recentAccuracy;

    // Overall: Weighted average
    let overallScore = 0;
    if (performanceScore !== null) {
        // Scenario B: With performance data
        overallScore = clampScore(
            performanceScore * 0.35 +
            Math.min(100, volumeScore) * 0.25 +
            adherenceScore * 0.20 +
            recencyScore * 0.10 +
            frequencyScore * 0.10
        );
    } else {
        // Scenario A: Effort based
        overallScore = clampScore(
            Math.min(100, volumeScore) * 0.40 +
            adherenceScore * 0.30 +
            recencyScore * 0.20 +
            frequencyScore * 0.10
        );
    }

    return {
        volumeScore,
        frequencyScore,
        adherenceScore,
        recencyScore,
        performanceScore,
        overallScore,
    };
}

function determineStatusAndState(
    metrics: SubjectHealthMetrics,
    raw: AggregatedMetrics,
    weight: number,
): { status: SubjectHealthStatus; strategicState: SubjectStrategicState } {
    const { overallScore, volumeScore, performanceScore, recencyScore } = metrics;

    // 1. Neglected (by recency)
    const neglectLimit = weight > 10 ? 7 : 10;
    if (raw.daysSinceLastStudy >= neglectLimit && raw.totalHoursAllTime > 0) {
        return { status: SubjectHealthStatus.Neglected, strategicState: SubjectStrategicState.Recovery };
    }

    // 2. Inefficient (High effort, low result)
    if (volumeScore >= 100 && performanceScore !== null && performanceScore < 60) {
        return { status: SubjectHealthStatus.Inefficient, strategicState: SubjectStrategicState.Recovery };
    }

    // 3. Blind Spot (Theory only)
    if (volumeScore >= 80 && performanceScore === null) {
        return { status: SubjectHealthStatus.BlindSpot, strategicState: SubjectStrategicState.ActiveGrowth };
    }

    // 4. Mature
    if (overallScore >= 80 && performanceScore !== null && performanceScore >= 80) {
        return { status: SubjectHealthStatus.Mature, strategicState: SubjectStrategicState.Maintenance };
    }

    // 5. Healthy
    if (overallScore >= 70) {
        return { status: SubjectHealthStatus.Healthy, strategicState: SubjectStrategicState.ActiveGrowth };
    }

    // 6. Warning
    if (overallScore >= 50) {
        return { status: SubjectHealthStatus.Warning, strategicState: SubjectStrategicState.ActiveGrowth };
    }

    // 7. No Data
    if (raw.totalHoursAllTime === 0) {
        return { status: SubjectHealthStatus.NoData, strategicState: SubjectStrategicState.ActiveGrowth };
    }

    // 8. Critical
    return { status: SubjectHealthStatus.Critical, strategicState: SubjectStrategicState.Recovery };
}

function computeWeeklyHours(sessions: StudySessionInput[], today: string): number {
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() - mondayOffset);
    const mondayStr = monday.toISOString().slice(0, 10);

    return sessions
        .filter((s) => s.date >= mondayStr && s.date <= today)
        .reduce((sum, s) => sum + s.durationSeconds / 3600, 0);
}

function computeInitialPriority(metrics: SubjectHealthMetrics, weight: number): number {
    const deficit = 100 - metrics.overallScore;
    const recencyPenalty = 100 - metrics.recencyScore;

    return clampScore(
        deficit * 0.40 +
        weight * 0.30 +
        recencyPenalty * 0.20
    );
}

function scoreToBand(score: number): PriorityBand {
    if (score >= 80) return PriorityBand.Critical;
    if (score >= 60) return PriorityBand.High;
    if (score >= 40) return PriorityBand.Medium;
    if (score >= 20) return PriorityBand.Low;
    return PriorityBand.Optional;
}
