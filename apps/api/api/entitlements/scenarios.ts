import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson, setCors } from '../_standalone';

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
      message: 'Use GET para listar cenarios manuais.',
    });
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    sendJson(res, 404, {
      error: 'not_found',
      message: 'Cenarios manuais nao estao disponiveis neste ambiente.',
    });
    return;
  }

  const { listManualSubscriptionScenarios } = await import(
    '../../src/modules/entitlements/manual-subscription-state-data-source'
  );

  sendJson(res, 200, {
    scenarios: listManualSubscriptionScenarios().map((scenario) => ({
      userId: scenario.userId,
      plan: scenario.plan,
      status: scenario.status,
      description: scenario.description,
    })),
  });
}
