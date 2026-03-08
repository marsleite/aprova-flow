/**
 * Domain Value Objects — AprovaMind Decision Engine
 *
 * Value objects encapsulate small concepts with behavior.
 * They are immutable and defined by their values, not identity.
 */

import { ExamPhase } from './enums';

// ─────────────────────────────────────────────
// Score — Clamped 0–100
// ─────────────────────────────────────────────

/**
 * Creates a score clamped between 0 and 100.
 */
export function clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

// ─────────────────────────────────────────────
// PlanningWindow
// ─────────────────────────────────────────────

export interface PlanningWindow {
    type: 'daily' | 'weekly' | 'sprint';
    startDate: string;
    endDate: string;
    availableHours: number;
    daysToExam: number | null;
    examPhase: ExamPhase;
    urgencyMultiplier: number;
}

const URGENCY_TABLE: Array<{ maxDays: number; multiplier: number; phase: ExamPhase }> = [
    { maxDays: 0, multiplier: 1.0, phase: ExamPhase.PostExam },
    { maxDays: 15, multiplier: 3.0, phase: ExamPhase.FinalPush },
    { maxDays: 30, multiplier: 2.2, phase: ExamPhase.Sprinting },
    { maxDays: 60, multiplier: 1.7, phase: ExamPhase.Consolidating },
    { maxDays: 90, multiplier: 1.3, phase: ExamPhase.Consolidating },
    { maxDays: Infinity, multiplier: 1.0, phase: ExamPhase.Building },
];

/**
 * Computes the urgency multiplier and exam phase from days remaining.
 */
export function computeUrgency(daysToExam: number | null): {
    multiplier: number;
    phase: ExamPhase;
} {
    if (daysToExam === null) {
        return { multiplier: 1.0, phase: ExamPhase.Building };
    }

    if (daysToExam < 0) {
        return { multiplier: 1.0, phase: ExamPhase.PostExam };
    }

    for (const tier of URGENCY_TABLE) {
        if (tier.maxDays === 0) continue; // skip post_exam sentinel
        if (daysToExam <= tier.maxDays) {
            return { multiplier: tier.multiplier, phase: tier.phase };
        }
    }

    return { multiplier: 1.0, phase: ExamPhase.Building };
}

/**
 * Creates a PlanningWindow from dates and an optional exam date.
 */
export function createPlanningWindow(params: {
    type: 'daily' | 'weekly' | 'sprint';
    startDate: string;
    endDate: string;
    availableHours: number;
    examDate: string | null;
    today: string;
}): PlanningWindow {
    let daysToExam: number | null = null;

    if (params.examDate) {
        const examMs = new Date(params.examDate).getTime();
        const todayMs = new Date(params.today).getTime();
        daysToExam = Math.ceil((examMs - todayMs) / (1000 * 60 * 60 * 24));
    }

    const { multiplier, phase } = computeUrgency(daysToExam);

    return {
        type: params.type,
        startDate: params.startDate,
        endDate: params.endDate,
        availableHours: params.availableHours,
        daysToExam,
        examPhase: phase,
        urgencyMultiplier: multiplier,
    };
}

// ─────────────────────────────────────────────
// Days Between Dates
// ─────────────────────────────────────────────

/**
 * Calculates the number of calendar days between two YYYY-MM-DD strings.
 * Returns 0 if the dates are the same.
 */
export function daysBetween(dateA: string, dateB: string): number {
    const a = new Date(dateA).getTime();
    const b = new Date(dateB).getTime();
    return Math.abs(Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

// ─────────────────────────────────────────────
// Urgency Factor for Portfolio
// ─────────────────────────────────────────────

const URGENCY_FACTOR_TABLE: Array<{ maxDays: number; factor: number }> = [
    { maxDays: 15, factor: 100 },
    { maxDays: 30, factor: 85 },
    { maxDays: 60, factor: 65 },
    { maxDays: 90, factor: 45 },
    { maxDays: 180, factor: 25 },
    { maxDays: Infinity, factor: 10 },
];

/**
 * Computes the urgency factor (0–100) for portfolio-level prioritization.
 * Returns 15 if no exam date is set.
 */
export function computeUrgencyFactor(daysToExam: number | null): number {
    if (daysToExam === null) return 15;
    if (daysToExam < 0) return 5; // exam passed

    for (const tier of URGENCY_FACTOR_TABLE) {
        if (daysToExam <= tier.maxDays) return tier.factor;
    }

    return 10;
}
