import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type {
  LoadedStudyPlan,
  SaveStudyPlanRecord,
  StudyPlanRepository,
} from '@aprovamind/application/ports/StudyPlanRepository';
import { db } from '@/lib/firebase/config';
import { STUDY_PLANS_COLLECTION } from '../collections';
import { fromSaveStudyPlanRecord, toLoadedStudyPlan } from '../mappers/study-plan.mapper';

export class FirestoreStudyPlanRepository implements StudyPlanRepository {
  async getById(userId: string, planId: string): Promise<LoadedStudyPlan | null> {
    const snapshot = await getDoc(doc(db, STUDY_PLANS_COLLECTION, planId));
    if (!snapshot.exists()) return null;

    const plan = toLoadedStudyPlan(snapshot.id, snapshot.data());
    return plan.userId === userId ? plan : null;
  }

  async listByUser(userId: string): Promise<LoadedStudyPlan[]> {
    const snapshot = await getDocs(
      query(collection(db, STUDY_PLANS_COLLECTION), where('userId', '==', userId))
    );

    return snapshot.docs
      .map((item) => toLoadedStudyPlan(item.id, item.data()))
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  async save(record: SaveStudyPlanRecord): Promise<string> {
    const payload = fromSaveStudyPlanRecord(record);

    if (record.planId) {
      await setDoc(doc(db, STUDY_PLANS_COLLECTION, record.planId), payload, { merge: true });
      return record.planId;
    }

    const created = await addDoc(collection(db, STUDY_PLANS_COLLECTION), payload);
    return created.id;
  }
}
