import { describe, expect, it } from 'vitest';
import type {
  EngineDataSource,
  LoadPlanEngineContextParams,
  LoadPlanEngineContextResult,
  LoadAllPlanEngineContextsParams,
  LoadAllPlanEngineContextsResult,
} from '@/application/ports/EngineDataSource';
import { GetPlanEngineSnapshot } from '@/application/use-cases/engine/GetPlanEngineSnapshot';
import { getCanonicalScenario } from '../../domain/fixtures/canonical';

class StubEngineDataSource implements EngineDataSource {
  constructor(
    private readonly resolver: (
      params: LoadPlanEngineContextParams
    ) => Promise<LoadPlanEngineContextResult>
  ) { }

  loadPlanEngineContext(
    params: LoadPlanEngineContextParams
  ): Promise<LoadPlanEngineContextResult> {
    return this.resolver(params);
  }

  loadAllPlanEngineContexts(
    params: LoadAllPlanEngineContextsParams
  ): Promise<LoadAllPlanEngineContextsResult> {
    return Promise.resolve({ found: true, contexts: [] });
  }
}

describe('GetPlanEngineSnapshot', () => {
  it('loads the context through the port and returns a minimal snapshot', async () => {
    const scenario = getCanonicalScenario('healthy');
    const dataSource = new StubEngineDataSource(async () => ({
      found: true,
      context: scenario.context,
    }));

    const useCase = new GetPlanEngineSnapshot(dataSource);
    const result = await useCase.execute({
      userId: 'user-1',
      today: scenario.context.today,
      maxRecommendations: 1,
    });

    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.snapshot.engineVersion).toBeTruthy();
    expect(result.snapshot.plan.planId).toBe(scenario.context.plan.planId);
    expect(result.snapshot.subjects).toHaveLength(1);
    expect(result.snapshot.subjects[0].subject).toBe('Direito Constitucional');
    expect(typeof result.snapshot.subjects[0].priorityScore).toBe('number');
    expect(result.snapshot.recommendations).toHaveLength(1);
  });

  it('passes through not-found responses from the data source', async () => {
    const dataSource = new StubEngineDataSource(async () => ({
      found: false,
      reason: 'no_active_plan',
    }));

    const useCase = new GetPlanEngineSnapshot(dataSource);
    const result = await useCase.execute({
      userId: 'user-1',
      today: '2026-03-08',
    });

    expect(result).toEqual({
      found: false,
      reason: 'no_active_plan',
    });
  });

  it('builds a default window from engine policy when no window is provided', async () => {
    let receivedWindow: LoadPlanEngineContextParams['window'] | null = null;
    const scenario = getCanonicalScenario('healthy');

    const dataSource = new StubEngineDataSource(async (params) => {
      receivedWindow = params.window;
      return {
        found: true,
        context: scenario.context,
      };
    });

    const useCase = new GetPlanEngineSnapshot(dataSource);
    await useCase.execute({
      userId: 'user-1',
      today: '2026-03-08',
    });

    expect(receivedWindow).toEqual({
      studySessionsFrom: '2026-02-07',
      questionSessionsFrom: '2026-02-07',
      allTimeStudySessionsFrom: '1900-01-01',
      allTimeQuestionSessionsFrom: '1900-01-01',
    });
  });
});
