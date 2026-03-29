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
import { LegacyEngineDataSource } from '@aprovamind/infrastructure-firebase/LegacyEngineDataSource';

interface SnapshotRequestBody {
  planId?: string | null;
  maxRecommendations?: number;
}

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
      // Extract the bearer token from the Authorization header for Firestore REST calls
      const authHeader = request.headers.authorization || '';
      const idToken = authHeader.replace(/^Bearer\s/i, '').trim();

      // Sandbox mode: use a placeholder token when using x-aprovamind-user-id
      const effectiveToken = idToken || 'sandbox-token';

      const useCase = new GetPlanEngineSnapshot(
        new LegacyEngineDataSource(effectiveToken)
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
}
