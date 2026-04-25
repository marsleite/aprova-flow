import {
  buildProductEventDocument,
  type ProductEventInput,
} from '@aprovamind/contracts/analytics/ProductEvents';
import { createFirestoreDocumentWithUserToken } from '@aprovamind/infrastructure-firebase';

export const PRODUCT_USAGE_COLLECTION = 'product_usage_events';

export async function saveProductUsageEvent(
  event: ProductEventInput,
  idToken?: string
): Promise<void> {
  if (!idToken) return;

  const result = await createFirestoreDocumentWithUserToken({
    collection: PRODUCT_USAGE_COLLECTION,
    data: buildProductEventDocument(event),
    idToken,
  });

  if (!result.ok) {
    console.warn('[product-events] Firestore write failed:', result.status, result.error);
  }
}
