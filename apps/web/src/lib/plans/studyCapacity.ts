import type { StudyCapacityDay, StudyCapacityHours, StudyPlanEdital } from '@/types';

export const STUDY_CAPACITY_DAY_ORDER: StudyCapacityDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_INDEX_TO_CAPACITY_DAY: StudyCapacityDay[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const STUDY_CAPACITY_DAY_LABELS: Record<StudyCapacityDay, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sab',
  sunday: 'Dom',
};

export const STUDY_CAPACITY_DAY_FULL_LABELS: Record<StudyCapacityDay, string> = {
  monday: 'Segunda',
  tuesday: 'Terca',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sabado',
  sunday: 'Domingo',
};

const MAX_DAILY_HOURS = 16;

function roundHours(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampHours(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return roundHours(Math.max(0, Math.min(MAX_DAILY_HOURS, parsed)));
}

function buildEmptyCapacity(): StudyCapacityHours {
  return {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  };
}

export function buildDefaultStudyCapacityHours(weeklyGoalHours: number): StudyCapacityHours {
  const safeWeeklyGoal = roundHours(Math.max(0, Math.min(112, weeklyGoalHours)));
  if (safeWeeklyGoal <= 0) return buildEmptyCapacity();

  const basePerDay = roundHours(safeWeeklyGoal / STUDY_CAPACITY_DAY_ORDER.length);
  const capacity = buildEmptyCapacity();

  for (const day of STUDY_CAPACITY_DAY_ORDER) {
    capacity[day] = basePerDay;
  }

  const currentTotal = sumStudyCapacityHours(capacity);
  const remainder = roundHours(safeWeeklyGoal - currentTotal);
  if (remainder !== 0) {
    capacity.monday = clampHours(capacity.monday + remainder, capacity.monday);
  }

  return capacity;
}

export function normalizeStudyCapacityHours(
  raw: unknown,
  weeklyGoalHours: number
): StudyCapacityHours {
  const fallback = buildDefaultStudyCapacityHours(weeklyGoalHours);

  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  let hasAnyValue = false;
  const normalized = buildEmptyCapacity();

  for (const day of STUDY_CAPACITY_DAY_ORDER) {
    const value = (raw as Record<string, unknown>)[day];
    if (value != null) hasAnyValue = true;
    normalized[day] = clampHours(value, fallback[day]);
  }

  return hasAnyValue ? normalized : fallback;
}

export function sumStudyCapacityHours(capacity?: StudyCapacityHours | null): number {
  if (!capacity) return 0;

  return roundHours(
    STUDY_CAPACITY_DAY_ORDER.reduce((total, day) => total + clampHours(capacity[day], 0), 0)
  );
}

export function getStudyCapacityHoursForDate(
  capacity?: StudyCapacityHours | null,
  date: Date = new Date()
): number {
  if (!capacity) return 0;
  const day = DAY_INDEX_TO_CAPACITY_DAY[date.getDay()];
  return clampHours(capacity[day], 0);
}

export interface AvailableStudyDay {
  key: StudyCapacityDay;
  shortLabel: string;
  fullLabel: string;
  availableHours: number;
}

export function buildAvailableStudyDays(
  capacity?: StudyCapacityHours | null,
  weeklyGoalHours = 0
): AvailableStudyDay[] {
  const normalized = normalizeStudyCapacityHours(capacity, weeklyGoalHours);

  return STUDY_CAPACITY_DAY_ORDER.map((day) => ({
    key: day,
    shortLabel: STUDY_CAPACITY_DAY_LABELS[day],
    fullLabel: STUDY_CAPACITY_DAY_FULL_LABELS[day],
    availableHours: normalized[day],
  })).filter((item) => item.availableHours > 0);
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type StudyPlanProjectionStatus =
  | 'missing_deadline'
  | 'missing_workload'
  | 'healthy'
  | 'attention'
  | 'critical';

export interface StudyPlanCoverageProjection {
  status: StudyPlanProjectionStatus;
  weeklyCapacityHours: number;
  plannedWeeklyHours: number;
  todayAvailableHours: number;
  daysUntilExam: number | null;
  weeksUntilExam: number | null;
  materialWorkloadHours: number | null;
  requiredWeeklyHours: number | null;
  availableHoursUntilExam: number | null;
  plannedHoursUntilExam: number | null;
  plannedCoveragePercent: number | null;
  maximumCoveragePercent: number | null;
  recommendedWeeklyHours: number | null;
}

export function getStudyPlanCoverageProjection(
  plan?: Pick<
    StudyPlanEdital,
    'weeklyGoalHours' | 'examDate' | 'materialWorkloadHours' | 'studyCapacityHours'
  > | null,
  now: Date = new Date()
): StudyPlanCoverageProjection {
  const plannedWeeklyHours = roundHours(Math.max(0, Number(plan?.weeklyGoalHours ?? 0)));
  const weeklyCapacityHours = sumStudyCapacityHours(
    normalizeStudyCapacityHours(plan?.studyCapacityHours, plannedWeeklyHours)
  );
  const todayAvailableHours = getStudyCapacityHoursForDate(
    normalizeStudyCapacityHours(plan?.studyCapacityHours, plannedWeeklyHours),
    now
  );
  const materialWorkloadHours =
    plan?.materialWorkloadHours != null && Number.isFinite(Number(plan.materialWorkloadHours))
      ? roundHours(Math.max(0, Number(plan.materialWorkloadHours)))
      : null;

  if (!plan?.examDate) {
    return {
      status: 'missing_deadline',
      weeklyCapacityHours,
      plannedWeeklyHours,
      todayAvailableHours,
      daysUntilExam: null,
      weeksUntilExam: null,
      materialWorkloadHours,
      requiredWeeklyHours: null,
      availableHoursUntilExam: null,
      plannedHoursUntilExam: null,
      plannedCoveragePercent: null,
      maximumCoveragePercent: null,
      recommendedWeeklyHours: null,
    };
  }

  const examDate = parseDateOnly(plan.examDate);
  if (!examDate) {
    return {
      status: 'missing_deadline',
      weeklyCapacityHours,
      plannedWeeklyHours,
      todayAvailableHours,
      daysUntilExam: null,
      weeksUntilExam: null,
      materialWorkloadHours,
      requiredWeeklyHours: null,
      availableHoursUntilExam: null,
      plannedHoursUntilExam: null,
      plannedCoveragePercent: null,
      maximumCoveragePercent: null,
      recommendedWeeklyHours: null,
    };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / millisecondsPerDay);
  const safeDaysUntilExam = Math.max(0, diffDays);
  const weeksUntilExam =
    safeDaysUntilExam > 0 ? roundHours(safeDaysUntilExam / 7) : 0;

  if (!materialWorkloadHours || materialWorkloadHours <= 0) {
    return {
      status: 'missing_workload',
      weeklyCapacityHours,
      plannedWeeklyHours,
      todayAvailableHours,
      daysUntilExam: safeDaysUntilExam,
      weeksUntilExam,
      materialWorkloadHours: null,
      requiredWeeklyHours: null,
      availableHoursUntilExam: null,
      plannedHoursUntilExam: null,
      plannedCoveragePercent: null,
      maximumCoveragePercent: null,
      recommendedWeeklyHours: null,
    };
  }

  const effectiveWeeks = weeksUntilExam > 0 ? weeksUntilExam : 1 / 7;
  const requiredWeeklyHours = roundHours(materialWorkloadHours / effectiveWeeks);
  const availableHoursUntilExam = roundHours(weeklyCapacityHours * effectiveWeeks);
  const plannedHoursUntilExam = roundHours(plannedWeeklyHours * effectiveWeeks);
  const plannedCoveragePercent = roundHours((plannedHoursUntilExam / materialWorkloadHours) * 100);
  const maximumCoveragePercent = roundHours((availableHoursUntilExam / materialWorkloadHours) * 100);

  let status: StudyPlanProjectionStatus;
  if (safeDaysUntilExam === 0) {
    status = 'critical';
  } else if (weeklyCapacityHours + 0.1 < requiredWeeklyHours) {
    status = 'critical';
  } else if (plannedWeeklyHours + 0.1 < requiredWeeklyHours) {
    status = 'attention';
  } else {
    status = 'healthy';
  }

  return {
    status,
    weeklyCapacityHours,
    plannedWeeklyHours,
    todayAvailableHours,
    daysUntilExam: safeDaysUntilExam,
    weeksUntilExam,
    materialWorkloadHours,
    requiredWeeklyHours,
    availableHoursUntilExam,
    plannedHoursUntilExam,
    plannedCoveragePercent,
    maximumCoveragePercent,
    recommendedWeeklyHours: requiredWeeklyHours,
  };
}
