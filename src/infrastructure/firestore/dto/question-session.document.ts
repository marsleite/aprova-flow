export const QUESTION_SESSION_SCHEMA_VERSION = 2 as const;

export interface QuestionSessionDocument {
  schemaVersion: typeof QUESTION_SESSION_SCHEMA_VERSION;
  userId: string;
  planId: string | null;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  date: string;
  createdAt: string;
}

export type LegacyQuestionSessionDocument = Partial<QuestionSessionDocument>;
