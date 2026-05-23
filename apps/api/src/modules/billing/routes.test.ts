import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../app';
import { CreateCheckoutSession, HandleBillingWebhook, CancelSubscription } from '@aprovamind/application';
import { MercadoPagoBillingAdapter } from '@aprovamind/infrastructure-billing';

// Set up fake Firebase credentials for tests
process.env.FIREBASE_WEB_API_KEY = 'fake-api-key';

// Mock global fetch to intercept admin token calls
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  if (urlStr.includes('signInWithPassword')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        idToken: 'mock-admin-token',
        localId: 'mock-admin-uid',
        email: 'marsleite@gmail.com',
      }),
      text: async () => '',
    } as Response;
  }
  return originalFetch(url, init);
};

test('POST /billing/checkout requires authentication', async () => {
  const app = createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async () => null,
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/checkout',
      payload: {
        interval: 'monthly',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), {
      error: 'unauthorized',
      message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
    });
  } finally {
    await app.close();
  }
});

test('POST /billing/checkout validates interval parameter', async () => {
  const app = createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-123', email: 'user@example.com' }
          : null,
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/checkout',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        interval: 'invalid-interval',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), {
      error: 'bad_request',
      message: 'Campo "interval" deve ser "monthly" ou "annually".',
    });
  } finally {
    await app.close();
  }
});

test('POST /billing/checkout executes use case and returns init point on success', async () => {
  const originalExecute = CreateCheckoutSession.prototype.execute;
  CreateCheckoutSession.prototype.execute = async (params) => {
    assert.equal(params.userId, 'user-123');
    assert.equal(params.email, 'user@example.com');
    assert.equal(params.interval, 'monthly');
    return {
      checkoutId: 'chk-123',
      initPoint: 'https://sandbox.mercadopago.com/checkout/chk-123',
    };
  };

  const app = createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-123', email: 'user@example.com' }
          : null,
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/checkout',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        interval: 'monthly',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      checkoutId: 'chk-123',
      initPoint: 'https://sandbox.mercadopago.com/checkout/chk-123',
    });
  } finally {
    CreateCheckoutSession.prototype.execute = originalExecute;
    await app.close();
  }
});

test('POST /billing/webhook/mercadopago validates webhook signature if secret is configured', async () => {
  const originalSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'some-webhook-secret';

  const originalVerify = MercadoPagoBillingAdapter.prototype.verifyWebhookSignature;
  MercadoPagoBillingAdapter.prototype.verifyWebhookSignature = (sig, reqId, rawBody) => {
    assert.equal(sig, 'invalid-signature');
    assert.equal(reqId, 'req-123');
    return false;
  };

  const app = createApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/webhook/mercadopago',
      headers: {
        'x-signature': 'invalid-signature',
        'x-request-id': 'req-123',
      },
      payload: {
        id: '12345',
        type: 'payment',
        data: { id: '999' },
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), {
      error: 'invalid_signature',
      message: 'Assinatura digital do webhook inválida ou ausente.',
    });
  } finally {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalSecret;
    MercadoPagoBillingAdapter.prototype.verifyWebhookSignature = originalVerify;
    await app.close();
  }
});

test('POST /billing/webhook/mercadopago processes webhook successfully', async () => {
  const originalSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = ''; // disable signature check for simple flow

  const originalExecute = HandleBillingWebhook.prototype.execute;
  HandleBillingWebhook.prototype.execute = async (params) => {
    assert.equal(params.eventId, 'evt-123');
    assert.equal(params.topic, 'payment');
    assert.equal(params.resourceId, 'pay-123');
    return {
      processed: true,
      userId: 'user-123',
      planTier: 'pro',
      subscriptionStatus: 'active',
    };
  };

  const app = createApp();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/webhook/mercadopago',
      headers: {
        'x-request-id': 'evt-123',
      },
      payload: {
        id: 'evt-123',
        topic: 'payment',
        data: { id: 'pay-123' },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      processed: true,
      userId: 'user-123',
      planTier: 'pro',
      subscriptionStatus: 'active',
    });
  } finally {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalSecret;
    HandleBillingWebhook.prototype.execute = originalExecute;
    await app.close();
  }
});

test('POST /billing/cancel requires authentication', async () => {
  const app = createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async () => null,
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/cancel',
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), {
      error: 'unauthorized',
      message: 'Envie um Authorization: Bearer <firebase-id-token> valido.',
    });
  } finally {
    await app.close();
  }
});

test('POST /billing/cancel returns error if cancellation use case fails', async () => {
  const originalExecute = CancelSubscription.prototype.execute;
  CancelSubscription.prototype.execute = async (params) => {
    assert.equal(params.userId, 'user-123');
    return {
      success: false,
      refunded: false,
      reason: 'No active subscription found',
    };
  };

  const app = createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-123', email: 'user@example.com' }
          : null,
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/cancel',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), {
      error: 'cancel_error',
      message: 'No active subscription found',
    });
  } finally {
    CancelSubscription.prototype.execute = originalExecute;
    await app.close();
  }
});

test('POST /billing/cancel executes successfully and returns cancel results', async () => {
  const originalExecute = CancelSubscription.prototype.execute;
  CancelSubscription.prototype.execute = async (params) => {
    assert.equal(params.userId, 'user-123');
    return {
      success: true,
      refunded: true,
      refundAmount: 34.90,
      newPlanTier: 'free',
      newSubscriptionStatus: 'expired',
    };
  };

  const app = createApp({
    allowSandboxAuth: false,
    entitlements: {
      verifyIdToken: async (idToken) =>
        idToken === 'valid-token'
          ? { uid: 'user-123', email: 'user@example.com' }
          : null,
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/billing/cancel',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      success: true,
      refunded: true,
      refundAmount: 34.90,
      newPlanTier: 'free',
      newSubscriptionStatus: 'expired',
    });
  } finally {
    CancelSubscription.prototype.execute = originalExecute;
    await app.close();
  }
});

