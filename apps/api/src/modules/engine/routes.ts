/**
 * Engine Routes — Fastify Module
 *
 * Serves the PlanEngineSnapshot via the application-layer use case.
 * Replaces the Next.js API route /api/engine/snapshot.
 *
 * Routes:
 *   POST /engine/snapshot — returns PlanEngineSnapshotV1 for the authenticated user
 */

import type { FastifyInstance } from 'fastify';
import { GetPlanEngineSnapshot } from '@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot';
import { GetPortfolioSnapshot } from '@aprovamind/application/use-cases/engine/GetPortfolioSnapshot';
import { extractBearerToken } from '@aprovamind/infrastructure-firebase';
import { LegacyEngineDataSource } from '@aprovamind/infrastructure-firebase/LegacyEngineDataSource';

interface SnapshotRequestBody {
  planId?: string | null;
  maxRecommendations?: number;
}

interface PortfolioQuerystring {
  globalWeeklyBudget?: string;
}

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveEffectiveToken(authorizationHeader?: string): string {
  return extractBearerToken(authorizationHeader) ?? 'sandbox-token';
}

export async function registerEngineRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /engine/snapshot ──
  app.post('/engine/snapshot', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Usuário não autenticado.',
      });
    }

    const body = (request.body as SnapshotRequestBody) || {};

    const planId =
      typeof body.planId === 'string'
        ? body.planId.trim() || null
        : body.planId === null
          ? null
          : undefined;

    const maxRecommendations = body.maxRecommendations ?? 3;

    if (planId === null) {
      return reply
        .header('Cache-Control', 'no-store')
        .send({
          found: false,
          reason: 'no_active_plan',
          message: 'Selecione um edital ativo no Planner para usar o Engine.',
        });
    }

    if (
      typeof maxRecommendations !== 'number' ||
      !Number.isInteger(maxRecommendations) ||
      maxRecommendations < 1 ||
      maxRecommendations > 5
    ) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Campo "maxRecommendations" deve ser um inteiro entre 1 e 5.',
      });
    }

    try {
      const useCase = new GetPlanEngineSnapshot(
        new LegacyEngineDataSource(resolveEffectiveToken(request.headers.authorization))
      );

      const result = await useCase.execute({
        userId: user.uid,
        today: getServerTodayIso(),
        planId,
        maxRecommendations,
      });

      return reply
        .header('Cache-Control', 'no-store')
        .send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'engine_error',
        message: 'Erro ao carregar o snapshot do motor.',
      });
    }
  });

  // ── GET /engine/portfolio ──
  app.get<{ Querystring: PortfolioQuerystring }>('/engine/portfolio', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Usuário não autenticado.',
      });
    }

    const rawBudget = request.query.globalWeeklyBudget;
    const globalWeeklyBudget =
      typeof rawBudget === 'string' && rawBudget.trim().length > 0
        ? Number(rawBudget)
        : 30;

    if (
      !Number.isInteger(globalWeeklyBudget) ||
      globalWeeklyBudget <= 0
    ) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Query "globalWeeklyBudget" deve ser um inteiro maior que zero.',
      });
    }

    try {
      const useCase = new GetPortfolioSnapshot(
        new LegacyEngineDataSource(resolveEffectiveToken(request.headers.authorization))
      );

      const result = await useCase.execute({
        userId: user.uid,
        today: getServerTodayIso(),
        globalWeeklyBudget,
      });

      return reply
        .header('Cache-Control', 'no-store')
        .send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'engine_error',
        message: 'Erro ao carregar o portfólio multi-edital.',
      });
    }
  });
}
