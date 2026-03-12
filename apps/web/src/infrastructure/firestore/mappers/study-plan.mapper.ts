import type { DocumentData } from 'firebase/firestore';
import type {
  LoadedStudyPlan,
  SaveStudyPlanRecord,
} from '@aprovamind/application/ports/StudyPlanRepository';
import type {
  LegacyStudyPlanDocument,
  StudyPlanDocument,
  SubjectPlanDocument,
} from '../dto/study-plan.document';
import { STUDY_PLAN_SCHEMA_VERSION } from '../dto/study-plan.document';
import { normalizeDateOnly, nowIso, toIsoString } from '../shared/date-codecs';
import { stripUndefinedDeep } from '../shared/strip-undefined';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeSubject(raw: Partial<SubjectPlanDocument>): SubjectPlanDocument | null {
  if (typeof raw.subject !== 'string' || raw.subject.trim() === '') {
    return null;
  }

  return {
    subject: raw.subject.trim(),
    weight: clampInt(raw.weight, 0, 100, 0),
    priorityOverride:
      raw.priorityOverride == null ? null : clampInt(raw.priorityOverride, 1, 5, 1),
  };
}

export function normalizeStudyPlanDocument(raw: LegacyStudyPlanDocument): StudyPlanDocument {
  const createdAt = toIsoString(raw.createdAt) ?? nowIso();
  const updatedAt = toIsoString(raw.updatedAt) ?? createdAt;

  return {
    schemaVersion: STUDY_PLAN_SCHEMA_VERSION,
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    name:
      typeof raw.name === 'string' && raw.name.trim() !== ''
        ? raw.name.trim()
        : 'Plano sem nome',
    subjects: Array.isArray(raw.subjects)
      ? raw.subjects.map(normalizeSubject).filter((item): item is SubjectPlanDocument => item !== null)
      : [],
    weeklyGoalHours: clampInt(raw.weeklyGoalHours, 1, 80, 10),
    examDate: normalizeDateOnly(raw.examDate, null),
    userPriority: clampInt(raw.userPriority, 1, 5, 3),
    color: typeof raw.color === 'string' && raw.color ? raw.color : '#8b5cf6',
    isDefault: Boolean(raw.isDefault),
    createdAt,
    updatedAt,
  };
}

export function toLoadedStudyPlan(planId: string, raw: DocumentData): LoadedStudyPlan {
  const doc = normalizeStudyPlanDocument(raw as LegacyStudyPlanDocument);

  return {
    planId,
    userId: doc.userId,
    name: doc.name,
    subjects: doc.subjects.map((subject) => ({
      subject: subject.subject,
      weight: subject.weight,
      priorityOverride: subject.priorityOverride,
    })),
    weeklyGoalHours: doc.weeklyGoalHours,
    examDate: doc.examDate,
    userPriority: doc.userPriority,
    color: doc.color,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function fromSaveStudyPlanRecord(record: SaveStudyPlanRecord): StudyPlanDocument {
  const createdAt = record.createdAt ?? nowIso();
  const updatedAt = nowIso();

  return stripUndefinedDeep({
    schemaVersion: STUDY_PLAN_SCHEMA_VERSION,
    userId: record.userId,
    name: record.name.trim(),
    subjects: record.subjects.map((subject) => ({
      subject: subject.subject.trim(),
      weight: clampInt(subject.weight, 0, 100, 0),
      priorityOverride: subject.priorityOverride ?? null,
    })),
    weeklyGoalHours: clampInt(record.weeklyGoalHours, 1, 80, 10),
    examDate: normalizeDateOnly(record.examDate, null),
    userPriority: clampInt(record.userPriority, 1, 5, 3),
    color: record.color,
    isDefault: record.isDefault,
    createdAt,
    updatedAt,
  });
}
