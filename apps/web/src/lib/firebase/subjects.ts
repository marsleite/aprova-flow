import { arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const USER_STATS_COLLECTION = 'user_stats';

export const CUSTOM_SUBJECT_ADDED_EVENT = 'aprova:custom-subject-added';

export function normalizeSubjectName(subject: string): string {
  return subject.trim().replace(/\s+/g, ' ');
}

export function mergeSubjectOptions(
  ...subjectGroups: Array<readonly string[] | string[] | undefined | null>
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const group of subjectGroups) {
    if (!group) continue;
    for (const item of group) {
      const normalized = normalizeSubjectName(item);
      if (!normalized) continue;
      const key = normalized.toLocaleLowerCase('pt-BR');
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(normalized);
    }
  }

  return merged;
}

function readCustomSubjects(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return mergeSubjectOptions(raw.filter((item): item is string => typeof item === 'string'));
}

export async function getUserCustomSubjects(userId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, USER_STATS_COLLECTION, userId));
  if (!snap.exists()) return [];

  return readCustomSubjects(snap.data().customSubjects);
}

export async function persistUserCustomSubject(
  userId: string,
  subject: string,
  knownSubjects: readonly string[] = []
): Promise<string> {
  const normalized = normalizeSubjectName(subject);
  if (!normalized) {
    throw new Error('Matéria inválida.');
  }

  const mergedKnown = mergeSubjectOptions(knownSubjects);
  const knownMatch = mergedKnown.find(
    (item) => item.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR')
  );
  if (knownMatch) return knownMatch;

  const currentCustomSubjects = await getUserCustomSubjects(userId);
  const customMatch = currentCustomSubjects.find(
    (item) => item.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR')
  );
  if (customMatch) return customMatch;

  await setDoc(
    doc(db, USER_STATS_COLLECTION, userId),
    {
      customSubjects: arrayUnion(normalized),
      customSubjectsUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return normalized;
}
