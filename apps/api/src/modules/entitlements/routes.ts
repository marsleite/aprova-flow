import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  ProductEventInput,
  ProductEventMetadata,
} from '@aprovamind/contracts/analytics/ProductEvents';
import type { BetaSignalsSummary } from '@aprovamind/contracts/analytics/BetaSignals';
import { GetUserEntitlements } from '@aprovamind/application/use-cases/billing/GetUserEntitlements';
import type { SubscriptionStateDataSource } from '@aprovamind/application/ports/SubscriptionStateDataSource';
import {
  buildPlanStatusChangedEvent,
  buildTesterSubscriptionUpdatedEvent,
  isPublicProductEventName,
  normalizeProductEventMetadata,
} from '@aprovamind/contracts/analytics/ProductEvents';
import {
  PlanCode,
  SubscriptionStatus,
  type FeatureUsageMap,
} from '@aprovamind/domain';
import type { VerifiedFirebaseUser } from '@aprovamind/infrastructure-firebase';
import {
  extractBearerToken,
  findFirebaseUserByEmail,
  verifyFirebaseIdToken,
} from '@aprovamind/infrastructure-firebase';
import {
  FirestoreSubscriptionAdminDataSource,
  type SubscriptionAdminDataSource,
} from './firestore-subscription-admin-data-source';
import { FirestoreSubscriptionStateDataSource } from './firestore-subscription-state-data-source';
import {
  ManualSubscriptionStateDataSource,
  listManualSubscriptionScenarios,
} from './manual-subscription-state-data-source';
import {
  defaultIsAdminIdentity,
  normalizePlanCode,
  normalizeSubscriptionStatus,
  toFeatureUsageMap,
} from './subscription-state.shared';
import { saveProductUsageEvent as persistProductUsageEvent } from './product-event-store';
import { loadAdminBetaSignalsSummary as loadAdminBetaSignalsSummaryDefault } from './beta-signals';

interface EntitlementsMeQuerystring {
  userId?: string;
}

interface AdminSubscriptionQuerystring {
  userId?: string;
  email?: string;
}

interface AdminBetaSignalsQuerystring {
  windowDays?: string;
}

interface AdminSubscriptionBody {
  userId?: string;
  email?: string;
  plan?: string;
  status?: string;
  usage?: FeatureUsageMap;
  resetUsage?: boolean;
}

interface PublicProductEventBody {
  eventName?: unknown;
  route?: unknown;
  surface?: unknown;
  featureCode?: unknown;
  recommendedPlan?: unknown;
  planTier?: unknown;
  task?: unknown;
  ctaHref?: unknown;
  metadata?: unknown;
}

export interface EntitlementRouteOptions {
  createManualDataSource?: () => SubscriptionStateDataSource;
  createRealDataSource?: (params: {
    idToken: string;
    identity: VerifiedFirebaseUser;
  }) => SubscriptionStateDataSource;
  createAdminDataSource?: (params: {
    idToken: string;
    identity: VerifiedFirebaseUser;
  }) => SubscriptionAdminDataSource;
  verifyIdToken?: (idToken: string) => Promise<VerifiedFirebaseUser | null>;
  findUserByEmail?: (email: string) => Promise<VerifiedFirebaseUser | null>;
  isAdminIdentity?: (identity: VerifiedFirebaseUser) => boolean;
  saveProductUsageEvent?: (
    event: ProductEventInput,
    idToken: string
  ) => Promise<void> | void;
  loadAdminBetaSignalsSummary?: (params: {
    idToken: string;
    windowDays: number;
  }) => Promise<BetaSignalsSummary>;
  allowManualScenarios?: boolean;
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readMetadata(value: unknown): ProductEventMetadata | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return normalizeProductEventMetadata(value as ProductEventMetadata);
}

function resolveRequestedUserId(
  request: FastifyRequest<{ Querystring: EntitlementsMeQuerystring }>,
  allowManualScenarios: boolean
): string | null {
  if (!allowManualScenarios) {
    return null;
  }

  const headerValue = request.headers['x-aprovamind-user-id'];
  const headerUserId =
    typeof headerValue === 'string' && headerValue.trim().length > 0
      ? headerValue.trim()
      : null;

  if (headerUserId) {
    return headerUserId;
  }

  const queryUserId =
    typeof request.query.userId === 'string' && request.query.userId.trim().length > 0
      ? request.query.userId.trim()
      : null;

  return queryUserId;
}

