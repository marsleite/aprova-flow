import type {
  FeatureUsageMap,
  PlanCode,
  SubscriptionStatus,
} from '@aprovamind/domain';

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

interface AdminErrorPayload {
  error?: string;
  message?: string;
}

async function parseAdminError(response: Response, fallbackCode: string): Promise<Error> {
  let payload: AdminErrorPayload | null = null;

  try {
    payload = (await response.json()) as AdminErrorPayload;
  } catch {
    payload = null;
  }

  const code = payload?.error || fallbackCode;
  const message = payload?.message || `${fallbackCode}:${response.status}`;
  const error = new Error(`${code}:${response.status}:${message}`);
  (error as Error & { status?: number }).status = response.status;
  return error;
}

export async function fetchAdminSubscriptionState(params: {
  userIdentifier: string;
  idToken: string;
}): Promise<AdminSubscriptionStateResponse> {
  const identifier = params.userIdentifier.trim();
  const query = identifier.includes('@')
    ? `email=${encodeURIComponent(identifier)}`
    : `userId=${encodeURIComponent(identifier)}`;

  const response = await fetch(`/api/admin/tester-subscription?${query}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await parseAdminError(response, 'admin_subscription_fetch_failed');
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
  const response = await fetch('/api/admin/tester-subscription', {
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
    throw await parseAdminError(response, 'admin_subscription_update_failed');
  }

  return (await response.json()) as AdminSubscriptionStateResponse;
}
