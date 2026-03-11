/**
 * SubjectHealthComputer — AprovaMind Decision Engine
 *
 * Computes SubjectHealth from policy-driven, deterministic rules.
 * All thresholds and weighting come from engine-policy.ts.
 */

import {
    SubjectHealthStatus,
    SubjectStrategicState,
    PriorityBand,
} from '../enums';
import {
    DEFAULT_ENGINE_POLICY,
    resolvePriorityBand,
    resolveTierValue,
    type EnginePolicy,
} from '../policies/engine-policy';
import type {
    SubjectHealth,
    SubjectHealthMetrics,
    AggregatedMetrics,
    PlanEngineContext,
    StudySessionInput,
    QuestionSessionInput,
} from '../types';
import { clampScore, daysBetween } from '../value-objects';

function shiftIsoDate(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    utcDate.setUTCDate(utcDate.getUTCDate() + days);
    return utcDate.toISOString().slice(0, 10);
}

function sumStudyHours(sessions: StudySessionInput[]): number {
    return sessions.reduce((sum, session) => sum + session.durationSeconds / 3600, 0);
}

function countDistinctStudyDays(sessions: StudySessionInput[]): number {
    return new Set(sessions.map((session) => session.date)).size;
}

function latestDate<T extends { date: string }>(items: T[]): string | null {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}

function filterStudySessions(
    sessions: StudySessionInput[],
    startDate: string,
    endDate: string,
    minDurationSeconds: number
): StudySessionInput[] {
    return sessions.filter((session) =>
        session.durationSeconds >= minDurationSeconds &&
        session.date >= startDate &&
        session.date <= endDate
    );
}

function filterQuestionSessions(
    questions: QuestionSessionInput[],
    startDate: string,
    endDate: string,
    minQuestions: number
): QuestionSessionInput[] {
    return questions.filter((session) =>
        session.totalQuestions >= minQuestions &&
        session.date >= startDate &&
        session.date <= endDate
    );
}

function strategicStateForStatus(status: SubjectHealthStatus): SubjectStrategicState {
    if (
        status === SubjectHealthStatus.Critical ||
        status === SubjectHealthStatus.Neglected ||
        status === SubjectHealthStatus.Inefficient
    ) {
        return SubjectStrategicState.Recovery;
    }

    if (status === SubjectHealthStatus.Mature) {
        return SubjectStrategicState.Maintenance;
    }

    return SubjectStrategicState.ActiveGrowth;
}

export function computeAllSubjectHealth(
    ctx: PlanEngineContext,
    policy: EnginePolicy = DEFAULT_ENGINE_POLICY
): SubjectHealth[] {
    const { plan, today } = ctx;

    return plan.subjects.map((subjectPlan) =>
        calculateSubjectHealth(
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
            policy,
        )
    );
}

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
    policy: EnginePolicy = DEFAULT_ENGINE_POLICY,
): SubjectHealth {
    const subjectRecentSessions = recentSessions.filter((session) => session.subject === subject);
    const subjectRecentQuestions = recentQuestions.filter((question) => question.subject === subject);
    const subjectAllTimeSessions = allTimeSessions.filter((session) => session.subject === subject);
    const subjectAllTimeQuestions = allTimeQuestions.filter((question) => question.subject === subject);

    const raw = computeAggregatedMetrics(
        subjectRecentSessions,
        subjectRecentQuestions,
        recentSessions,
        subjectAllTimeSessions,
        subjectAllTimeQuestions,
        weeklyGoalHours,
        weight,
        today,
        policy,
    );

    const metrics = computeSubScores(raw, weight, policy);
    const status = determineStatus(metrics, raw, weight, policy);
    const strategicState = strategicStateForStatus(status);
    const priorityScore =
        priorityOverride !== null ? clampScore((6 - priorityOverride) * 20) : 0;
    const priorityBand =
        priorityOverride !== null
            ? resolvePriorityBand(priorityScore, policy)
            : PriorityBand.Optional;

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
            band: priorityBand,
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
        priorityBand,
    };
}