function buildUnauthorizedReply(reply: FastifyReply) {
  return reply.code(401).send({
    error: 'unauthorized',
    message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
  });
}

function readWindowDays(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.min(30, Math.floor(parsed));
}

function buildManualDataSource(options: EntitlementRouteOptions): SubscriptionStateDataSource {
  return options.createManualDataSource?.() ?? new ManualSubscriptionStateDataSource();
}

function buildRealDataSource(
  options: EntitlementRouteOptions,
  params: { idToken: string; identity: VerifiedFirebaseUser }
): SubscriptionStateDataSource {
  return (
    options.createRealDataSource?.(params) ??
    new FirestoreSubscriptionStateDataSource({
      idToken: params.idToken,
      identity: params.identity,
    })
  );
}

function buildAdminDataSource(
  options: EntitlementRouteOptions,
  params: { idToken: string; identity: VerifiedFirebaseUser }
): SubscriptionAdminDataSource {
  return (
    options.createAdminDataSource?.(params) ??
    new FirestoreSubscriptionAdminDataSource({
      idToken: params.idToken,
      identity: params.identity,
    })
  );
}

async function resolveAuthenticatedIdentity(
  request: FastifyRequest,
  reply: FastifyReply,
  options: EntitlementRouteOptions,
  app: FastifyInstance
): Promise<{ idToken: string; identity: VerifiedFirebaseUser } | null> {
  await app.authenticate(request, reply);
  if (reply.sent) return null;
  
  const authHeader = request.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s/i, '').trim();

  return {
    idToken,
    identity: request.user as VerifiedFirebaseUser,
  };
}

function ensureAdminIdentity(
  reply: FastifyReply,
  identity: VerifiedFirebaseUser,
  options: EntitlementRouteOptions,
  message = 'Somente administradores podem alterar assinatura de testers.'
): boolean {
  const isAdmin = options.isAdminIdentity ?? defaultIsAdminIdentity;
  if (isAdmin(identity)) {
    return true;
  }

  void reply.code(403).send({
    error: 'forbidden',
    message,
  });
  return false;
}

function parseAdminSubscriptionBody(
  body: AdminSubscriptionBody | undefined
): {
  valid: true;
  payload: {
    userId?: string;
    email?: string;
    plan?: PlanCode;
    status?: SubscriptionStatus;
    usage?: FeatureUsageMap;
    resetUsage?: boolean;
  };
} | {
  valid: false;
  statusCode: number;
  error: string;
  message: string;
} {
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!userId && !email) {
    return {
      valid: false,
      statusCode: 400,
      error: 'invalid_target',
      message: 'Informe um UID ou e-mail valido para atualizar a assinatura.',
    };
  }

  if (email && !isLikelyEmail(email)) {
    return {
      valid: false,
      statusCode: 400,
      error: 'invalid_email',
      message: 'Informe um e-mail valido.',
    };
  }

  const hasPlan = typeof body?.plan === 'string' && body.plan.trim().length > 0;
  const hasStatus =
    typeof body?.status === 'string' && body.status.trim().length > 0;
  const hasUsage = body?.usage && typeof body.usage === 'object';
  const resetUsage = body?.resetUsage === true;

  if (!hasPlan && !hasStatus && !hasUsage && !resetUsage) {
    return {
      valid: false,
      statusCode: 400,
      error: 'empty_update',
      message: 'Envie ao menos plan, status, usage ou resetUsage=true.',
    };
  }

  const payload: {
    userId?: string;
    email?: string;
    plan?: PlanCode;
    status?: SubscriptionStatus;
    usage?: FeatureUsageMap;
    resetUsage?: boolean;
  } = {};

  if (userId) payload.userId = userId;
  if (email) payload.email = email;

  if (hasPlan) {
    if (!Object.values(PlanCode).includes(body?.plan?.trim().toLowerCase() as PlanCode)) {
      return {
        valid: false,
        statusCode: 400,
        error: 'invalid_plan',
        message: 'plan precisa ser free ou pro.',
      };
    }
    payload.plan = normalizePlanCode(body?.plan);
  }

  if (hasStatus) {
    const normalizedRawStatus = body?.status?.trim().toLowerCase() || '';
    const allowedStatuses = new Set<string>([
      SubscriptionStatus.Trialing,
      SubscriptionStatus.Active,
      SubscriptionStatus.PastDue,
      SubscriptionStatus.GracePeriod,
      SubscriptionStatus.Canceled,
      SubscriptionStatus.Expired,
      'past-due',
      'grace',
      'cancelled',
    ]);
    if (!allowedStatuses.has(normalizedRawStatus)) {
      return {
        valid: false,
        statusCode: 400,
        error: 'invalid_status',
        message:
          'status precisa ser trialing, active, past_due, grace_period, canceled ou expired.',
      };
    }
    payload.status = normalizeSubscriptionStatus(body?.status);
  }

  if (hasUsage) {
    const usage = toFeatureUsageMap(body?.usage);
    if (!usage) {
      return {
        valid: false,
        statusCode: 400,
        error: 'invalid_usage',
        message: 'usage precisa ser um objeto com contadores numericos nao negativos.',
      };
    }
    payload.usage = usage;
  }

  if (resetUsage) {
    payload.resetUsage = true;
  }

  return {
    valid: true,
    payload,
  };
}

