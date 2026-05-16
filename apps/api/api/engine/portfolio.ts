import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  readQuery,
  sendJson,
  setCors,
  verifyRequestUser,
} from '../_standalone';

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
      message: 'Use GET para carregar o portfolio do Engine.',
    });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) {
    sendJson(res, auth.statusCode, auth.payload);
    return;
  }

  const rawBudget = readQuery(req).get('globalWeeklyBudget');
  const globalWeeklyBudget = rawBudget && rawBudget.trim().length > 0
    ? Number(rawBudget)
    : 30;

  if (!Number.isInteger(globalWeeklyBudget) || globalWeeklyBudget <= 0) {
    sendJson(res, 400, {
      error: 'bad_request',
      message: 'Query "globalWeeklyBudget" deve ser um inteiro maior que zero.',
    });
    return;
  }

  try {
    const [{ GetPortfolioSnapshot }, { LegacyEngineDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/engine/GetPortfolioSnapshot'),
      import('@aprovamind/infrastructure-firebase/LegacyEngineDataSource'),
    ]);
    const result = await new GetPortfolioSnapshot(
      new LegacyEngineDataSource(auth.idToken)
    ).execute({
      userId: auth.identity.uid,
      today: getServerTodayIso(),
      globalWeeklyBudget,
    });
    sendJson(res, 200, result);
  } catch (error) {
    console.error('[api-engine-portfolio] execution failed', error);
    sendJson(res, 500, {
      error: 'engine_error',
      message: 'Erro ao carregar o portfólio multi-edital.',
    });
  }
}
