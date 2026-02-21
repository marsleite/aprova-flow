import { AiUsageEvent } from '@/lib/ai/types';
import { createFirestoreDocumentWithUserToken } from '@/lib/server/firestoreRest';

const AI_USAGE_COLLECTION = 'ai_usage_events';

export async function saveAiUsageEvent(event: AiUsageEvent, idToken?: string): Promise<void> {
  if (!idToken) return;

  const payload = {
    ...event,
    createdAt: new Date().toISOString(),
  };

  const result = await createFirestoreDocumentWithUserToken({
    collection: AI_USAGE_COLLECTION,
    data: payload,
    idToken,
  });

  if (!result.ok) {
    console.warn('[ai-usage] Firestore write failed:', result.status, result.error);
  }
}
