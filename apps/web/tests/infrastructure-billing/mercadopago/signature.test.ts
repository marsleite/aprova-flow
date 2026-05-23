import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { MercadoPagoBillingAdapter } from '@aprovamind/infrastructure-billing';

describe('MercadoPagoBillingAdapter - verifyWebhookSignature', () => {
  const testSecret = 'my-webhook-secret-key';
  
  it('validates a correct signature using the request-timestamp format (Candidate 1)', () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = testSecret;
    const adapter = new MercadoPagoBillingAdapter();

    const dataId = '987654321';
    const ts = '1742505638683';
    const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e';

    // id:<data.id>;request-timestamp:<ts>;
    const manifest = `id:${dataId};request-timestamp:${ts};`;
    const v1 = crypto
      .createHmac('sha256', testSecret)
      .update(manifest)
      .digest('hex');

    const signatureHeader = `ts=${ts},v1=${v1}`;
    const rawBody = JSON.stringify({
      data: {
        id: dataId,
      },
    });

    const isValid = adapter.verifyWebhookSignature(signatureHeader, requestId, rawBody);
    expect(isValid).toBe(true);
  });

  it('validates a correct signature using the request-id and ts format (Candidate 2)', () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = testSecret;
    const adapter = new MercadoPagoBillingAdapter();

    const dataId = '987654321';
    const ts = '1742505638683';
    const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e';

    // id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = crypto
      .createHmac('sha256', testSecret)
      .update(manifest)
      .digest('hex');

    const signatureHeader = `ts=${ts},v1=${v1}`;
    const rawBody = JSON.stringify({
      data: {
        id: dataId,
      },
    });

    const isValid = adapter.verifyWebhookSignature(signatureHeader, requestId, rawBody);
    expect(isValid).toBe(true);
  });

  it('rejects an invalid or modified signature', () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = testSecret;
    const adapter = new MercadoPagoBillingAdapter();

    const dataId = '987654321';
    const ts = '1742505638683';
    const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e';

    const signatureHeader = `ts=${ts},v1=wrongsignaturehash123`;
    const rawBody = JSON.stringify({
      data: {
        id: dataId,
      },
    });

    const isValid = adapter.verifyWebhookSignature(signatureHeader, requestId, rawBody);
    expect(isValid).toBe(false);
  });

  it('rejects if signature header format is invalid', () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = testSecret;
    const adapter = new MercadoPagoBillingAdapter();

    const isValid = adapter.verifyWebhookSignature('invalid-header-format', 'req-id', '{}');
    expect(isValid).toBe(false);
  });
});
