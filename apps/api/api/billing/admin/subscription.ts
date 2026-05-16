import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  readJsonBody,
  readQuery,
  sendJson,
  sendNotFound,
  setCors,
  verifyRequestUser,
} from '../../_standalone';

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET,POST');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, {
      error: 'method_not_allowed',
      message: 'Use GET ou POST para gerenciar assinatura de tester.',
    });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) {
    sendJson(res, auth.statusCode, auth.payload);
    return;
  }

  const [
    { findFirebaseUserByEmail },
    { defaultIsAdminIdentity, normalizePlanCode, normalizeSubscriptionStatus, toFeatureUsageMap },
    { FirestoreSubscriptionAdminDataSource },
  ] = await Promise.all([
    import('@aprovamind/infrastructure-firebase'),
    import('../../../src/modules/entitlements/subscription-state.shared'),
    import('../../../src/modules/entitlements/firestore-subscription-admin-data-source'),
  ]);

  if (!defaultIsAdminIdentity(auth.identity)) {
    sendJson(res, 403, {
      error: 'forbidden',
      message: 'Somente administradores podem alterar assinatura de testers.',
    });
    return;
  }

  const query = readQuery(req);
  let userId = query.get('userId')?.trim() || '';
  let email = query.get('email')?.trim().toLowerCase() || '';
  let body: Record<string, unknown> | null = null;

  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, {
        error: 'bad_request',
        message: 'JSON invalido.',
      });
      return;
    }

    userId = typeof body?.userId === 'string' ? body.userId.trim() : userId;
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : email;
  }

  if (!userId && !email) {
    sendJson(res, 400, {
      error: 'invalid_target',
      message: 'Informe um UID ou e-mail valido.',
    });
    return;
  }

  if (email && !isLikelyEmail(email)) {
    sendJson(res, 400, {
      error: 'invalid_email',
      message: 'Informe um e-mail valido.',
    });
    return;
  }

  if (!userId) {
    const found = await findFirebaseUserByEmail(email);
    if (!found?.uid) {
      sendJson(res, 404, {
        error: 'user_not_found',
        message: 'Usuario nao encontrado para o e-mail informado.',
      });
      return;
    }
    userId = found.uid;
    email = found.email || email;
  }

  const dataSource = new FirestoreSubscriptionAdminDataSource({
    idToken: auth.idToken,
    identity: auth.identity,
  });

  try {
    if (req.method === 'GET') {
      const result = await dataSource.getUserSubscriptionState({ userId, email });
      if (!result.found) {
        sendNotFound(res, result.reason);
        return;
      }
      sendJson(res, 200, {
        userId,
        email,
        subscription: result.subscription,
      });
      return;
    }

    const hasPlan = typeof body?.plan === 'string' && body.plan.trim().length > 0;
    const hasStatus = typeof body?.status === 'string' && body.status.trim().length > 0;
    const hasUsage = body?.usage && typeof body.usage === 'object';
    const resetUsage = body?.resetUsage === true;

    if (!hasPlan && !hasStatus && !hasUsage && !resetUsage) {
      sendJson(res, 400, {
        error: 'empty_update',
        message: 'Envie ao menos plan, status, usage ou resetUsage=true.',
      });
      return;
    }

    const usage = hasUsage ? toFeatureUsageMap(body?.usage) : undefined;
    if (hasUsage && !usage) {
      sendJson(res, 400, {
        error: 'invalid_usage',
        message: 'usage precisa ser um objeto com contadores numericos nao negativos.',
      });
      return;
    }

    const result = await dataSource.updateUserSubscriptionState({
      userId,
      plan: hasPlan ? normalizePlanCode(body?.plan as string) : undefined,
      status: hasStatus ? normalizeSubscriptionStatus(body?.status as string) : undefined,
      usage,
      resetUsage,
    });
    if (!result.found) {
      sendNotFound(res, result.reason);
      return;
    }

    sendJson(res, 200, {
      userId,
      email,
      subscription: result.subscription,
    });
  } catch (error) {
    console.error('[api-admin-subscription] execution failed', error);
    sendJson(res, 500, {
      error: req.method === 'GET'
        ? 'subscription_state_unavailable'
        : 'subscription_state_update_failed',
      message: req.method === 'GET'
        ? 'Nao foi possivel carregar a assinatura do usuario informado.'
        : 'Nao foi possivel atualizar a assinatura do usuario informado.',
    });
  }
}
