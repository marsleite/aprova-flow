import type { DocumentData } from 'firebase/firestore';
import type {
  LoadedQuestionSession,
  SaveQuestionSessionRecord,
} from '@aprovamind/application/ports/QuestionSessionRepository';
import type {
  LegacyQuestionSessionDocument,
  QuestionSessionDocument,
} from '../dto/question-session.document';
import { QUESTION_SESSION_SCHEMA_VERSION } from '../dto/question-session.document';
import { normalizeDateOnly, nowIso, toIsoString } from '../shared/date-codecs';
import { stripUndefinedDeep } from '../shared/strip-undefined';

function safeInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

export function normalizeQuestionSessionDocument(
  raw: LegacyQuestionSessionDocument
): QuestionSessionDocument {
  const totalQuestions = safeInt(raw.totalQuestions, 0);
  const correctAnswers = Math.min(safeInt(raw.correctAnswers, 0), totalQuestions);
  const createdAt = toIsoString(raw.createdAt) ?? nowIso();

  return {
    schemaVersion: QUESTION_SESSION_SCHEMA_VERSION,
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    planId: typeof raw.planId === 'string' && raw.planId ? raw.planId : null,
    subject:
      typeof raw.subject === 'string' && raw.subject.trim() !== ''
        ? raw.subject.trim()
        : 'Sem materia',
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    date: normalizeDateOnly(raw.date, createdAt.slice(0, 10)) ?? createdAt.slice(0, 10),
    createdAt,
  };
}

export function toLoadedQuestionSession(
  questionSessionId: string,
  raw: DocumentData
): LoadedQuestionSession {
  const doc = normalizeQuestionSessionDocument(raw as LegacyQuestionSessionDocument);

  return {
    questionSessionId,
    userId: doc.userId,
    planId: doc.planId,
    subject: doc.subject,
    totalQuestions: doc.totalQuestions,
    correctAnswers: doc.correctAnswers,
    date: doc.date,
    accuracy: doc.accuracy,
    createdAt: doc.createdAt,
  };
}

export function fromSaveQuestionSessionRecord(
  record: SaveQuestionSessionRecord
): QuestionSessionDocument {
  const totalQuestions = safeInt(record.totalQuestions, 0);
  const correctAnswers = Math.min(safeInt(record.correctAnswers, 0), totalQuestions);
  const createdAt = record.createdAt ?? nowIso();

  return stripUndefinedDeep({
    schemaVersion: QUESTION_SESSION_SCHEMA_VERSION,
    userId: record.userId,
    planId: record.planId ?? null,
    subject: record.subject.trim(),
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    date: normalizeDateOnly(record.date, createdAt.slice(0, 10)) ?? createdAt.slice(0, 10),
    createdAt,
  });
}
