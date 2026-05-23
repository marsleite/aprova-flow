import crypto from 'node:crypto';
import type {
  BillingAdapter,
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  GetPaymentResult,
  GetSubscriptionResult,
} from '@aprovamind/application';
import { PlanCode, SubscriptionStatus } from '@aprovamind/domain';

export class MercadoPagoBillingAdapter implements BillingAdapter {
  private readonly accessToken: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.mercadopago.com';

  constructor() {
    this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '';
    this.webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '';
  }

  private getHeaders(extraHeaders: Record<string, string> = {}) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      ...extraHeaders,
    };
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CreateCheckoutSessionResult> {
    if (!this.accessToken) {
      throw new Error('Mercado Pago Access Token is not configured');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const backUrl = `${appUrl}/checkout/success`;

    const body = {
      payer_email: params.email,
      back_url: backUrl,
      reason: params.interval === 'monthly' ? 'AprovaMind Pro - Mensal' : 'AprovaMind Pro - Anual',
      external_reference: params.userId,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.interval === 'monthly' ? 34.90 : 358.80,
        currency_id: 'BRL',
      },
      status: 'pending',
    };

    const response = await fetch(`${this.baseUrl}/preapproval`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago checkout session generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const checkoutId = data.id;
    const initPoint = data.sandbox_init_point || data.init_point;

    if (!checkoutId || !initPoint) {
      throw new Error('Invalid response from Mercado Pago preapproval API');
    }

    return {
      checkoutId,
      initPoint,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    if (!this.accessToken) {
      throw new Error('Mercado Pago Access Token is not configured');
    }

    const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status: 'cancelled',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago subscription cancellation failed: ${response.status} - ${errorText}`);
    }

    return { success: true };
  }

  async refundPayment(paymentId: string): Promise<{ success: boolean }> {
    if (!this.accessToken) {
      throw new Error('Mercado Pago Access Token is not configured');
    }

    const idempotencyKey = crypto.randomUUID();
    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: this.getHeaders({
        'X-Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago payment refund failed: ${response.status} - ${errorText}`);
    }

    return { success: true };
  }

  async getSubscription(subscriptionId: string): Promise<GetSubscriptionResult> {
    if (!this.accessToken) {
      throw new Error('Mercado Pago Access Token is not configured');
    }

    const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago fetch subscription failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const statusMap: Record<string, SubscriptionStatus> = {
      authorized: SubscriptionStatus.Active,
      paused: SubscriptionStatus.PastDue,
      cancelled: SubscriptionStatus.Canceled,
    };

    const status = statusMap[data.status] || SubscriptionStatus.Expired;
    const userId = data.external_reference;
    const nextPaymentDate = data.next_payment_date ? new Date(data.next_payment_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: data.id,
      userId,
      status,
      plan: PlanCode.Pro,
      billingPeriodEnd: nextPaymentDate,
      paymentId: data.last_payment_id || undefined,
    };
  }

  async getPayment(paymentId: string): Promise<GetPaymentResult> {
    if (!this.accessToken) {
      throw new Error('Mercado Pago Access Token is not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago fetch payment failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      id: data.id.toString(),
      status: data.status,
      amount: data.transaction_amount,
      userId: data.external_reference,
      preapprovalId: data.preapproval_id || undefined,
    };
  }

  verifyWebhookSignature(
    signature: string,
    requestId: string,
    rawBody: string
  ): boolean {
    if (!this.webhookSecret) {
      // In sandbox mode without a secret, or when disabled, we can fail closed unless signature is not provided and secret is empty.
      // But we should always enforce signature validation in production.
      return false;
    }

    // signature format: ts=12345,v1=abcdef...
    const tsMatch = signature.match(/ts=(\d+)/);
    const v1Match = signature.match(/v1=([a-f0-9]+)/i);

    if (!tsMatch || !v1Match) {
      return false;
    }

    const ts = tsMatch[1];
    const v1 = v1Match[1];

    let dataId = '';
    try {
      const body = JSON.parse(rawBody);
      // dataId can be in data.id or directly in id (e.g. data: { id: "123" } or id: 123)
      dataId = (body.data?.id ?? body.id ?? '').toString().toLowerCase();
    } catch {
      return false;
    }

    if (!dataId) {
      return false;
    }

    // Try Candidate 1: id:<data.id>;request-timestamp:<ts>;
    const manifest1 = `id:${dataId};request-timestamp:${ts};`;
    const hmac1 = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest1)
      .digest('hex');

    if (hmac1 === v1) {
      return true;
    }

    // Try Candidate 2: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
    const manifest2 = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hmac2 = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest2)
      .digest('hex');

    if (hmac2 === v1) {
      return true;
    }

    return false;
  }
}
