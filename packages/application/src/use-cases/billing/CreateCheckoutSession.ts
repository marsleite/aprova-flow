import type { BillingAdapter, CreateCheckoutSessionResult } from '../../ports/BillingAdapter';

export interface CreateCheckoutSessionInput {
  userId: string;
  email: string;
  interval: 'monthly' | 'annually';
}

export class CreateCheckoutSession {
  constructor(private readonly billingAdapter: BillingAdapter) {}

  async execute(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionResult> {
    if (!input.userId) {
      throw new Error('User ID is required');
    }
    if (!input.email) {
      throw new Error('Email is required');
    }
    if (input.interval !== 'monthly' && input.interval !== 'annually') {
      throw new Error('Interval must be monthly or annually');
    }

    return this.billingAdapter.createCheckoutSession({
      userId: input.userId,
      email: input.email,
      interval: input.interval,
    });
  }
}
