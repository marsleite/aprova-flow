export const STUDY_SESSION_SCHEMA_VERSION = 2 as const;

export interface StudySessionDocument {
  schemaVersion: typeof STUDY_SESSION_SCHEMA_VERSION;
  userId: string;
  planId: string | null;
  subject: string;
  subtopic: string | null;
  duration: number;
  date: string;
  startTime: string;
  endTime: string;
  source: 'timer' | 'manual';
  wasEdited: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export type LegacyStudySessionDocument = Partial<StudySessionDocument>;
