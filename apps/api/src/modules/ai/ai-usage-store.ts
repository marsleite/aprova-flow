import type { AiUsageEvent } from '@aprovamind/ai-gateway';
import {
  createFirestoreDocumentWithUserToken,
  type FirestoreWriteResult,
} from '@aprovamind/infrastructure-firebase';

export const AI_USAGE_COLLECTION = 'ai_usage_events';

export async function saveAiUsageEvent(
  event: AiUsageEvent,
  idToken?: string,
  writer: (params: {
    collection: string;
    data: Record<string, string | number | boolean | null | undefined>;
    idToken: string;
  }) => Promise<FirestoreWriteResult> = createFirestoreDocumentWithUserToken
): Promise<void> {
  if (!idToken) return;

  const payload = {
    ...event,
    createdAt: new Date().toISOString(),
  };

  const result = await writer({
    collection: AI_USAGE_COLLECTION,
    data: payload,
    idToken,
  });

  if (!result.ok) {
    console.warn('[ai-usage] Firestore write failed:', result.status, result.error);
  }
}
