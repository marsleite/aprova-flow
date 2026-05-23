export interface CheckoutSessionRequest {
  planTier: 'pro';
  interval: 'monthly' | 'annually';
}

export interface CheckoutSessionResponse {
  checkoutId: string;
  initPoint: string;
}
