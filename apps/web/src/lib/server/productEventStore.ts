import type { ProductEventInput } from '@/lib/product-events/types';
import { resolveBackendApiBaseUrl } from '@/lib/server/backendApi';

export async function saveProductUsageEvent(
  event: ProductEventInput,
  idToken?: string
): Promise<void> {
  if (!idToken) return;

  const baseUrl = resolveBackendApiBaseUrl();
  if (!baseUrl) {
    console.warn('[product-events] dedicated API base URL is not configured.');
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/product-events`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(event),
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[product-events] dedicated API write failed:', response.status, body);
    }
  } catch (error) {
    console.warn(
      '[product-events] dedicated API request failed:',
      error instanceof Error ? error.message : error
    );
  }
}
