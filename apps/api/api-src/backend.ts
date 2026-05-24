import type { IncomingMessage, ServerResponse } from 'node:http';

// Static imports to ensure Vercel bundles internal monorepo packages and local files at build time
import {
  verifyFirebaseIdToken,
  findFirebaseUserByEmail,
  setFirestoreDocumentWithUserToken,
  getFirestoreDocumentWithUserToken,
} from '@aprovamind/infrastructure-firebase';
import { LegacyEngineDataSource } from '@aprovamind/infrastructure-firebase/LegacyEngineDataSource';

import { listManualSubscriptionScenarios } from '../src/modules/entitlements/manual-subscription-state-data-source';
import { ManualSubscriptionStateDataSource } from '../src/modules/entitlements/manual-subscription-state-data-source';
import { FirestoreSubscriptionStateDataSource } from '../src/modules/entitlements/firestore-subscription-state-data-source';
import { FirestoreSubscriptionAdminDataSource } from '../src/modules/entitlements/firestore-subscription-admin-data-source';
import { loadAdminBetaSignalsSummary } from '../src/modules/entitlements/beta-signals';
import { saveProductUsageEvent } from '../src/modules/entitlements/product-event-store';
import { getAdminSession } from '../src/modules/billing/admin-auth';

import {
  defaultIsAdminIdentity,
  normalizePlanCode,
  normalizeSubscriptionStatus,
  toFeatureUsageMap,
} from '../src/modules/entitlements/subscription-state.shared';

import { GetUserEntitlements } from '@aprovamind/application/use-cases/billing/GetUserEntitlements';
import { GetPlanEngineSnapshot } from '@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot';
import { GetPortfolioSnapshot } from '@aprovamind/application/use-cases/engine/GetPortfolioSnapshot';
import { CreateCheckoutSession } from '@aprovamind/application/use-cases/billing/CreateCheckoutSession';
import { CancelSubscription } from '@aprovamind/application/use-cases/billing/CancelSubscription';
import { HandleBillingWebhook } from '@aprovamind/application/use-cases/billing/HandleBillingWebhook';

import { MercadoPagoBillingAdapter } from '@aprovamind/infrastructure-billing';

import {
  isPublicProductEventName,
  normalizeProductEventMetadata,
} from '@aprovamind/contracts/analytics/ProductEvents';


function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function setCors(req: IncomingMessage, res: ServerResponse, methods: string) {
  const origin = req.headers.origin;
  res.setHeader('access-control-allow-origin', typeof origin === 'string' ? origin : '*');
  res.setHeader('access-control-allow-methods', `${methods},OPTIONS`);
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization, X-AprovaMind-User-Id');
  res.setHeader('vary', 'Origin');
}

function extractBearerToken(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getIdentityFromTokenPayload(idToken: string): { uid: string; email?: string | null } | null {
  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;

  const uid = typeof payload.user_id === 'string'
    ? payload.user_id
    : typeof payload.sub === 'string'
      ? payload.sub
      : '';
  const email = typeof payload.email === 'string' ? payload.email : null;
  const issuer = typeof payload.iss === 'string' ? payload.iss : '';
  const audience = typeof payload.aud === 'string' ? payload.aud : '';
  const expiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1000);
  const envProjectId = (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    ''
  ).trim();
  const looksLikeFirebaseToken =
    issuer.startsWith('https://securetoken.google.com/') &&
    audience.length > 0 &&
    (!envProjectId || audience === envProjectId);

  if (!uid || !looksLikeFirebaseToken || expiresAt <= now) return null;

  return { uid, email };
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

function readQuery(req: IncomingMessage) {
  return new URL(req.url || '/', 'http://vercel.internal').searchParams;
}

async function verifyRequestUser(
  req: IncomingMessage,
  options: { allowDecodedFallback?: boolean } = {}
) {
  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    return {
      ok: false as const,
      statusCode: 401,
      payload: {
        error: 'unauthorized',
        message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
      },
    };
  }

  let identity: { uid: string; email?: string | null } | null = null;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    console.error('[api-auth] firebase token verification failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (!identity && options.allowDecodedFallback) {
    identity = getIdentityFromTokenPayload(idToken);
    if (identity) {
      console.warn('[api-auth] using decoded firebase token identity fallback', {
        uid: identity.uid,
        email: identity.email,
      });
    }
  }

  if (!identity) {
    return {
      ok: false as const,
      statusCode: 401,
      payload: {
        error: 'unauthorized',
        message: 'Token expirado ou invalido.',
      },
    };
  }

  return { ok: true as const, idToken, identity };
}

function resolveSandboxUserId(req: IncomingMessage): string | null {
  if (process.env.NODE_ENV === 'production') return null;

  const headerValue = req.headers['x-aprovamind-user-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  const queryUserId = readQuery(req).get('userId');
  return queryUserId?.trim() || null;
}

function sendNotFound(
  res: ServerResponse,
  reason: 'user_not_found' | 'subscription_not_found'
) {
  sendJson(res, 404, {
    error: reason,
    message:
      reason === 'user_not_found'
        ? 'Usuario nao encontrado.'
        : 'Assinatura de teste nao encontrada para o usuario informado.',
  });
}

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
    const result = await new GetUserEntitlements(new ManualSubscriptionStateDataSource())
      .execute({ userId: sandboxUserId });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: sandboxUserId, entitlements: result.entitlements, source: 'manual' });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
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
    const result = await new ManualSubscriptionStateDataSource()
      .getUserSubscriptionState({ userId: sandboxUserId });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: sandboxUserId, subscription: result.subscription, source: 'manual' });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
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

  const auth = await verifyRequestUser(req, { allowDecodedFallback: true });
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);

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
  const auth = await verifyRequestUser(req, { allowDecodedFallback: true });
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
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

