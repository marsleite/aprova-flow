import type {
  PriorityBand,
  RecommendationType,
  RecommendationUrgency,
  SubjectHealthStatus,
} from '@/domain';

export type RecommendationDueWindow =
  | 'today'
  | 'this_week'
  | 'next_week'
  | 'routine';

export interface PlanEngineSnapshotV1 {
  engineVersion: string;
  plan: PlanEnginePlanSnapshotV1;
  subjects: PlanEngineSubjectSnapshotV1[];
  recommendations: PlanEngineRecommendationSnapshotV1[];
}

export interface PlanEnginePlanSnapshotV1 {
  planId: string;
  name: string;
  examDate: string | null;
  weeklyGoalHours: number;
}

export interface PlanEngineSubjectSnapshotV1 {
  subject: string;
  weight: number;
  status: SubjectHealthStatus;
  priorityScore: number;
  priorityBand: PriorityBand;
  metrics: {
    overallScore: number;
    volumeScore: number;
    frequencyScore: number;
    adherenceScore: number;
    recencyScore: number;
    performanceScore: number | null;
  };
}

export interface PlanEngineRecommendationSnapshotV1 {
  targetSubject: string;
  type: RecommendationType;
  urgency: RecommendationUrgency;
  dueWindow: RecommendationDueWindow;
  priorityScore: number;
  reasons: string[];
}
