import type { PlanCode, SubscriptionStatus } from '@aprovamind/domain';

export interface CreateCheckoutSessionParams {
  userId: string;
  email: string;
  interval: 'monthly' | 'annually';
}

export interface CreateCheckoutSessionResult {
  checkoutId: string;
  initPoint: string;
}

export interface GetSubscriptionResult {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  plan: PlanCode;
  billingPeriodEnd: Date;
  paymentId?: string;
}

export interface GetPaymentResult {
  id: string;
  status: 'approved' | 'refunded' | 'pending' | 'rejected' | string;
  amount: number;
  userId: string;
  preapprovalId?: string;
}

export interface BillingAdapter {
  createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CreateCheckoutSessionResult>;

  cancelSubscription(subscriptionId: string): Promise<{ success: boolean }>;

  refundPayment(paymentId: string): Promise<{ success: boolean }>;

  getSubscription(subscriptionId: string): Promise<GetSubscriptionResult>;

  getPayment(paymentId: string): Promise<GetPaymentResult>;

  verifyWebhookSignature(
    signature: string,
    requestId: string,
    rawBody: string
  ): boolean;
}