function computeAggregatedMetrics(
    subjectSessions: StudySessionInput[],
    subjectQuestions: QuestionSessionInput[],
    allRecentSessions: StudySessionInput[],
    allSubjectSessions: StudySessionInput[],
    allSubjectQuestions: QuestionSessionInput[],
    weeklyGoalHours: number,
    weight: number,
    today: string,
    policy: EnginePolicy,
): AggregatedMetrics {
    const volumeWindowStart = shiftIsoDate(
        today,
        -(policy.health.windows.rollingVolumeDays - 1)
    );
    const frequencyWindowStart = shiftIsoDate(
        today,
        -(policy.health.windows.rollingFrequencyDays - 1)
    );
    const performanceWindowStart = shiftIsoDate(
        today,
        -(policy.health.windows.rollingPerformanceDays - 1)
    );

    const filteredRecentSessions = filterStudySessions(
        allRecentSessions,
        volumeWindowStart,
        today,
        policy.health.sample.minStudySessionSeconds,
    );
    const filteredSubjectRecentSessions = filterStudySessions(
        subjectSessions,
        volumeWindowStart,
        today,
        policy.health.sample.minStudySessionSeconds,
    );
    const filteredSubjectFrequencySessions = filterStudySessions(
        subjectSessions,
        frequencyWindowStart,
        today,
        policy.health.sample.minStudySessionSeconds,
    );
    const filteredSubjectRecentQuestions = filterQuestionSessions(
        subjectQuestions,
        performanceWindowStart,
        today,
        policy.health.sample.minQuestionSessionQuestions,
    );
    const filteredAllSubjectSessions = allSubjectSessions.filter(
        (session) =>
            session.durationSeconds >= policy.health.sample.minStudySessionSeconds
    );
    const filteredAllSubjectQuestions = allSubjectQuestions.filter(
        (question) =>
            question.totalQuestions >= policy.health.sample.minQuestionSessionQuestions
    );

    const weeklyTargetHours = (weight / 100) * weeklyGoalHours;
    const weeklyActualHours = sumStudyHours(filteredSubjectRecentSessions);
    const weeklyTotalHours = sumStudyHours(filteredRecentSessions);
    const targetSharePercent = weight;
    const actualSharePercent =
        weeklyTotalHours > 0 ? (weeklyActualHours / weeklyTotalHours) * 100 : 0;
    const deviationPercent =
        weeklyTargetHours > 0
            ? ((weeklyActualHours - weeklyTargetHours) / weeklyTargetHours) * 100
            : 0;

    const recentQuestionsCount = filteredSubjectRecentQuestions.reduce(
        (sum, question) => sum + question.totalQuestions,
        0
    );
    const recentCorrectAnswers = filteredSubjectRecentQuestions.reduce(
        (sum, question) => sum + question.correctAnswers,
        0
    );
    const recentAccuracy =
        recentQuestionsCount >= policy.health.sample.minQuestionsForPerformance
            ? (recentCorrectAnswers / recentQuestionsCount) * 100
            : null;

    const lastStudyDate = latestDate(filteredAllSubjectSessions);
    const lastQuestionDate = latestDate(filteredAllSubjectQuestions);

    return {
        weeklyActualHours,
        weeklyTargetHours,
        weeklyTotalHours,
        actualSharePercent,
        targetSharePercent,
        deviationPercent,
        distinctStudyDays: countDistinctStudyDays(filteredSubjectFrequencySessions),
        daysSinceLastStudy: lastStudyDate ? daysBetween(lastStudyDate, today) : 999,
        daysSinceLastQuestion: lastQuestionDate
            ? daysBetween(lastQuestionDate, today)
            : null,
        recentAccuracy,
        totalHoursAllTime: sumStudyHours(filteredAllSubjectSessions),
        totalQuestionsAllTime: filteredAllSubjectQuestions.reduce(
            (sum, question) => sum + question.totalQuestions,
            0
        ),
        recentQuestionsCount,
    };
}

