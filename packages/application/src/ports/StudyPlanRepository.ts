import type { PlanInput, SubjectPlanInput } from '@aprovamind/domain/types';

export interface LoadedStudyPlan extends PlanInput {
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveStudyPlanRecord {
  planId?: string;
  userId: string;
  name: string;
  subjects: SubjectPlanInput[];
  weeklyGoalHours: number;
  examDate: string | null;
  userPriority: number;
  color: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface StudyPlanRepository {
  getById(userId: string, planId: string): Promise<LoadedStudyPlan | null>;
  listByUser(userId: string): Promise<LoadedStudyPlan[]>;
  save(record: SaveStudyPlanRecord): Promise<string>;
}
