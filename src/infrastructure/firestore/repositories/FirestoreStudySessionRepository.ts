import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type {
  LoadedStudySession,
  SaveStudySessionRecord,
  StudySessionRepository,
} from '@/application/ports/StudySessionRepository';
import { db } from '@/lib/firebase/config';
import { STUDY_SESSIONS_COLLECTION } from '../collections';
import { fromSaveStudySessionRecord, toLoadedStudySession } from '../mappers/study-session.mapper';

export class FirestoreStudySessionRepository implements StudySessionRepository {
  async listFromDate(
    userId: string,
    fromDate: string,
    planId?: string
  ): Promise<LoadedStudySession[]> {
    const baseQuery = query(
      collection(db, STUDY_SESSIONS_COLLECTION),
      where('userId', '==', userId),
      where('date', '>=', fromDate),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(baseQuery);
    const sessions = snapshot.docs.map((item) => toLoadedStudySession(item.id, item.data()));

    return planId ? sessions.filter((item) => item.planId === planId) : sessions;
  }

  async save(record: SaveStudySessionRecord): Promise<string> {
    const payload = fromSaveStudySessionRecord(record);

    if (record.sessionId) {
      await setDoc(doc(db, STUDY_SESSIONS_COLLECTION, record.sessionId), payload, { merge: true });
      return record.sessionId;
    }

    const created = await addDoc(collection(db, STUDY_SESSIONS_COLLECTION), payload);
    return created.id;
  }

  async update(record: SaveStudySessionRecord & { sessionId: string }): Promise<void> {
    const payload = fromSaveStudySessionRecord({
      ...record,
      wasEdited: true,
    });

    await setDoc(doc(db, STUDY_SESSIONS_COLLECTION, record.sessionId), payload, { merge: true });
  }
}
