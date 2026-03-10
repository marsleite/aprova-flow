import type { PlanEngineSnapshotV1 } from '@/application/dto/PlanEngineSnapshot';
import type {
  EngineDataSource,
  EngineQueryWindow,
  LoadPlanEngineContextResult,
} from '@/application/ports/EngineDataSource';
import {
  DEFAULT_ENGINE_POLICY,
  type EnginePolicy,
} from '@/domain/policies/engine-policy';
import { runPlanEngine } from '@/domain/services/PlanEngine';
import { toPlanEngineSnapshot } from '@/application/mappers/toPlanEngineSnapshot';

export interface GetPlanEngineSnapshotInput {
  userId: string;
  today: string;
  planId?: string | null;
  maxRecommendations?: number;
  window?: Partial<EngineQueryWindow>;
}

export type GetPlanEngineSnapshotResult =
  | {
      found: true;
      snapshot: PlanEngineSnapshotV1;
    }
  | Extract<LoadPlanEngineContextResult, { found: false }>;

function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function buildDefaultWindow(
  today: string,
  policy: EnginePolicy
): EngineQueryWindow {
  const recentStudyDays = Math.max(
    policy.health.windows.rollingVolumeDays,
    policy.health.windows.rollingFrequencyDays,
    policy.health.windows.noDataDays
  );
  const recentQuestionDays = Math.max(
    policy.health.windows.rollingPerformanceDays,
    policy.health.windows.noDataDays
  );

  return {
    studySessionsFrom: shiftIsoDate(today, -(recentStudyDays - 1)),
    questionSessionsFrom: shiftIsoDate(today, -(recentQuestionDays - 1)),
    allTimeStudySessionsFrom: '1900-01-01',
    allTimeQuestionSessionsFrom: '1900-01-01',
  };
}

export class GetPlanEngineSnapshot {
  constructor(
    private readonly dataSource: EngineDataSource,
    private readonly policy: EnginePolicy = DEFAULT_ENGINE_POLICY
  ) {}

  async execute(
    input: GetPlanEngineSnapshotInput
  ): Promise<GetPlanEngineSnapshotResult> {
    const defaultWindow = buildDefaultWindow(input.today, this.policy);
    const loaded = await this.dataSource.loadPlanEngineContext({
      userId: input.userId,
      today: input.today,
      planId: input.planId,
      window: {
        ...defaultWindow,
        ...input.window,
      },
    });

    if (!loaded.found) {
      return loaded;
    }

    const result = runPlanEngine(loaded.context, {
      policy: this.policy,
      recommendationLimit: input.maxRecommendations,
      recommendationTimestamp: input.today,
    });

    return {
      found: true,
      snapshot: toPlanEngineSnapshot(result, {
        maxRecommendations: input.maxRecommendations,
      }),
    };
  }
}
