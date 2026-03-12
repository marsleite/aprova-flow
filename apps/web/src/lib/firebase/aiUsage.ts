import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';

export interface AiUsageEventDoc {
  id?: string;
  userId: string;
  route: string;
  task: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  statusCode: number;
  createdAt: string;
}

export interface AiUsageSummary {
  events24h: number;
  events7d: number;
  totalCost24hUsd: number;
  totalCost7dUsd: number;
  totalTokens24h: number;
  totalTokens7d: number;
  errorRate7dPercent: number;
  byTask7d: { task: string; events: number; costUsd: number }[];
}

const AI_USAGE_COLLECTION = 'ai_usage_events';

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getAiUsageSummary(userId: string): Promise<AiUsageSummary> {
  const q = query(collection(db, AI_USAGE_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const cutoff24h = now - dayMs;
  const cutoff7d = now - 7 * dayMs;

  let events24h = 0;
  let events7d = 0;
  let totalCost24hUsd = 0;
  let totalCost7dUsd = 0;
  let totalTokens24h = 0;
  let totalTokens7d = 0;
  let errors7d = 0;

  const byTaskMap = new Map<string, { events: number; costUsd: number }>();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Partial<AiUsageEventDoc>;
    const createdAt = toDate(data.createdAt);
    if (!createdAt) return;

    const ts = createdAt.getTime();
    const cost = Number(data.estimatedCostUsd || 0);
    const tokens = Number(data.totalTokens || 0);
    const success = Boolean(data.success);
    const task = typeof data.task === 'string' ? data.task : 'unknown';

    if (ts >= cutoff24h) {
      events24h += 1;
      totalCost24hUsd += cost;
      totalTokens24h += tokens;
    }

    if (ts >= cutoff7d) {
      events7d += 1;
      totalCost7dUsd += cost;
      totalTokens7d += tokens;
      if (!success) errors7d += 1;

      const prev = byTaskMap.get(task) || { events: 0, costUsd: 0 };
      byTaskMap.set(task, {
        events: prev.events + 1,
        costUsd: prev.costUsd + cost,
      });
    }
  });

  const byTask7d = Array.from(byTaskMap.entries())
    .map(([task, value]) => ({
      task,
      events: value.events,
      costUsd: Number(value.costUsd.toFixed(6)),
    }))
    .sort((a, b) => b.events - a.events);

  return {
    events24h,
    events7d,
    totalCost24hUsd: Number(totalCost24hUsd.toFixed(6)),
    totalCost7dUsd: Number(totalCost7dUsd.toFixed(6)),
    totalTokens24h,
    totalTokens7d,
    errorRate7dPercent: events7d > 0 ? Math.round((errors7d / events7d) * 100) : 0,
    byTask7d,
  };
}
