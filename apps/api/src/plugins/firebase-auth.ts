import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { extractBearerToken, verifyFirebaseIdToken, type VerifiedFirebaseUser } from '@aprovamind/infrastructure-firebase';

declare module 'fastify' {
  interface FastifyRequest {
    user: VerifiedFirebaseUser | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface FirebaseAuthOptions {
  verifyIdToken?: (idToken: string) => Promise<VerifiedFirebaseUser | null>;
  allowSandbox?: boolean;
}

const firebaseAuthPlugin: FastifyPluginAsync<FirebaseAuthOptions> = async (app, options) => {
  const verifier = options.verifyIdToken ?? verifyFirebaseIdToken;

  app.decorateRequest('user', null);

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Sandbox Bypass (só se options.allowSandbox = true)
    if (options.allowSandbox) {
      const sandboxUserId = request.headers['x-aprovamind-user-id'] as string;
      if (sandboxUserId && sandboxUserId.trim().length > 0) {
        request.user = { uid: sandboxUserId, email: null, emailVerified: false } as unknown as VerifiedFirebaseUser;
        return;
      }
    }

    // 2. Real Token Evaluation
    const token = extractBearerToken(request.headers.authorization);
    
    if (!token) {
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
      });
    }

    try {
      const identity = await verifier(token);
      if (!identity) {
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'Token expirado ou invalido.',
        });
      }

      request.user = identity;
    } catch (err) {
      request.log.error(err);
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Falha na verificacao do token.',
      });
    }
  });
};

export const firebaseAuth = fp(firebaseAuthPlugin, { name: 'firebase-auth' });
