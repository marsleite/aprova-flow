import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  readJsonBody,
  readQuery,
  resolveSandboxUserId,
  sendJson,
  sendNotFound,
  setCors,
  verifyRequestUser,
} from './standalone';

function getRoute(req: IncomingMessage): string {
  return readQuery(req).get('__route') || '';
}

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

async function handleEntitlementsScenarios(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET para listar cenarios manuais.' });
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    sendJson(res, 404, { error: 'not_found', message: 'Cenarios manuais nao estao disponiveis neste ambiente.' });
    return;
  }
  const { listManualSubscriptionScenarios } = await import(
    '../modules/entitlements/manual-subscription-state-data-source'
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

async function handleEntitlementsMe(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET para carregar entitlements.' });
    return;
  }

  const sandboxUserId = resolveSandboxUserId(req);
  if (sandboxUserId) {
    const [{ GetUserEntitlements }, { ManualSubscriptionStateDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/billing/GetUserEntitlements'),
      import('../modules/entitlements/manual-subscription-state-data-source'),
    ]);
    const result = await new GetUserEntitlements(new ManualSubscriptionStateDataSource())
      .execute({ userId: sandboxUserId });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: sandboxUserId, entitlements: result.entitlements, source: 'manual' });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    const [{ GetUserEntitlements }, { FirestoreSubscriptionStateDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/billing/GetUserEntitlements'),
      import('../modules/entitlements/firestore-subscription-state-data-source'),
    ]);
    const result = await new GetUserEntitlements(
      new FirestoreSubscriptionStateDataSource({ idToken: auth.idToken, identity: auth.identity })
    ).execute({ userId: auth.identity.uid, email: auth.identity.email });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: auth.identity.uid, entitlements: result.entitlements, source: 'authenticated' });
  } catch (error) {
    console.error('[api-entitlements] execution failed', error);
    sendJson(res, 500, { error: 'subscription_state_unavailable', message: 'Nao foi possivel carregar os entitlements do usuario.' });
  }
}

async function handleSubscriptionMe(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET para carregar assinatura.' });
    return;
  }

  const sandboxUserId = resolveSandboxUserId(req);
  if (sandboxUserId) {
    const { ManualSubscriptionStateDataSource } = await import(
      '../modules/entitlements/manual-subscription-state-data-source'
    );
    const result = await new ManualSubscriptionStateDataSource()
      .getUserSubscriptionState({ userId: sandboxUserId });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: sandboxUserId, subscription: result.subscription, source: 'manual' });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    const { FirestoreSubscriptionStateDataSource } = await import(
      '../modules/entitlements/firestore-subscription-state-data-source'
    );
    const result = await new FirestoreSubscriptionStateDataSource({
      idToken: auth.idToken,
      identity: auth.identity,
    }).getUserSubscriptionState({ userId: auth.identity.uid, email: auth.identity.email });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: auth.identity.uid, subscription: result.subscription, source: 'authenticated' });
  } catch (error) {
    console.error('[api-subscription] execution failed', error);
    sendJson(res, 500, { error: 'subscription_state_unavailable', message: 'Nao foi possivel carregar a assinatura do usuario.' });
  }
}