function computeSubScores(
    raw: AggregatedMetrics,
    weight: number,
    policy: EnginePolicy,
): SubjectHealthMetrics {
    const volumeScore =
        raw.weeklyTargetHours > 0
            ? Math.min(150, (raw.weeklyActualHours / raw.weeklyTargetHours) * 100)
            : raw.weeklyActualHours > 0
                ? 100
                : 0;

    const idealContacts = resolveTierValue(
        weight,
        policy.health.frequency.idealContactsByWeight
    );
    const frequencyScore = clampScore(
        (raw.distinctStudyDays / idealContacts) * 100
    );

    const shareDelta = Math.abs(raw.actualSharePercent - raw.targetSharePercent);
    const adherencePenalty =
        raw.actualSharePercent < raw.targetSharePercent
            ? policy.health.adherence.understudyPenaltyMultiplier
            : policy.health.adherence.overstudyPenaltyMultiplier;
    const adherenceScore = clampScore(100 - shareDelta * adherencePenalty);

    const safetyLimit = resolveTierValue(
        weight,
        policy.health.recency.safetyLimitDaysByWeight
    );
    const recencyScore =
        raw.daysSinceLastStudy <= safetyLimit
            ? 100
            : clampScore(
                100 -
                    (raw.daysSinceLastStudy - safetyLimit) *
                        policy.health.recency.scoreDecayPerExtraDay
            );

    const performanceScore = raw.recentAccuracy;

    const cappedVolume = Math.min(100, volumeScore);
    const overallScore =
        performanceScore !== null
            ? clampScore(
                performanceScore * policy.health.scoreWeights.withPerformance.performance +
                    cappedVolume * policy.health.scoreWeights.withPerformance.volume +
                    adherenceScore * policy.health.scoreWeights.withPerformance.adherence +
                    recencyScore * policy.health.scoreWeights.withPerformance.recency +
                    frequencyScore * policy.health.scoreWeights.withPerformance.frequency
            )
            : clampScore(
                cappedVolume * policy.health.scoreWeights.withoutPerformance.volume +
                    adherenceScore * policy.health.scoreWeights.withoutPerformance.adherence +
                    recencyScore * policy.health.scoreWeights.withoutPerformance.recency +
                    frequencyScore * policy.health.scoreWeights.withoutPerformance.frequency
            );

    return {
        volumeScore,
        frequencyScore,
        adherenceScore,
        recencyScore,
        performanceScore,
        overallScore,
    };
}

function determineStatus(
    metrics: SubjectHealthMetrics,
    raw: AggregatedMetrics,
    weight: number,
    policy: EnginePolicy,
): SubjectHealthStatus {
    const thresholds = policy.health.statusThresholds;

    if (
        raw.totalHoursAllTime === 0 &&
        raw.totalQuestionsAllTime === 0
    ) {
        return SubjectHealthStatus.NoData;
    }

    if (raw.daysSinceLastStudy > thresholds.noDataMaxRecentStudyDays) {
        return SubjectHealthStatus.NoData;
    }

    const neglectLimit =
        weight >= thresholds.neglectedMinWeightForShortRecencyWindow
            ? thresholds.neglectedMaxDaysSinceStudyHighWeight
            : thresholds.neglectedMaxDaysSinceStudyDefault;

    if (raw.daysSinceLastStudy >= neglectLimit && raw.totalHoursAllTime > 0) {
        return SubjectHealthStatus.Neglected;
    }

    if (
        metrics.volumeScore >= thresholds.inefficientMinVolume &&
        metrics.performanceScore !== null &&
        raw.recentQuestionsCount >= policy.health.sample.minQuestionsForInefficiency &&
        metrics.performanceScore < thresholds.inefficientMaxPerformance
    ) {
        return SubjectHealthStatus.Inefficient;
    }

    if (
        metrics.volumeScore >= thresholds.blindSpotMinVolume &&
        metrics.performanceScore === null
    ) {
        return SubjectHealthStatus.BlindSpot;
    }

    if (
        metrics.overallScore >= thresholds.matureMinOverall &&
        metrics.performanceScore !== null &&
        metrics.performanceScore >= thresholds.matureMinPerformance
    ) {
        return SubjectHealthStatus.Mature;
    }

    if (metrics.overallScore >= thresholds.healthyMinOverall) {
        return SubjectHealthStatus.Healthy;
    }

    if (
        (metrics.overallScore <= thresholds.criticalMaxOverall &&
            weight >= thresholds.criticalMinWeight) ||
        raw.deviationPercent <= -thresholds.criticalMinNegativeDeviation ||
        raw.daysSinceLastStudy >= thresholds.criticalMaxDaysSinceStudy
    ) {
        return SubjectHealthStatus.Critical;
    }

    if (metrics.overallScore >= thresholds.warningMinOverall) {
        return SubjectHealthStatus.Warning;
    }

    return SubjectHealthStatus.Warning;
}
