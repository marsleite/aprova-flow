import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import type {
  LoadedQuestionSession,
  QuestionSessionRepository,
  SaveQuestionSessionRecord,
} from '@aprovamind/application/ports/QuestionSessionRepository';
import { db } from '@/lib/firebase/config';
import { QUESTION_SESSIONS_COLLECTION } from '../collections';
import {
  fromSaveQuestionSessionRecord,
  toLoadedQuestionSession,
} from '../mappers/question-session.mapper';

export class FirestoreQuestionSessionRepository implements QuestionSessionRepository {
  async listFromDate(
    userId: string,
    fromDate: string,
    planId?: string,
    toDate?: string
  ): Promise<LoadedQuestionSession[]> {
    const baseQuery = query(
      collection(db, QUESTION_SESSIONS_COLLECTION),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(baseQuery);
    const sessions = snapshot.docs
      .map((item) => toLoadedQuestionSession(item.id, item.data()))
      .filter((item) => item.date >= fromDate)
      .filter((item) => (toDate ? item.date <= toDate : true));

    return planId ? sessions.filter((item) => item.planId === planId) : sessions;
  }

  async save(record: SaveQuestionSessionRecord): Promise<string> {
    const payload = fromSaveQuestionSessionRecord(record);
    const created = await addDoc(collection(db, QUESTION_SESSIONS_COLLECTION), payload);
    return created.id;
  }
}