async function handleAdminSubscription(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET,POST');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET ou POST para gerenciar assinatura de tester.' });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);

  const [
    { findFirebaseUserByEmail },
    { defaultIsAdminIdentity, normalizePlanCode, normalizeSubscriptionStatus, toFeatureUsageMap },
    { FirestoreSubscriptionAdminDataSource },
  ] = await Promise.all([
    import('@aprovamind/infrastructure-firebase'),
    import('../modules/entitlements/subscription-state.shared'),
    import('../modules/entitlements/firestore-subscription-admin-data-source'),
  ]);

  if (!defaultIsAdminIdentity(auth.identity)) {
    sendJson(res, 403, { error: 'forbidden', message: 'Somente administradores podem alterar assinatura de testers.' });
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
      sendJson(res, 400, { error: 'bad_request', message: 'JSON invalido.' });
      return;
    }
    userId = typeof body?.userId === 'string' ? body.userId.trim() : userId;
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : email;
  }

  if (!userId && !email) {
    sendJson(res, 400, { error: 'invalid_target', message: 'Informe um UID ou e-mail valido.' });
    return;
  }
  if (email && !isLikelyEmail(email)) {
    sendJson(res, 400, { error: 'invalid_email', message: 'Informe um e-mail valido.' });
    return;
  }
  if (!userId) {
    const found = await findFirebaseUserByEmail(email);
    if (!found?.uid) {
      sendJson(res, 404, { error: 'user_not_found', message: 'Usuario nao encontrado para o e-mail informado.' });
      return;
    }
    userId = found.uid;
    email = found.email || email;
  }

  const dataSource = new FirestoreSubscriptionAdminDataSource({ idToken: auth.idToken, identity: auth.identity });
  try {
    if (req.method === 'GET') {
      const result = await dataSource.getUserSubscriptionState({ userId, email });
      if (!result.found) return sendNotFound(res, result.reason);
      sendJson(res, 200, { userId, email, subscription: result.subscription });
      return;
    }

    const hasPlan = typeof body?.plan === 'string' && body.plan.trim().length > 0;
    const hasStatus = typeof body?.status === 'string' && body.status.trim().length > 0;
    const hasUsage = body?.usage && typeof body.usage === 'object';
    const resetUsage = body?.resetUsage === true;
    if (!hasPlan && !hasStatus && !hasUsage && !resetUsage) {
      sendJson(res, 400, { error: 'empty_update', message: 'Envie ao menos plan, status, usage ou resetUsage=true.' });
      return;
    }
    const usage = hasUsage ? toFeatureUsageMap(body?.usage) : undefined;
    if (hasUsage && !usage) {
      sendJson(res, 400, { error: 'invalid_usage', message: 'usage precisa ser um objeto com contadores numericos nao negativos.' });
      return;
    }
    const result = await dataSource.updateUserSubscriptionState({
      userId,
      plan: hasPlan ? normalizePlanCode(body?.plan as string) : undefined,
      status: hasStatus ? normalizeSubscriptionStatus(body?.status as string) : undefined,
      usage,
      resetUsage,
    });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId, email, subscription: result.subscription });
  } catch (error) {
    console.error('[api-admin-subscription] execution failed', error);
    sendJson(res, 500, {
      error: req.method === 'GET' ? 'subscription_state_unavailable' : 'subscription_state_update_failed',
      message: req.method === 'GET'
        ? 'Nao foi possivel carregar a assinatura do usuario informado.'
        : 'Nao foi possivel atualizar a assinatura do usuario informado.',
    });
  }
}

async function handleBetaSignals(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET para carregar os sinais do beta.' });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    const [{ defaultIsAdminIdentity }, { loadAdminBetaSignalsSummary }] = await Promise.all([
      import('../modules/entitlements/subscription-state.shared'),
      import('../modules/entitlements/beta-signals'),
    ]);
    if (!defaultIsAdminIdentity(auth.identity)) {
      sendJson(res, 403, { error: 'forbidden', message: 'Somente administradores podem revisar sinais do beta.' });
      return;
    }
    const rawWindowDays = Number(readQuery(req).get('windowDays'));
    const windowDays = Number.isFinite(rawWindowDays) && rawWindowDays > 0
      ? Math.min(30, Math.floor(rawWindowDays))
      : 7;
    const summary = await loadAdminBetaSignalsSummary({ idToken: auth.idToken, windowDays });
    sendJson(res, 200, summary);
  } catch (error) {
    console.error('[api-beta-signals] execution failed', error);
    sendJson(res, 500, { error: 'beta_signals_fetch_failed', message: 'Nao foi possivel carregar os sinais do beta.' });
  }
}

