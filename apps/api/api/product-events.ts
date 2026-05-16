import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  readJsonBody,
  sendJson,
  setCors,
  verifyRequestUser,
} from './_standalone';

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'POST');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      error: 'method_not_allowed',
      message: 'Use POST para registrar eventos de produto.',
    });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) {
    sendJson(res, auth.statusCode, auth.payload);
    return;
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, {
      error: 'bad_request',
      message: 'JSON invalido.',
    });
    return;
  }

  const [{ isPublicProductEventName, normalizeProductEventMetadata }, { saveProductUsageEvent }] =
    await Promise.all([
      import('@aprovamind/contracts/analytics/ProductEvents'),
      import('../src/modules/entitlements/product-event-store'),
    ]);

  if (!isPublicProductEventName(body?.eventName)) {
    sendJson(res, 400, {
      error: 'invalid_event_name',
      message: 'Evento de produto nao permitido nesta rota.',
    });
    return;
  }

  const metadata =
    body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? normalizeProductEventMetadata(body.metadata as never)
      : undefined;

  try {
    await saveProductUsageEvent(
      {
        actorUserId: auth.identity.uid,
        userId: auth.identity.uid,
        eventName: body.eventName,
        route: readOptionalString(body.route),
        surface: readOptionalString(body.surface),
        featureCode: readOptionalString(body.featureCode),
        recommendedPlan: readOptionalString(body.recommendedPlan),
        planTier: readOptionalString(body.planTier),
        task: readOptionalString(body.task),
        ctaHref: readOptionalString(body.ctaHref),
        metadata,
      },
      auth.idToken
    );
    sendJson(res, 202, { ok: true });
  } catch (error) {
    console.error('[api-product-events] execution failed', error);
    sendJson(res, 500, {
      error: 'product_event_write_failed',
      message: 'Nao foi possivel registrar o evento de produto.',
    });
  }
}
