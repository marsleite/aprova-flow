'use client';

import { auth } from '@/lib/firebase/config';
import type {
  ClientProductEventName,
  ProductEventMetadata,
} from '@/lib/product-events/types';

export async function trackClientProductEvent(params: {
  eventName: ClientProductEventName;
  route?: string | null;
  surface?: string | null;
  featureCode?: string | null;
  recommendedPlan?: string | null;
  planTier?: string | null;
  ctaHref?: string | null;
  metadata?: ProductEventMetadata;
}): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) return;

    const response = await fetch('/api/product-events', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(params),
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[product-events] client event failed:', response.status, body);
    }
  } catch (error) {
    console.warn(
      '[product-events] client event request failed:',
      error instanceof Error ? error.message : error
    );
  }
}
