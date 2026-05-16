import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  readJsonBody,
  sendJson,
  setCors,
  verifyRequestUser,
} from '../_standalone';

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
      message: 'Use POST para carregar o snapshot do Engine.',
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

  const planId =
    typeof body?.planId === 'string'
      ? body.planId.trim() || null
      : body?.planId === null
        ? null
        : undefined;
  const maxRecommendations = typeof body?.maxRecommendations === 'number'
    ? body.maxRecommendations
    : 3;

  if (planId === null) {
    sendJson(res, 200, {
      found: false,
      reason: 'no_active_plan',
      message: 'Selecione um edital ativo no Planner para usar o Engine.',
    });
    return;
  }

  if (
    !Number.isInteger(maxRecommendations) ||
    maxRecommendations < 1 ||
    maxRecommendations > 5
  ) {
    sendJson(res, 400, {
      error: 'bad_request',
      message: 'Campo "maxRecommendations" deve ser um inteiro entre 1 e 5.',
    });
    return;
  }

  try {
    const [{ GetPlanEngineSnapshot }, { LegacyEngineDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot'),
      import('@aprovamind/infrastructure-firebase/LegacyEngineDataSource'),
    ]);
    const result = await new GetPlanEngineSnapshot(
      new LegacyEngineDataSource(auth.idToken)
    ).execute({
      userId: auth.identity.uid,
      today: getServerTodayIso(),
      planId,
      maxRecommendations,
    });
    sendJson(res, 200, result);
  } catch (error) {
    console.error('[api-engine-snapshot] execution failed', error);
    sendJson(res, 500, {
      error: 'engine_error',
      message: 'Erro ao carregar o snapshot do motor.',
    });
  }
}
