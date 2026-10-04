import type { FastifyInstance } from 'fastify';
import { MercadoPagoBillingAdapter } from '@aprovamind/infrastructure-billing';
import {
  CreateCheckoutSession,
  HandleBillingWebhook,
  CancelSubscription,
  type FirestoreAdminWriter,
} from '@aprovamind/application';
import {
  setFirestoreDocumentWithUserToken,
  getFirestoreDocumentWithUserToken,
} from '@aprovamind/infrastructure-firebase';
import { getAdminSession } from './admin-auth';

class RestFirestoreAdminWriter implements FirestoreAdminWriter {
  constructor(private readonly idToken: string) {}

  async setDocument(
    collection: string,
    documentId: string,
    data: Record<string, any>
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await setFirestoreDocumentWithUserToken({
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
    const result = await getFirestoreDocumentWithUserToken({
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

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
  const adapter = new MercadoPagoBillingAdapter();

  // Register custom content-type parser to extract raw body for webhook verification
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      (req as any).rawBody = body;
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // ── POST /billing/checkout ──
  app.post('/billing/checkout', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Usuário não autenticado.',
      });
    }

    const { interval } = request.body as { interval?: 'monthly' | 'annually' };

    if (interval !== 'monthly' && interval !== 'annually') {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Campo "interval" deve ser "monthly" ou "annually".',
      });
    }

    try {
      const useCase = new CreateCheckoutSession(adapter);
      const result = await useCase.execute({
        userId: user.uid,
        email: user.email || 'sandbox-user@aprovamind.com',
        interval,
      });

      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'checkout_error',
        message: error.message || 'Erro ao gerar sessão de checkout.',
      });
    }
  });

  // ── POST /billing/webhook/mercadopago ──
  app.post('/billing/webhook/mercadopago', async (request, reply) => {
    const body = request.body as any;
    const signature = request.headers['x-signature'] as string;
    const requestId = request.headers['x-request-id'] as string;
    const rawBody = (request as any).rawBody || JSON.stringify(body);

    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
    if (secret) {
      const isValid = adapter.verifyWebhookSignature(signature || '', requestId || '', rawBody);
      if (!isValid) {
        return reply.code(400).send({
          error: 'invalid_signature',
          message: 'Assinatura digital do webhook inválida ou ausente.',
        });
      }
    }

    try {
      const eventId = (body.id ?? requestId ?? '').toString();
      const rawTopic = (body.topic ?? body.type ?? '').toString();
      let topic = '';
      if (rawTopic.includes('payment')) {
        topic = 'payment';
      } else if (rawTopic.includes('preapproval')) {
        topic = 'preapproval';
      } else {
        topic = rawTopic;
      }
      const resourceId = (body.data?.id ?? body.resource?.split('/').pop() ?? '').toString();

      if (!eventId || !topic || !resourceId) {
        // Return 200 to acknowledge receipt of other events but log warning
        request.log.warn({ eventId, topic, resourceId }, 'Webhook recebido com parâmetros incompletos.');
        return reply.code(200).send({ status: 'ignored', reason: 'incomplete_parameters' });
      }

      // Obtain programmatic admin token to update Firestore user_stats (which is protected from client updates)
      const adminSession = await getAdminSession();
      const writer = new RestFirestoreAdminWriter(adminSession.idToken);

      const useCase = new HandleBillingWebhook(adapter, writer);
      const result = await useCase.execute({
        eventId,
        topic,
        resourceId,
      });

      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'webhook_error',
        message: error.message || 'Erro ao processar webhook.',
      });
    }
  });

  // ── POST /billing/webhook/hotmart ──
  app.post('/billing/webhook/hotmart', async (request, reply) => {
    const body = request.body as any;
    const headerHottok = request.headers['x-hotmart-hottok'] as string;
    const expectedHottok = process.env.HOTMART_HOTTOK || 'FPQSTyF60MbpINRs92BGjVaE1iiwUe599014';
    const incomingHottok = headerHottok || body?.hottok;

    if (incomingHottok && incomingHottok !== expectedHottok) {
      request.log.warn({ incomingHottok }, 'Hotmart Hottok mismatch');
      return reply.code(401).send({ error: 'unauthorized', message: 'Hottok inválido.' });
    }

    const event = body?.event || body?.type || 'UNKNOWN';
    request.log.info({ event, id: body?.id }, 'Hotmart webhook received');

    const data = body?.data || {};
    const buyer = data.buyer || {};
    const purchase = data.purchase || {};
    const subscription = data.subscription || {};

    const buyerEmail = buyer.email;
    const buyerPhone = buyer.checkout_phone;
    const sck = purchase.sck;

    const isApproved = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'].includes(event);
    const isRevoked = [
      'PURCHASE_CANCELED',
      'PURCHASE_REFUNDED',
      'SUBSCRIPTION_CANCELED',
      'PURCHASE_CHARGEBACK',
    ].includes(event);

    const planTier = isApproved ? 'pro' : isRevoked ? 'free' : null;
    const subscriptionStatus = isApproved ? 'active' : isRevoked ? 'canceled' : null;

    if (planTier && sck) {
      try {
        const isUid = typeof sck === 'string' && sck.length >= 20 && !sck.startsWith('+');
        if (isUid) {
          const adminSession = await getAdminSession();
          const writer = new RestFirestoreAdminWriter(adminSession.idToken);
          await writer.setDocument('user_stats', sck, {
            planTier,
            subscriptionStatus,
            planCode: planTier,
            billingProvider: 'hotmart',
            billingInterval: subscription.plan?.name?.toLowerCase().includes('anual')
              ? 'annually'
              : 'monthly',
            hotmartBuyerEmail: buyerEmail || null,
            hotmartBuyerPhone: buyerPhone || null,
            subscriptionUpdatedAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        request.log.error(err, 'Failed to update Firestore user_stats from Hotmart webhook');
      }
    }

    // Forward to WhatsApp companion (aprova-mind)
    const aprovamindUrl = process.env.APROVAMIND_API_URL || 'http://localhost:8000';
    const secretKey = process.env.INTERNAL_SERVICE_KEY || 'aprovamind-secret-service-key-2026';
    const targetPhone = buyerPhone || (typeof sck === 'string' && (sck.startsWith('+') || sck.length <= 15) ? sck : undefined);

    if (planTier && (targetPhone || sck)) {
      try {
        await fetch(`${aprovamindUrl.replace(/\/$/, '')}/api/auth/update-plan-tier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': secretKey,
          },
          body: JSON.stringify({
            phone: targetPhone,
            firebase_uid: typeof sck === 'string' && sck.length >= 20 ? sck : undefined,
            plan_tier: planTier,
          }),
        });
      } catch (botErr) {
        request.log.warn({ botErr }, 'Could not notify aprova-mind companion API');
      }
    }

    return reply.send({
      ok: true,
      event,
      status: 'processed',
      message: 'Hotmart webhook processed successfully',
    });
  });

  // ── POST /billing/cancel ──
  app.post('/billing/cancel', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Usuário não autenticado.',
      });
    }

    try {
      const adminSession = await getAdminSession();
      const writer = new RestFirestoreAdminWriter(adminSession.idToken);

      const useCase = new CancelSubscription(adapter, writer);
      const result = await useCase.execute({
        userId: user.uid,
      });

      if (!result.success) {
        return reply.code(400).send({
          error: 'cancel_error',
          message: result.reason || 'Falha ao cancelar assinatura.',
        });
      }

      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'cancel_error',
        message: error.message || 'Erro ao processar cancelamento.',
      });
    }
  });
}
