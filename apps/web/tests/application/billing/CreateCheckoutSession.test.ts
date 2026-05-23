import { describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSession } from '@aprovamind/application/use-cases/billing/CreateCheckoutSession';
import type { BillingAdapter } from '@aprovamind/application/ports/BillingAdapter';

describe('CreateCheckoutSession', () => {
  it('calls the billing adapter and returns checkout session info', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn().mockResolvedValue({
        checkoutId: 'session-123',
        initPoint: 'https://checkout.mercadopago.com/init-123',
      }),
      cancelSubscription: vi.fn(),
      refundPayment: vi.fn(),
      getSubscription: vi.fn(),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const useCase = new CreateCheckoutSession(mockAdapter);
    const result = await useCase.execute({
      userId: 'user-123',
      email: 'user@example.com',
      interval: 'monthly',
    });

    expect(mockAdapter.createCheckoutSession).toHaveBeenCalledWith({
      userId: 'user-123',
      email: 'user@example.com',
      interval: 'monthly',
    });
    expect(result).toEqual({
      checkoutId: 'session-123',
      initPoint: 'https://checkout.mercadopago.com/init-123',
    });
  });

  it('throws an error if inputs are invalid', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      refundPayment: vi.fn(),
      getSubscription: vi.fn(),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const useCase = new CreateCheckoutSession(mockAdapter);

    await expect(
      useCase.execute({
        userId: '',
        email: 'user@example.com',
        interval: 'monthly',
      })
    ).rejects.toThrow('User ID is required');

    await expect(
      useCase.execute({
        userId: 'user-123',
        email: '',
        interval: 'monthly',
      })
    ).rejects.toThrow('Email is required');

    await expect(
      useCase.execute({
        userId: 'user-123',
        email: 'user@example.com',
        interval: 'invalid' as unknown as 'monthly' | 'annually',
      })
    ).rejects.toThrow('Interval must be monthly or annually');
  });
});
