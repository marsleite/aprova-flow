import type { StudySessionInput } from '@/domain/types';

export interface LoadedStudySession extends StudySessionInput {
  sessionId: string;
  userId: string;
  planId: string | null;
  subtopic: string | null;
  startTime: string;
  endTime: string;
  wasEdited: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface SaveStudySessionRecord {
  sessionId?: string;
  userId: string;
  planId: string | null;
  subject: string;
  subtopic: string | null;
  durationSeconds: number;
  date: string;
  startTime: string;
  endTime: string;
  source: 'timer' | 'manual';
  wasEdited?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface StudySessionRepository {
  listFromDate(userId: string, fromDate: string, planId?: string): Promise<LoadedStudySession[]>;
  save(record: SaveStudySessionRecord): Promise<string>;
  update(record: SaveStudySessionRecord & { sessionId: string }): Promise<void>;
}
