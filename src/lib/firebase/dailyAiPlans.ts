import { collection, getDocs, query, where } from 'firebase/firestore';
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
