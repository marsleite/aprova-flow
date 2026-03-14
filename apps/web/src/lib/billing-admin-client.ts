import type {
  FeatureUsageMap,
  PlanCode,
  SubscriptionStatus,
} from '@aprovamind/domain';
import { resolveEntitlementsApiBaseUrl } from '@/lib/entitlements-client';

export interface AdminSubscriptionStateResponse {
  userId: string;
  email?: string | null;
  subscription: {
    userId: string;
    plan: PlanCode;
    status: SubscriptionStatus;
    usage?: FeatureUsageMap;
  };
}

export async function fetchAdminSubscriptionState(params: {
  userIdentifier: string;
  idToken: string;
}): Promise<AdminSubscriptionStateResponse> {
  const baseUrl = resolveEntitlementsApiBaseUrl();
  if (!baseUrl) {
    throw new Error('missing_api_base_url');
  }

  const identifier = params.userIdentifier.trim();
  const query = identifier.includes('@')
    ? `email=${encodeURIComponent(identifier)}`
    : `userId=${encodeURIComponent(identifier)}`;

  const response = await fetch(
    `${baseUrl}/billing/admin/subscription?${query}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${params.idToken}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const error = new Error(`admin_subscription_fetch_failed:${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as AdminSubscriptionStateResponse;
}

export async function updateAdminSubscriptionState(params: {
  idToken: string;
  userIdentifier: string;
  plan?: PlanCode;
  status?: SubscriptionStatus;
  usage?: FeatureUsageMap;
  resetUsage?: boolean;
}): Promise<AdminSubscriptionStateResponse> {
  const baseUrl = resolveEntitlementsApiBaseUrl();
  if (!baseUrl) {
    throw new Error('missing_api_base_url');
  }

  const response = await fetch(`${baseUrl}/billing/admin/subscription`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({
      ...(params.userIdentifier.includes('@')
        ? { email: params.userIdentifier.trim() }
        : { userId: params.userIdentifier.trim() }),
      plan: params.plan,
      status: params.status,
      usage: params.usage,
      resetUsage: params.resetUsage,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = new Error(`admin_subscription_update_failed:${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as AdminSubscriptionStateResponse;
}