async function handleBillingCheckout(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use POST para iniciar sessao de checkout.' });
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

  const interval = body?.interval;
  if (interval !== 'monthly' && interval !== 'annually') {
    sendJson(res, 400, {
      error: 'bad_request',
      message: 'Campo "interval" deve ser "monthly" ou "annually".',
    });
    return;
  }

  try {
    const adapter = new MercadoPagoBillingAdapter();
    const useCase = new CreateCheckoutSession(adapter);
    
    // Em modo de testes, mascara o e-mail para um e-mail de sandbox neutro para evitar erros de autocompra do Mercado Pago
    const isSandbox = process.env.MERCADO_PAGO_ACCESS_TOKEN?.startsWith('TEST-');
    const payerEmail = isSandbox
      ? `sandbox-buyer-${auth.identity.uid.slice(0, 8)}@aprovamind.com`
      : (auth.identity.email || 'sandbox-user@aprovamind.com');

    const result = await useCase.execute({
      userId: auth.identity.uid,
      email: payerEmail,
      interval,
    });
    sendJson(res, 200, {
      success: true,
      checkoutUrl: result.initPoint,
      checkoutId: result.checkoutId,
    });
  } catch (error: any) {
    console.error('[api-billing-checkout] execution failed', error);
    sendJson(res, 500, {
      error: 'checkout_error',
      message: error.message || 'Erro ao gerar sessao de checkout.',
    });
  }
}

class RestFirestoreAdminWriter {
  constructor(
    private readonly idToken: string,
    private readonly setDocFn: any,
    private readonly getDocFn: any
  ) {}

  async setDocument(
    collection: string,
    documentId: string,
    data: Record<string, any>
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.setDocFn({
      collection,
      documentId,
      data,
      idToken: this.idToken,
    });
    return {
      ok: result.ok,
      error: result.error,
    };
  }

  async getDocument(
    collection: string,
    documentId: string
  ): Promise<{ ok: boolean; exists?: boolean; data?: Record<string, any> }> {
    const result = await this.getDocFn({
      collection,
      documentId,
      idToken: this.idToken,
    });
    return {
      ok: result.ok,
      exists: result.exists,
      data: result.data,
    };
  }
}

async function handleBillingCancel(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use POST para cancelar assinatura.' });
    return;
  }

  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);

  try {
    const adapter = new MercadoPagoBillingAdapter();
    const adminSession = await getAdminSession();
    const writer = new RestFirestoreAdminWriter(
      adminSession.idToken,
      setFirestoreDocumentWithUserToken,
      getFirestoreDocumentWithUserToken
    );
    const useCase = new CancelSubscription(adapter, writer);
    const result = await useCase.execute({
      userId: auth.identity.uid,
    });
    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('[api-billing-cancel] execution failed', error);
    sendJson(res, 500, {
      error: 'cancel_error',
      message: error.message || 'Erro ao cancelar assinatura.',
    });
  }
}

async function handleBillingWebhook(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return void (res.statusCode = 204, res.end());
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use POST para receber webhook.' });
    return;
  }

  let body: Record<string, unknown> | null = null;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString('utf-8');
  try {
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'bad_request', message: 'JSON invalido.' });
    return;
  }

  const signature = req.headers['x-signature'] as string;
  const requestId = req.headers['x-request-id'] as string;

  try {
    const adapter = new MercadoPagoBillingAdapter();
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
    if (secret) {
      const isValid = adapter.verifyWebhookSignature(signature || '', requestId || '', rawBody);
      if (!isValid) {
        sendJson(res, 400, {
          error: 'invalid_signature',
          message: 'Assinatura digital do webhook inválida ou ausente.',
        });
        return;
      }
    }

    const eventId = (body?.id ?? requestId ?? '').toString();
    const rawTopic = (body?.topic ?? body?.type ?? '').toString();
    let topic = '';
    if (rawTopic.includes('payment')) {
      topic = 'payment';
    } else if (rawTopic.includes('preapproval')) {
      topic = 'preapproval';
    } else {
      topic = rawTopic;
    }
    const dataObj = body?.data as Record<string, unknown> | undefined;
    const resourceId = (dataObj?.id ?? (body?.resource as string)?.split('/').pop() ?? '').toString();

    if (!eventId || !topic || !resourceId) {
      console.warn({ eventId, topic, resourceId }, 'Webhook recebido com parâmetros incompletos.');
      sendJson(res, 200, { status: 'ignored', reason: 'incomplete_parameters' });
      return;
    }

    const adminSession = await getAdminSession();
    const writer = new RestFirestoreAdminWriter(
      adminSession.idToken,
      setFirestoreDocumentWithUserToken,
      getFirestoreDocumentWithUserToken
    );
    const useCase = new HandleBillingWebhook(adapter, writer);
    const result = await useCase.execute({
      eventId,
      topic,
      resourceId,
    });

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('[api-billing-webhook] execution failed', error);
    sendJson(res, 500, {
      error: 'webhook_error',
      message: error.message || 'Erro ao processar webhook.',
    });
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
    case 'billing-checkout':
      return handleBillingCheckout(req, res);
    case 'billing-cancel':
      return handleBillingCancel(req, res);
    case 'billing-webhook-mercadopago':
      return handleBillingWebhook(req, res);
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleBackendRequest(req, res);
}
