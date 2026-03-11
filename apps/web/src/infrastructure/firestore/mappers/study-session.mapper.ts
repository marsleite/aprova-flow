import type { DocumentData } from 'firebase/firestore';
import type {
  LoadedStudySession,
  SaveStudySessionRecord,
} from '@aprovamind/application/ports/StudySessionRepository';
import type {
  LegacyStudySessionDocument,
  StudySessionDocument,
} from '../dto/study-session.document';
import { STUDY_SESSION_SCHEMA_VERSION } from '../dto/study-session.document';
import { normalizeDateOnly, nowIso, toIsoString } from '../shared/date-codecs';
import { stripUndefinedDeep } from '../shared/strip-undefined';

function nonNegativeInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

export function normalizeStudySessionDocument(raw: LegacyStudySessionDocument): StudySessionDocument {
  const startTime = toIsoString(raw.startTime) ?? nowIso();
  const endTime = toIsoString(raw.endTime) ?? startTime;
  const createdAt = toIsoString(raw.createdAt) ?? startTime;
  const updatedAt = toIsoString(raw.updatedAt);

  return {
    schemaVersion: STUDY_SESSION_SCHEMA_VERSION,
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    planId: typeof raw.planId === 'string' && raw.planId ? raw.planId : null,
    subject:
      typeof raw.subject === 'string' && raw.subject.trim() !== ''
        ? raw.subject.trim()
        : 'Sem materia',
    subtopic:
      typeof raw.subtopic === 'string' && raw.subtopic.trim() !== ''
        ? raw.subtopic.trim()
        : null,
    duration: nonNegativeInt(raw.duration, 0),
    date: normalizeDateOnly(raw.date, startTime.slice(0, 10)) ?? startTime.slice(0, 10),
    startTime,
    endTime,
    source: raw.source === 'manual' ? 'manual' : 'timer',
    wasEdited: Boolean(raw.wasEdited),
    createdAt,
    updatedAt,
  };
}

export function toLoadedStudySession(sessionId: string, raw: DocumentData): LoadedStudySession {
  const doc = normalizeStudySessionDocument(raw as LegacyStudySessionDocument);

  return {
    sessionId,
    userId: doc.userId,
    planId: doc.planId,
    subject: doc.subject,
    subtopic: doc.subtopic,
    durationSeconds: doc.duration,
    date: doc.date,
    source: doc.source,
    startTime: doc.startTime,
    endTime: doc.endTime,
    wasEdited: doc.wasEdited,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function fromSaveStudySessionRecord(record: SaveStudySessionRecord): StudySessionDocument {
  const createdAt = record.createdAt ?? nowIso();

  return stripUndefinedDeep({
    schemaVersion: STUDY_SESSION_SCHEMA_VERSION,
    userId: record.userId,
    planId: record.planId ?? null,
    subject: record.subject.trim(),
    subtopic: record.subtopic?.trim() || null,
    duration: nonNegativeInt(record.durationSeconds, 0),
    date: normalizeDateOnly(record.date, createdAt.slice(0, 10)) ?? createdAt.slice(0, 10),
    startTime: toIsoString(record.startTime) ?? createdAt,
    endTime: toIsoString(record.endTime) ?? createdAt,
    source: record.source,
    wasEdited: Boolean(record.wasEdited),
    createdAt,
    updatedAt: toIsoString(record.updatedAt) ?? null,
  });
}
