export const STUDY_PLAN_SCHEMA_VERSION = 2 as const;

export interface SubjectPlanDocument {
  subject: string;
  weight: number;
  priorityOverride: number | null;
}

export interface StudyPlanDocument {
  schemaVersion: typeof STUDY_PLAN_SCHEMA_VERSION;
  userId: string;
  name: string;
  subjects: SubjectPlanDocument[];
  weeklyGoalHours: number;
  examDate: string | null;
  userPriority: number;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LegacyStudyPlanDocument = Partial<StudyPlanDocument> & {
  subjects?: Array<Partial<SubjectPlanDocument>>;
};
