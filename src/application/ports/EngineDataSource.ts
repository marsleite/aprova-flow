import type { PlanEngineContext } from '@/domain/types';

export interface EngineQueryWindow {
  studySessionsFrom: string;
  questionSessionsFrom: string;
  allTimeStudySessionsFrom?: string;
  allTimeQuestionSessionsFrom?: string;
}

export interface LoadPlanEngineContextParams {
  userId: string;
  today: string;
  planId?: string | null;
  window: EngineQueryWindow;
}

export type LoadPlanEngineContextResult =
  | {
    found: true;
    context: PlanEngineContext;
  }
  | {
    found: false;
    reason: 'no_active_plan' | 'plan_not_found';
  };

export interface LoadAllPlanEngineContextsParams {
  userId: string;
  today: string;
  window: EngineQueryWindow;
}

export interface LoadAllPlanEngineContextsResult {
  found: boolean;
  contexts: PlanEngineContext[];
}

export interface EngineDataSource {
  loadPlanEngineContext(
    params: LoadPlanEngineContextParams
  ): Promise<LoadPlanEngineContextResult>;

  loadAllPlanEngineContexts(
    params: LoadAllPlanEngineContextsParams
  ): Promise<LoadAllPlanEngineContextsResult>;
}
