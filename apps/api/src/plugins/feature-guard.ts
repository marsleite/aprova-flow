import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { type FeatureCode } from '@aprovamind/domain';
import { GetUserEntitlements } from '@aprovamind/application/use-cases/billing/GetUserEntitlements';
import { FirestoreSubscriptionStateDataSource } from '../modules/entitlements/firestore-subscription-state-data-source';

declare module 'fastify' {
  interface FastifyInstance {
    guardFeature: (featureCode: FeatureCode) => any;
  }
}

const featureGuardPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('guardFeature', (featureCode: FeatureCode) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      
      if (!user) {
         return reply.code(401).send({ error: 'unauthorized', message: 'Usuário não autenticado no Guard.' });
      }

      // Hack: in a real DI setup, inject data source.
      // Here we assume Firebase Auth provides the ID Token as the uid or we use Firebase Admin.
      // We will just use ID Token from header since FirestoreSubscriptionStateDataSource requires it.
      const authHeader = request.headers.authorization || '';
      const idToken = authHeader.replace(/^Bearer\s/i, '').trim();

      const dataSource = new FirestoreSubscriptionStateDataSource({
        idToken, // If empty, FirestoreSubscriptionStateDataSource might fallback to admin.
        identity: user,
      });

      try {
        const result = await new GetUserEntitlements(dataSource).execute({
          userId: user.uid,
          email: user.email,
        });

        if (!result.found || !result.entitlements) {
          return reply.code(403).send({ error: 'forbidden', message: 'Assinatura não encontrada.' });
        }

        const feature = result.entitlements.features[featureCode];
        
        if (!feature || feature.enabled === false) {
          return reply.code(403).send({ 
             error: 'feature_locked', 
             message: `Esta funcionalidade (${featureCode}) exige o plano correspondente e não está disponível.` 
          });
        }
      } catch (err) {
        request.log.error(err);
         return reply.code(500).send({ error: 'entitlements_error', message: 'Erro ao validar autorização.' });
      }
    };
  });
};

export const featureGuard = fp(featureGuardPlugin, { name: 'feature-guard' });
