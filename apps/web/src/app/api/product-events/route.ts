import { NextRequest, NextResponse } from 'next/server';
import type { ProductEventMetadata } from '@/lib/product-events/types';
import {
  isClientProductEventName,
  normalizeProductEventMetadata,
} from '@/lib/product-events/types';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { saveProductUsageEvent } from '@/lib/server/productEventStore';

type ClientProductEventBody = {
  eventName?: unknown;
  route?: unknown;
  surface?: unknown;
  featureCode?: unknown;
  recommendedPlan?: unknown;
  planTier?: unknown;
  ctaHref?: unknown;
  metadata?: unknown;
};

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readMetadata(value: unknown): ProductEventMetadata | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return normalizeProductEventMetadata(value as ProductEventMetadata);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ('response' in auth) {
    return auth.response;
  }

  let body: ClientProductEventBody;
  try {
    body = (await request.json()) as ClientProductEventBody;
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_json',
        message: 'Envie um JSON valido.',
      },
      { status: 400 }
    );
  }

  if (!isClientProductEventName(body.eventName)) {
    return NextResponse.json(
      {
        error: 'invalid_event_name',
        message: 'Evento de produto nao permitido nesta rota.',
      },
      { status: 400 }
    );
  }

  await saveProductUsageEvent(
    {
      actorUserId: auth.uid,
      userId: auth.uid,
      eventName: body.eventName,
      route: readOptionalString(body.route),
      surface: readOptionalString(body.surface),
      featureCode: readOptionalString(body.featureCode),
      recommendedPlan: readOptionalString(body.recommendedPlan),
      planTier: readOptionalString(body.planTier),
      ctaHref: readOptionalString(body.ctaHref),
      metadata: readMetadata(body.metadata),
    },
    auth.idToken
  );

  return NextResponse.json({ ok: true }, { status: 202 });
}
