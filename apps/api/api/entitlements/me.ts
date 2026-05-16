import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  resolveSandboxUserId,
  sendJson,
  sendNotFound,
  setCors,
  verifyRequestUser,
} from '../_standalone';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, {
      error: 'method_not_allowed',
      message: 'Use GET para carregar entitlements.',
    });
    return;
  }

  const sandboxUserId = resolveSandboxUserId(req);
  if (sandboxUserId) {
    const [{ GetUserEntitlements }, { ManualSubscriptionStateDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/billing/GetUserEntitlements'),
      import('../../src/modules/entitlements/manual-subscription-state-data-source'),
    ]);
    const result = await new GetUserEntitlements(
      new ManualSubscriptionStateDataSource()
    ).execute({ userId: sandboxUserId });
    if (!result.found) {
      sendNotFound(res, result.reason);
      return;
    }
    sendJson(res, 200, {
      userId: sandboxUserId,
      entitlements: result.entitlements,
      source: 'manual',
    });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) {
    sendJson(res, auth.statusCode, auth.payload);
    return;
  }

  try {
    const [{ GetUserEntitlements }, { FirestoreSubscriptionStateDataSource }] =
      await Promise.all([
        import('@aprovamind/application/use-cases/billing/GetUserEntitlements'),
        import('../../src/modules/entitlements/firestore-subscription-state-data-source'),
      ]);
    const result = await new GetUserEntitlements(
      new FirestoreSubscriptionStateDataSource({
        idToken: auth.idToken,
        identity: auth.identity,
      })
    ).execute({
      userId: auth.identity.uid,
      email: auth.identity.email,
    });
    if (!result.found) {
      sendNotFound(res, result.reason);
      return;
    }
    sendJson(res, 200, {
      userId: auth.identity.uid,
      entitlements: result.entitlements,
      source: 'authenticated',
    });
  } catch (error) {
    console.error('[api-entitlements] execution failed', error);
    sendJson(res, 500, {
      error: 'subscription_state_unavailable',
      message: 'Nao foi possivel carregar os entitlements do usuario.',
    });
  }
}
