import type { QuestionSessionInput } from '@/domain/types';

export interface LoadedQuestionSession extends QuestionSessionInput {
  questionSessionId: string;
  userId: string;
  planId: string | null;
  accuracy: number;
  createdAt: string;
}

export interface SaveQuestionSessionRecord {
  questionSessionId?: string;
  userId: string;
  planId: string | null;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  date: string;
  createdAt?: string;
}

export interface QuestionSessionRepository {
  listFromDate(
    userId: string,
    fromDate: string,
    planId?: string,
    toDate?: string
  ): Promise<LoadedQuestionSession[]>;
  save(record: SaveQuestionSessionRecord): Promise<string>;
}