async function handleEngineSnapshot(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use POST para carregar o snapshot do Engine.' });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  let body: Record<string, unknown> | null = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'bad_request', message: 'JSON invalido.' });
    return;
  }
  const planId = typeof body?.planId === 'string'
    ? body.planId.trim() || null
    : body?.planId === null
      ? null
      : undefined;
  const maxRecommendations = typeof body?.maxRecommendations === 'number' ? body.maxRecommendations : 3;
  if (planId === null) {
    sendJson(res, 200, { found: false, reason: 'no_active_plan', message: 'Selecione um edital ativo no Planner para usar o Engine.' });
    return;
  }
  if (!Number.isInteger(maxRecommendations) || maxRecommendations < 1 || maxRecommendations > 5) {
    sendJson(res, 400, { error: 'bad_request', message: 'Campo "maxRecommendations" deve ser um inteiro entre 1 e 5.' });
    return;
  }
  try {
    const [{ GetPlanEngineSnapshot }, { LegacyEngineDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot'),
      import('@aprovamind/infrastructure-firebase/LegacyEngineDataSource'),
    ]);
    const result = await new GetPlanEngineSnapshot(new LegacyEngineDataSource(auth.idToken))
      .execute({ userId: auth.identity.uid, today: getServerTodayIso(), planId, maxRecommendations });
    sendJson(res, 200, result);
  } catch (error) {
    console.error('[api-engine-snapshot] execution failed', error);
    sendJson(res, 500, { error: 'engine_error', message: 'Erro ao carregar o snapshot do motor.' });
  }
}

async function handleEnginePortfolio(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET para carregar o portfolio do Engine.' });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  const rawBudget = readQuery(req).get('globalWeeklyBudget');
  const globalWeeklyBudget = rawBudget && rawBudget.trim().length > 0 ? Number(rawBudget) : 30;
  if (!Number.isInteger(globalWeeklyBudget) || globalWeeklyBudget <= 0) {
    sendJson(res, 400, { error: 'bad_request', message: 'Query "globalWeeklyBudget" deve ser um inteiro maior que zero.' });
    return;
  }
  try {
    const [{ GetPortfolioSnapshot }, { LegacyEngineDataSource }] = await Promise.all([
      import('@aprovamind/application/use-cases/engine/GetPortfolioSnapshot'),
      import('@aprovamind/infrastructure-firebase/LegacyEngineDataSource'),
    ]);
    const result = await new GetPortfolioSnapshot(new LegacyEngineDataSource(auth.idToken))
      .execute({ userId: auth.identity.uid, today: getServerTodayIso(), globalWeeklyBudget });
    sendJson(res, 200, result);
  } catch (error) {
    console.error('[api-engine-portfolio] execution failed', error);
    sendJson(res, 500, { error: 'engine_error', message: 'Erro ao carregar o portfólio multi-edital.' });
  }
}

async function handleProductEvents(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use POST para registrar eventos de produto.' });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  let body: Record<string, unknown> | null = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'bad_request', message: 'JSON invalido.' });
    return;
  }
  const [{ isPublicProductEventName, normalizeProductEventMetadata }, { saveProductUsageEvent }] =
    await Promise.all([
      import('@aprovamind/contracts/analytics/ProductEvents'),
      import('../modules/entitlements/product-event-store'),
    ]);
  if (!isPublicProductEventName(body?.eventName)) {
    sendJson(res, 400, { error: 'invalid_event_name', message: 'Evento de produto nao permitido nesta rota.' });
    return;
  }
  const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? normalizeProductEventMetadata(body.metadata as never)
    : undefined;
  try {
    await saveProductUsageEvent({
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
    }, auth.idToken);
    sendJson(res, 202, { ok: true });
  } catch (error) {
    console.error('[api-product-events] execution failed', error);
    sendJson(res, 500, { error: 'product_event_write_failed', message: 'Nao foi possivel registrar o evento de produto.' });
  }
}

export async function handleBackendRequest(req: IncomingMessage, res: ServerResponse) {
  const route = getRoute(req);
  switch (route) {
    case 'entitlements-me':
      return handleEntitlementsMe(req, res);
    case 'entitlements-scenarios':
      return handleEntitlementsScenarios(req, res);
    case 'billing-subscription-me':
      return handleSubscriptionMe(req, res);
    case 'billing-admin-subscription':
      return handleAdminSubscription(req, res);
    case 'billing-admin-beta-signals':
      return handleBetaSignals(req, res);
    case 'engine-snapshot':
      return handleEngineSnapshot(req, res);
    case 'engine-portfolio':
      return handleEnginePortfolio(req, res);
    case 'product-events':
      return handleProductEvents(req, res);
    default:
      return sendJson(res, 404, { error: 'not_found', message: 'Rota de API nao encontrada.' });
  }
}
