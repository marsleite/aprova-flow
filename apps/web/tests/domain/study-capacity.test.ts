import { describe, expect, it } from 'vitest';
import {
  buildDefaultStudyCapacityHours,
  getStudyPlanCoverageProjection,
  sumStudyCapacityHours,
} from '@/lib/plans/studyCapacity';

describe('study capacity planning', () => {
  it('builds a default daily capacity that matches the weekly goal', () => {
    const capacity = buildDefaultStudyCapacityHours(14);

    expect(sumStudyCapacityHours(capacity)).toBe(14);
    expect(capacity.monday).toBeGreaterThan(0);
    expect(capacity.sunday).toBeGreaterThan(0);
  });

  it('marks the plan as attention when the student has capacity but the weekly goal is below the needed pace', () => {
    const projection = getStudyPlanCoverageProjection({
      weeklyGoalHours: 10,
      examDate: '2026-04-19',
      materialWorkloadHours: 50,
      studyCapacityHours: {
        monday: 2.5,
        tuesday: 2.5,
        wednesday: 2.5,
        thursday: 2.5,
        friday: 2.5,
        saturday: 0,
        sunday: 0,
      },
    }, new Date('2026-03-20T12:00:00.000Z'));

    expect(projection.status).toBe('attention');
    expect(projection.requiredWeeklyHours).toBeGreaterThan(10);
    expect(projection.weeklyCapacityHours).toBeGreaterThan(
      projection.requiredWeeklyHours || 0
    );
  });

  it('marks the plan as critical when availability cannot cover the workload', () => {
    const projection = getStudyPlanCoverageProjection({
      weeklyGoalHours: 8,
      examDate: '2026-04-03',
      materialWorkloadHours: 120,
      studyCapacityHours: {
        monday: 1,
        tuesday: 1,
        wednesday: 1,
        thursday: 1,
        friday: 1,
        saturday: 0,
        sunday: 0,
      },
    }, new Date('2026-03-20T12:00:00.000Z'));

    expect(projection.status).toBe('critical');
    expect(projection.maximumCoveragePercent).toBeLessThan(100);
  });
});
