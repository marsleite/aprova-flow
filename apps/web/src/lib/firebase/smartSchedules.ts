import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface SmartScheduleSubject {
  name: string;
  hours: number;
  reason: string;
}

export interface SmartScheduleItem {
  day: string;
  totalHours: number;
  subjects: SmartScheduleSubject[];
}

export interface WeeklySmartSchedule {
  id?: string;
  userId: string;
  planId: string;
  weekStart: string; // YYYY-MM-DD representing Monday
  schedule: SmartScheduleItem[];
  generatedAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

/**
 * Returns the YYYY-MM-DD date string of the Monday of the current calendar week of the given date.
 */
export function getMondayOfCurrentWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday to get the previous Monday
  const monday = new Date(d.setDate(diff));

  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Saves or updates a weekly smart schedule in Firestore under the 'weekly_smart_schedules' collection.
 * The document ID is structured as: `${userId}_${planId}_${weekStart}`
 */
export async function saveWeeklySmartSchedule(
  userId: string,
  planId: string,
  weekStart: string,
  schedule: SmartScheduleItem[]
): Promise<void> {
  if (!userId || !planId || !weekStart) {
    throw new Error('Missing required arguments: userId, planId, or weekStart');
  }

  const docId = `${userId}_${planId}_${weekStart}`;
  const ref = doc(db, 'weekly_smart_schedules', docId);
  const now = new Date().toISOString();

  // Try to preserve generatedAt if the document already exists
  let generatedAt = now;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.generatedAt === 'string') {
        generatedAt = data.generatedAt;
      }
    }
  } catch (error) {
    console.warn('[saveWeeklySmartSchedule] Could not read existing document to preserve generatedAt, using current timestamp:', error);
  }

  await setDoc(ref, {
    userId,
    planId,
    weekStart,
    schedule,
    generatedAt,
    updatedAt: now,
  });
}

/**
 * Retrieves the saved weekly smart schedule from Firestore for the given userId, planId, and weekStart date.
 */
export async function getWeeklySmartSchedule(
  userId: string,
  planId: string,
  weekStart: string
): Promise<SmartScheduleItem[] | null> {
  if (!userId || !planId || !weekStart) return null;

  const docId = `${userId}_${planId}_${weekStart}`;
  const ref = doc(doc(db, 'weekly_smart_schedules', docId).firestore, 'weekly_smart_schedules', docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  if (!data || data.userId !== userId || data.planId !== planId || data.weekStart !== weekStart) {
    return null;
  }

  return data.schedule as SmartScheduleItem[];
}
