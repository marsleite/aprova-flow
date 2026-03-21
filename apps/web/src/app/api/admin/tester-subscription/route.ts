import { NextRequest, NextResponse } from 'next/server';
import { PlanCode, SubscriptionStatus, type FeatureUsageMap } from '@aprovamind/domain';
import { buildFeatureUsagePeriods } from '@aprovamind/domain/billing/usage-periods';
import { isAdminIdentity } from '@/lib/admin';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import {
  getFirestoreDocumentWithUserToken,
  setFirestoreDocumentWithUserToken,
} from '@/lib/server/firestoreRest';

const USER_STATS_COLLECTION = 'user_stats';

const PLAN_CANDIDATE_FIELDS = [
  'planTier',
  'aiPlanTier',
  'subscriptionTier',
  'planType',
  'tier',
] as const;

const STATUS_CANDIDATE_FIELDS = [
  'subscriptionStatus',
  'billingStatus',
  'planStatus',
  'status',
] as const;

const USAGE_CANDIDATE_FIELDS = [
  'entitlementUsage',
  'entitlementsUsage',
  'featureUsage',
  'featureUsageJson',
] as const;

type AdminTarget = {
  userId: string;
  email?: string | null;
};

type AdminSubscriptionBody = {
  userId?: string;
  email?: string;
  plan?: string;
  status?: string;
  usage?: FeatureUsageMap;
  resetUsage?: boolean;
};

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
  }>;
};

function normalizePlanCode(value: string | null | undefined): PlanCode {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized === PlanCode.Premium) return PlanCode.Premium;
  if (normalized === PlanCode.Pro) return PlanCode.Pro;
  return PlanCode.Free;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  const normalized = (value || '').trim().toLowerCase();

  switch (normalized) {
    case SubscriptionStatus.Trialing:
      return SubscriptionStatus.Trialing;
    case SubscriptionStatus.PastDue:
    case 'past-due':
      return SubscriptionStatus.PastDue;
    case SubscriptionStatus.GracePeriod:
    case 'grace':
      return SubscriptionStatus.GracePeriod;
    case SubscriptionStatus.Canceled:
    case 'cancelled':
      return SubscriptionStatus.Canceled;
    case SubscriptionStatus.Expired:
      return SubscriptionStatus.Expired;
    case SubscriptionStatus.Active:
    default:
      return SubscriptionStatus.Active;
  }
}

function toFeatureUsageMap(value: unknown): FeatureUsageMap | undefined {
  if (!value) return undefined;

  const parsed =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : value;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  const usageEntries = Object.entries(parsed).flatMap(([featureCode, rawValue]) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return [];
    }

    return [[featureCode, Math.floor(numericValue)]];
  });

  return usageEntries.length > 0
    ? (Object.fromEntries(usageEntries) as FeatureUsageMap)
    : undefined;
}

function extractPlanCode(data: Record<string, unknown> | undefined): PlanCode {
  if (!data) return PlanCode.Free;

  for (const field of PLAN_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return normalizePlanCode(raw);
    }
  }

  return PlanCode.Free;
}

function extractSubscriptionStatus(
  data: Record<string, unknown> | undefined
): SubscriptionStatus {
  if (!data) return SubscriptionStatus.Active;

  for (const field of STATUS_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return normalizeSubscriptionStatus(raw);
    }
  }

  return SubscriptionStatus.Active;
}

function extractUsage(data: Record<string, unknown> | undefined): FeatureUsageMap | undefined {
  if (!data) return undefined;

  for (const field of USAGE_CANDIDATE_FIELDS) {
    const usage = toFeatureUsageMap(data[field]);
    if (usage) return usage;
  }

  return undefined;
}

function buildResponse(
  target: AdminTarget,
  data?: Record<string, unknown>
) {
  const isAdminTarget = isAdminIdentity({
    uid: target.userId,
    email: target.email,
  });

  return {
    userId: target.userId,
    email: target.email ?? null,
    subscription: {
      userId: target.userId,
      plan: isAdminTarget ? PlanCode.Premium : extractPlanCode(data),
      status: isAdminTarget
        ? SubscriptionStatus.Active
        : extractSubscriptionStatus(data),
      usage: extractUsage(data),
    },
  };
}

function getFirebaseApiKey(): string | null {
  return (
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    null
  );
}

async function findFirebaseUserByEmail(email: string): Promise<AdminTarget | null> {
  const apiKey = getFirebaseApiKey();
  const normalizedEmail = email.trim().toLowerCase();

  if (!apiKey || !normalizedEmail) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: [normalizedEmail] }),
      cache: 'no-store',
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as FirebaseLookupResponse;
  const user = data.users?.[0];

  if (!user?.localId) return null;

  return {
    userId: user.localId,
    email: user.email || normalizedEmail,
  };
}

function resolveTargetFromQuery(request: NextRequest): {
  ok: true;
  target: AdminTarget;
} | {
  ok: false;
  response: NextResponse;
} {
  const rawUserId = request.nextUrl.searchParams.get('userId')?.trim() || '';
  const rawEmail = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || '';

  if (rawUserId) {
    return { ok: true, target: { userId: rawUserId } };
  }

  if (rawEmail) {
    return { ok: true, target: { userId: '', email: rawEmail } };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'invalid_target',
        message: 'Informe um UID ou e-mail valido para carregar a assinatura.',
      },
      { status: 400 }
    ),
  };
}