async function resolveAdminTarget(params: {
  userId?: string | null;
  email?: string | null;
  options: EntitlementRouteOptions;
}): Promise<
  | { ok: true; target: { userId: string; email?: string | null } }
  | { ok: false; statusCode: number; error: string; message: string }
> {
  const explicitUserId = (params.userId || '').trim();
  if (explicitUserId) {
    return {
      ok: true,
      target: {
        userId: explicitUserId,
        email: params.email?.trim().toLowerCase() || null,
      },
    };
  }

  const email = (params.email || '').trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      statusCode: 400,
      error: 'invalid_target',
      message: 'Informe um UID ou e-mail valido.',
    };
  }

  const lookup = params.options.findUserByEmail ?? findFirebaseUserByEmail;
  const found = await lookup(email);

  if (!found?.uid) {
    return {
      ok: false,
      statusCode: 404,
      error: 'user_not_found',
      message: 'Usuario nao encontrado para o e-mail informado.',
    };
  }

  return {
    ok: true,
    target: {
      userId: found.uid,
      email: found.email || email,
    },
  };
}

export async function registerEntitlementRoutes(
  app: FastifyInstance,
  options: EntitlementRouteOptions = {}
) {
  const manualDataSource = buildManualDataSource(options);
  const allowManualScenarios = options.allowManualScenarios ?? process.env.NODE_ENV !== 'production';

  if (allowManualScenarios) {
    app.get('/entitlements/scenarios', async () => {
      return {
        scenarios: listManualSubscriptionScenarios().map((scenario) => ({
          userId: scenario.userId,
          plan: scenario.plan,
          status: scenario.status,
          description: scenario.description,
        })),
      };
    });
  }

  app.get<{ Querystring: EntitlementsMeQuerystring }>(
    '/entitlements/me',
    async (request, reply) => {
      const sandboxUserId = resolveRequestedUserId(request, allowManualScenarios);

      if (sandboxUserId) {
        const result = await new GetUserEntitlements(manualDataSource).execute({
          userId: sandboxUserId,
        });

        if (!result.found) {
          return sendNotFound(reply, result.reason);
        }

        return {
          userId: sandboxUserId,
          entitlements: result.entitlements,
          source: 'manual',
        };
      }

      const authenticated = await resolveAuthenticatedIdentity(
        request,
        reply,
        options,
        app
      );
      if (!authenticated) return reply;

      try {
        const dataSource = buildRealDataSource(options, authenticated);
        const result = await new GetUserEntitlements(dataSource).execute({
          userId: authenticated.identity.uid,
          email: authenticated.identity.email,
        });

        if (!result.found) {
          return sendNotFound(reply, result.reason);
        }

        return {
          userId: authenticated.identity.uid,
          entitlements: result.entitlements,
          source: 'authenticated',
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'subscription_state_unavailable',
          message: 'Nao foi possivel carregar os entitlements do usuario.',
        });
      }
    }
  );

  app.get<{ Querystring: EntitlementsMeQuerystring }>(
    '/billing/subscription/me',
    async (request, reply) => {
      const sandboxUserId = resolveRequestedUserId(request, allowManualScenarios);

      if (sandboxUserId) {
        const result = await manualDataSource.getUserSubscriptionState({
          userId: sandboxUserId,
        });

        if (!result.found) {
          return sendNotFound(reply, result.reason);
        }

        return {
          userId: sandboxUserId,
          subscription: result.subscription,
          source: 'manual',
        };
      }

      const authenticated = await resolveAuthenticatedIdentity(
        request,
        reply,
        options,
        app
      );
      if (!authenticated) return reply;

      try {
        const dataSource = buildRealDataSource(options, authenticated);
        const result = await dataSource.getUserSubscriptionState({
          userId: authenticated.identity.uid,
          email: authenticated.identity.email,
        });

        if (!result.found) {
          return sendNotFound(reply, result.reason);
        }

        return {
          userId: authenticated.identity.uid,
          subscription: result.subscription,
          source: 'authenticated',
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'subscription_state_unavailable',
          message: 'Nao foi possivel carregar a assinatura do usuario.',
        });
      }
    }
  );

  app.get<{ Querystring: AdminSubscriptionQuerystring }>(
    '/billing/admin/subscription',
    async (request, reply) => {
      const authenticated = await resolveAuthenticatedIdentity(
        request,
        reply,
        options,
        app
      );
      if (!authenticated) return reply;
      if (!ensureAdminIdentity(reply, authenticated.identity, options)) return reply;

      const resolvedTarget = await resolveAdminTarget({
        userId:
          typeof request.query.userId === 'string' ? request.query.userId : null,
        email:
          typeof request.query.email === 'string' ? request.query.email : null,
        options,
      });
      if (!resolvedTarget.ok) {
        return reply.code(resolvedTarget.statusCode).send({
          error: resolvedTarget.error,
          message: resolvedTarget.message,
        });
      }

      try {
        const dataSource = buildAdminDataSource(options, authenticated);
        const result = await dataSource.getUserSubscriptionState({
          userId: resolvedTarget.target.userId,
          email: resolvedTarget.target.email,
        });

        if (!result.found) {
          return sendNotFound(reply, result.reason);
        }

        return {
          userId: resolvedTarget.target.userId,
          email: resolvedTarget.target.email,
          subscription: result.subscription,
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'subscription_state_unavailable',
          message: 'Nao foi possivel carregar a assinatura do usuario informado.',
        });
      }
    }
  );

  app.post<{ Body: AdminSubscriptionBody }>(
    '/billing/admin/subscription',
    async (request, reply) => {
      const authenticated = await resolveAuthenticatedIdentity(
        request,
        reply,
        options,
        app
      );
      if (!authenticated) return reply;
      if (!ensureAdminIdentity(reply, authenticated.identity, options)) return reply;

      const parsed = parseAdminSubscriptionBody(request.body);
      if (!parsed.valid) {
        return reply.code(parsed.statusCode).send({
          error: parsed.error,
          message: parsed.message,
        });
      }

      const resolvedTarget = await resolveAdminTarget({
        userId: parsed.payload.userId,
        email: parsed.payload.email,
        options,
      });
      if (!resolvedTarget.ok) {
        return reply.code(resolvedTarget.statusCode).send({
          error: resolvedTarget.error,
          message: resolvedTarget.message,
        });
      }

      try {
        const dataSource = buildAdminDataSource(options, authenticated);
        const currentState = await dataSource.getUserSubscriptionState({
          userId: resolvedTarget.target.userId,
          email: resolvedTarget.target.email,
        });

        if (!currentState.found) {
          return sendNotFound(reply, currentState.reason);
        }

        const result = await dataSource.updateUserSubscriptionState({
          userId: resolvedTarget.target.userId,
          plan: parsed.payload.plan,
          status: parsed.payload.status,
          usage: parsed.payload.usage,
          resetUsage: parsed.payload.resetUsage,
        });

        if (!result.found) {
          return sendNotFound(reply, result.reason);
        }

        const previousPlan = currentState.subscription.plan;
        const previousStatus = currentState.subscription.status;
        const nextPlan = result.subscription.plan;
        const nextStatus = result.subscription.status;
        const usageKeys = parsed.payload.resetUsage
          ? []
          : parsed.payload.usage
            ? Object.keys(parsed.payload.usage).sort()
            : undefined;
        const saveProductUsageEvent =
          options.saveProductUsageEvent ?? persistProductUsageEvent;

        void saveProductUsageEvent(
          buildTesterSubscriptionUpdatedEvent({
            actorUserId: authenticated.identity.uid,
            targetUserId: resolvedTarget.target.userId,
            targetEmail: resolvedTarget.target.email,
            nextPlan,
            nextStatus,
            previousPlan,
            previousStatus,
            resetUsage: parsed.payload.resetUsage === true,
            usageKeys,
          }),
          authenticated.idToken
        );

        if (previousPlan !== nextPlan || previousStatus !== nextStatus) {
          void saveProductUsageEvent(
            buildPlanStatusChangedEvent({
              actorUserId: authenticated.identity.uid,
              targetUserId: resolvedTarget.target.userId,
              targetEmail: resolvedTarget.target.email,
              previousPlan,
              nextPlan,
              previousStatus,
              nextStatus,
            }),
            authenticated.idToken
          );
        }

        return {
          userId: resolvedTarget.target.userId,
          email: resolvedTarget.target.email,
          subscription: result.subscription,
        };
      } catch (error) {
        request.log.error(error);
        const message =
          error instanceof Error && error.message === 'subscription_update_empty'
            ? 'Envie pelo menos uma alteracao valida para plan, status ou usage.'
            : 'Nao foi possivel atualizar a assinatura do usuario informado.';

        return reply.code(500).send({
          error: 'subscription_state_update_failed',
          message,
        });
      }
    }
  );

  app.post<{ Body: PublicProductEventBody }>(
    '/product-events',
    async (request, reply) => {
      const authenticated = await resolveAuthenticatedIdentity(
        request,
        reply,
        options,
        app
      );
      if (!authenticated) {
        return;
      }

      const eventName = request.body?.eventName;
      if (!isPublicProductEventName(eventName)) {
        return reply.code(400).send({
          error: 'invalid_event_name',
          message: 'Evento de produto nao permitido nesta rota.',
        });
      }

      const saveProductUsageEvent =
        options.saveProductUsageEvent ?? persistProductUsageEvent;

      await saveProductUsageEvent(
        {
          actorUserId: authenticated.identity.uid,
          userId: authenticated.identity.uid,
          eventName,
          route: readOptionalString(request.body?.route),
          surface: readOptionalString(request.body?.surface),
          featureCode: readOptionalString(request.body?.featureCode),
          recommendedPlan: readOptionalString(request.body?.recommendedPlan),
          planTier: readOptionalString(request.body?.planTier),
          task: readOptionalString(request.body?.task),
          ctaHref: readOptionalString(request.body?.ctaHref),
          metadata: readMetadata(request.body?.metadata),
        },
        authenticated.idToken
      );

      return reply.code(202).send({ ok: true });
    }
  );

  app.get<{ Querystring: AdminBetaSignalsQuerystring }>(
    '/billing/admin/beta-signals',
    async (request, reply) => {
      const authenticated = await resolveAuthenticatedIdentity(
        request,
        reply,
        options,
        app
      );
      if (!authenticated) {
        return;
      }

      if (
        !ensureAdminIdentity(
          reply,
          authenticated.identity,
          options,
          'Somente administradores podem revisar sinais do beta.'
        )
      ) {
        return;
      }

      const windowDays = readWindowDays(request.query?.windowDays);
      const loadAdminBetaSignalsSummary =
        options.loadAdminBetaSignalsSummary ?? loadAdminBetaSignalsSummaryDefault;

      try {
        return await loadAdminBetaSignalsSummary({
          idToken: authenticated.idToken,
          windowDays,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'beta_signals_fetch_failed',
          message: 'Nao foi possivel carregar os sinais do beta.',
        });
      }
    }
  );
}

function sendNotFound(reply: FastifyReply, reason: 'user_not_found' | 'subscription_not_found') {
  return reply.code(404).send({
    error: reason,
    message:
      reason === 'user_not_found'
        ? 'Usuario nao encontrado.'
        : 'Assinatura de teste nao encontrada para o usuario informado.',
  });
}
