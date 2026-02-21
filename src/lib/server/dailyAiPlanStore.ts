import { createFirestoreDocumentWithUserToken } from '@/lib/server/firestoreRest';

const DAILY_AI_PLANS_COLLECTION = 'daily_ai_plans';

export interface DailyAiPlanSnapshotInput {
  userId: string;
  dateISO: string;
  estimatedTotalMinutes: number;
  blocksCount: number;
  rationale: string;
  planJson: string;
  provider: string;
  model: string;
}

export async function saveDailyAiPlanSnapshot(
  payload: DailyAiPlanSnapshotInput,
  idToken?: string
): Promise<void> {
  if (!idToken) return;

  const result = await createFirestoreDocumentWithUserToken({
    collection: DAILY_AI_PLANS_COLLECTION,
    idToken,
    data: {
      userId: payload.userId,
      dateISO: payload.dateISO,
      estimatedTotalMinutes: payload.estimatedTotalMinutes,
      blocksCount: payload.blocksCount,
      rationale: payload.rationale,
      planJson: payload.planJson,
      provider: payload.provider,
      model: payload.model,
      createdAt: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    console.warn('[daily-ai-plan] Firestore write failed:', result.status, result.error);
  }
}