async function resolveTargetFromBody(body: AdminSubscriptionBody): Promise<{
  ok: true;
  target: AdminTarget;
} | {
  ok: false;
  response: NextResponse;
}> {
  const rawUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (rawUserId) {
    return { ok: true, target: { userId: rawUserId } };
  }

  if (rawEmail) {
    const target = await findFirebaseUserByEmail(rawEmail);
    if (target) {
      return { ok: true, target };
    }

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'user_not_found',
          message:
            'Nao foi possivel localizar esse e-mail no Firebase deste ambiente. Use o UID do tester.',
        },
        { status: 404 }
      ),
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'invalid_target',
        message: 'Informe um UID ou e-mail valido para atualizar a assinatura.',
      },
      { status: 400 }
    ),
  };
}

async function loadTargetState(params: {
  target: AdminTarget;
  idToken: string;
}): Promise<NextResponse> {
  const target =
    params.target.userId || !params.target.email
      ? params.target
      : await findFirebaseUserByEmail(params.target.email);

  if (!target?.userId) {
    return NextResponse.json(
      {
        error: 'user_not_found',
        message:
          'Nao foi possivel localizar esse e-mail no Firebase deste ambiente. Use o UID do tester.',
      },
      { status: 404 }
    );
  }

  const stats = await getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: target.userId,
    idToken: params.idToken,
  });

  if (!stats.ok) {
    return NextResponse.json(
      {
        error: 'subscription_state_read_failed',
        message: stats.error || 'Falha ao carregar assinatura do tester.',
      },
      { status: stats.status || 500 }
    );
  }

  return NextResponse.json(buildResponse(target, stats.data));
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ('response' in auth) {
    return auth.response;
  }

  if (!isAdminIdentity({ uid: auth.uid, email: auth.email })) {
    return NextResponse.json(
      {
        error: 'forbidden',
        message: 'Somente administradores podem consultar assinatura de testers.',
      },
      { status: 403 }
    );
  }

  const targetResolution = resolveTargetFromQuery(request);
  if (!targetResolution.ok) {
    return targetResolution.response;
  }

  return loadTargetState({
    target: targetResolution.target,
    idToken: auth.idToken,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ('response' in auth) {
    return auth.response;
  }

  if (!isAdminIdentity({ uid: auth.uid, email: auth.email })) {
    return NextResponse.json(
      {
        error: 'forbidden',
        message: 'Somente administradores podem alterar assinatura de testers.',
      },
      { status: 403 }
    );
  }

  let body: AdminSubscriptionBody;
  try {
    body = (await request.json()) as AdminSubscriptionBody;
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_json',
        message: 'Envie um JSON valido.',
      },
      { status: 400 }
    );
  }

  const targetResolution = await resolveTargetFromBody(body);
  if (!targetResolution.ok) {
    return targetResolution.response;
  }

  const plan =
    typeof body.plan === 'string' && body.plan.trim().length > 0
      ? normalizePlanCode(body.plan)
      : undefined;
  const status =
    typeof body.status === 'string' && body.status.trim().length > 0
      ? normalizeSubscriptionStatus(body.status)
      : undefined;
  const usage = toFeatureUsageMap(body.usage);
  const resetUsage = body.resetUsage === true;

  if (!plan && !status && !usage && !resetUsage) {
    return NextResponse.json(
      {
        error: 'empty_update',
        message: 'Envie ao menos plan, status, usage ou resetUsage=true.',
      },
      { status: 400 }
    );
  }

  const current = await getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: targetResolution.target.userId,
    idToken: auth.idToken,
  });

  if (!current.ok && current.status !== 404) {
    return NextResponse.json(
      {
        error: 'subscription_state_read_failed',
        message: current.error || 'Falha ao carregar assinatura do tester.',
      },
      { status: current.status || 500 }
    );
  }

  const currentData = (current.data as Record<string, unknown> | undefined) || {};
  const currentPlan = extractPlanCode(currentData);
  const currentStatus = extractSubscriptionStatus(currentData);

  const nextPlan = plan ?? currentPlan;
  const nextStatus = status ?? currentStatus;

  const patch: Record<string, string> = {
    subscriptionUpdatedAt: new Date().toISOString(),
  };

  if (plan) {
    patch.planTier = nextPlan;
  }

  if (status) {
    patch.subscriptionStatus = nextStatus;
  }

  if (resetUsage) {
    patch.entitlementUsage = '{}';
    patch.entitlementUsagePeriods = '{}';
  } else if (usage) {
    patch.entitlementUsage = JSON.stringify(usage);
    patch.entitlementUsagePeriods = JSON.stringify(
      buildFeatureUsagePeriods({
        plan: nextPlan,
        status: nextStatus,
        usage,
      })
    );
  }

  const write = await setFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: targetResolution.target.userId,
    idToken: auth.idToken,
    data: patch,
  });

  if (!write.ok) {
    return NextResponse.json(
      {
        error: 'subscription_state_write_failed',
        message: write.error || 'Falha ao salvar assinatura do tester.',
      },
      { status: write.status || 500 }
    );
  }

  return loadTargetState({
    target: targetResolution.target,
    idToken: auth.idToken,
  });
}
