import {
  FeatureCode,
  type FeatureCode as FeatureCodeValue,
} from '@aprovamind/domain';
import type {
  GetUserEntitlementsResponseV1,
  UserEntitlementsSnapshotV1,
} from '@aprovamind/contracts';
import {
  getCapabilitiesForTier,
  type PlanCapabilities,
  type PlanTier,
} from '@/lib/entitlements';

export interface EntitlementScenarioSummary {
  userId: string;
  plan: 'free' | 'pro' | 'premium';
  status: string;
  description: string;
}

interface FetchUserEntitlementsSnapshotParams {
  sandboxUserId?: string | null;
  idToken?: string | null;
}

export function resolveEntitlementsApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    if (process.env.NODE_ENV !== 'production') {
      return 'http://127.0.0.1:3001';
    }
    return '';
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:3001';
    }
  }

  return '';
}

export async function fetchUserEntitlementsSnapshot(
  params: FetchUserEntitlementsSnapshotParams
): Promise<UserEntitlementsSnapshotV1> {
  const baseUrl = resolveEntitlementsApiBaseUrl();

  if (!baseUrl) {
    throw new Error('missing_api_base_url');
  }

  const url = params.sandboxUserId
    ? `${baseUrl}/entitlements/me?userId=${encodeURIComponent(params.sandboxUserId)}`
    : `${baseUrl}/entitlements/me`;

  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (!params.sandboxUserId) {
    if (!params.idToken) {
      throw new Error('missing_id_token');
    }
    headers.Authorization = `Bearer ${params.idToken}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = new Error(`entitlements_request_failed:${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const payload = (await response.json()) as {
    userId: string;
    entitlements: GetUserEntitlementsResponseV1['entitlements'];
  };

  return payload.entitlements;
}

export async function fetchEntitlementScenarios(): Promise<
  EntitlementScenarioSummary[]
> {
  const baseUrl = resolveEntitlementsApiBaseUrl();

  if (!baseUrl) {
    return [];
  }

  const response = await fetch(`${baseUrl}/entitlements/scenarios`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`entitlement_scenarios_failed:${response.status}`);
  }

  const payload = (await response.json()) as {
    scenarios: EntitlementScenarioSummary[];
  };

  return payload.scenarios;
}

export function getEntitlementFeature(
  snapshot: UserEntitlementsSnapshotV1 | null,
  featureCode: FeatureCodeValue
) {
  if (!snapshot) return null;
  return snapshot.features[featureCode] ?? null;
}

export function isEntitlementFeatureEnabled(
  snapshot: UserEntitlementsSnapshotV1 | null,
  featureCode: FeatureCodeValue
): boolean {
  const feature = getEntitlementFeature(snapshot, featureCode);
  return Boolean(feature?.enabled);
}

export function mapSnapshotToLegacyEntitlements(
  snapshot: UserEntitlementsSnapshotV1
): {
  planTier: PlanTier;
  capabilities: PlanCapabilities;
} {
  const planTier = snapshot.effectivePlan;
  const baseCapabilities = getCapabilitiesForTier(planTier);
  const activePlans = snapshot.features[FeatureCode.ActivePlans];
  const simulationsCustom = snapshot.features[FeatureCode.SimulationsCustom];
  const questionsPractice = snapshot.features[FeatureCode.QuestionsPracticeBasic];

  const maxStudyPlans =
    activePlans?.mode === 'quota' ? activePlans.limit : baseCapabilities.maxStudyPlans;

  return {
    planTier,
    capabilities: {
      ...baseCapabilities,
      maxStudyPlans,
      canCreateSimulados:
        simulationsCustom?.mode === 'boolean'
          ? simulationsCustom.enabled
          : baseCapabilities.canCreateSimulados,
      canUseTreinoRapido:
        questionsPractice?.mode === 'boolean'
          ? questionsPractice.enabled
          : baseCapabilities.canUseTreinoRapido,
    },
  };
}
