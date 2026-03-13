import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { GetUserEntitlements } from '@aprovamind/application/use-cases/billing/GetUserEntitlements';
import {
  ManualSubscriptionStateDataSource,
  listManualSubscriptionScenarios,
} from './manual-subscription-state-data-source';

interface EntitlementsMeQuerystring {
  userId?: string;
}

function resolveRequestedUserId(
  request: FastifyRequest<{ Querystring: EntitlementsMeQuerystring }>
): string | null {
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

export async function registerEntitlementRoutes(app: FastifyInstance) {
  const dataSource = new ManualSubscriptionStateDataSource();
  const getUserEntitlements = new GetUserEntitlements(dataSource);

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

  app.get<{ Querystring: EntitlementsMeQuerystring }>(
    '/entitlements/me',
    async (request, reply) => {
      const userId = resolveRequestedUserId(request);

      if (!userId) {
        return reply.code(400).send({
          error: 'missing_user_id',
          message:
            'Informe x-aprovamind-user-id no header ou ?userId= na query para testar os entitlements.',
        });
      }

      const result = await getUserEntitlements.execute({ userId });

      if (!result.found) {
        return sendNotFound(reply, result.reason);
      }

      return {
        userId,
        entitlements: result.entitlements,
      };
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
