import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './config';

export interface DailyPlanBlock {
  subject: string;
  durationMinutes: number;
  objective: string;
  taskType: 'teoria' | 'questoes' | 'revisao' | 'simulado';
  priority: 'alta' | 'media' | 'baixa';
}

export interface DailyPlanResponse {
  dateISO: string;
  rationale: string;
  blocks: DailyPlanBlock[];
  contingencies: string[];
  estimatedTotalMinutes: number;
}

interface DailyAiPlanDoc {
  userId: string;
  dateISO: string;
  estimatedTotalMinutes: number;
  blocksCount: number;
  rationale: string;
  planJson: string;
  provider: string;
  model: string;
  createdAt: string;
}

const DAILY_AI_PLANS_COLLECTION = 'daily_ai_plans';
const DAILY_AI_PLAN_PROGRESS_COLLECTION = 'daily_ai_plan_progress';

export interface DailyAiPlanProgress {
  userId: string;
  dateISO: string;
  planSignature: string;
  completedBlocks: number[];
  deferredBlocks: number[];
  updatedAt: string;
}

export function buildDailyPlanSignature(plan: DailyPlanResponse): string {
  return [
    plan.dateISO,
    ...plan.blocks.map((b) => `${b.subject}|${b.durationMinutes}|${b.taskType}|${b.priority}|${b.objective}`),
  ].join('||');
}

function parsePlan(planJson: string): DailyPlanResponse | null {
  try {
    const parsed = JSON.parse(planJson) as DailyPlanResponse;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getDailyAiPlanForDate(userId: string, dateISO: string): Promise<DailyPlanResponse | null> {
  const q = query(
    collection(db, DAILY_AI_PLANS_COLLECTION),
    where('userId', '==', userId),
    where('dateISO', '==', dateISO)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docs = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as DailyAiPlanDoc) }))
    .filter((doc) => typeof doc.createdAt === 'string' && typeof doc.planJson === 'string');

  if (docs.length === 0) return null;

  docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return parsePlan(docs[0].planJson);
}

function progressDocId(userId: string, dateISO: string): string {
  return `${userId}_${dateISO}`;
}

export async function getDailyAiPlanProgress(userId: string, dateISO: string): Promise<DailyAiPlanProgress | null> {
  const ref = doc(db, DAILY_AI_PLAN_PROGRESS_COLLECTION, progressDocId(userId, dateISO));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as Partial<DailyAiPlanProgress>;
  if (!data || data.userId !== userId || data.dateISO !== dateISO) return null;

  return {
    userId: data.userId,
    dateISO: data.dateISO,
    planSignature: typeof data.planSignature === 'string' ? data.planSignature : '',
    completedBlocks: Array.isArray(data.completedBlocks)
      ? data.completedBlocks.filter((v): v is number => typeof v === 'number')
      : [],
    deferredBlocks: Array.isArray(data.deferredBlocks)
      ? data.deferredBlocks.filter((v): v is number => typeof v === 'number')
      : [],
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  };
}

export async function saveDailyAiPlanProgress(
  userId: string,
  dateISO: string,
  progress: {
    planSignature: string;
    completedBlocks: number[];
    deferredBlocks: number[];
  }
): Promise<void> {
  const ref = doc(db, DAILY_AI_PLAN_PROGRESS_COLLECTION, progressDocId(userId, dateISO));
  await setDoc(
    ref,
    {
      userId,
      dateISO,
      planSignature: progress.planSignature,
      completedBlocks: [...new Set(progress.completedBlocks)].sort((a, b) => a - b),
      deferredBlocks: [...new Set(progress.deferredBlocks)].sort((a, b) => a - b),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
