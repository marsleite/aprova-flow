import { describe, expect, it, vi } from 'vitest';
import { CancelSubscription } from '@aprovamind/application/use-cases/billing/CancelSubscription';
import type { BillingAdapter } from '@aprovamind/application/ports/BillingAdapter';
import type { FirestoreAdminWriter } from '@aprovamind/application/use-cases/billing/HandleBillingWebhook';

describe('CancelSubscription', () => {
  it('performs refund and immediate downgrade if within 7 days (CDC compliant)', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
      refundPayment: vi.fn().mockResolvedValue({ success: true }),
      getSubscription: vi.fn(),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const mockWriter: FirestoreAdminWriter = {
      getDocument: vi.fn().mockResolvedValue({
        ok: true,
        exists: true,
        data: {
          planTier: 'pro',
          subscriptionStatus: 'active',
          subscriptionId: 'sub-123',
          subscriptionPaymentId: 'pay-123',
          subscriptionStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        },
      }),
      setDocument: vi.fn().mockResolvedValue({ ok: true }),
    };

    const useCase = new CancelSubscription(mockAdapter, mockWriter);
    const result = await useCase.execute({ userId: 'user-123' });

    expect(mockAdapter.cancelSubscription).toHaveBeenCalledWith('sub-123');
    expect(mockAdapter.refundPayment).toHaveBeenCalledWith('pay-123');
    expect(mockWriter.setDocument).toHaveBeenCalledWith('user_stats', 'user-123', expect.objectContaining({
      planTier: 'free',
      subscriptionStatus: 'expired',
      billingPeriodEnd: new Date(0).toISOString(),
    }));
    expect(result).toEqual({
      success: true,
      refunded: true,
    });
  });

  it('performs standard cancellation without refund if after 7 days', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
      refundPayment: vi.fn(),
      getSubscription: vi.fn(),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const mockWriter: FirestoreAdminWriter = {
      getDocument: vi.fn().mockResolvedValue({
        ok: true,
        exists: true,
        data: {
          planTier: 'pro',
          subscriptionStatus: 'active',
          subscriptionId: 'sub-123',
          subscriptionPaymentId: 'pay-123',
          subscriptionStartedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        },
      }),
      setDocument: vi.fn().mockResolvedValue({ ok: true }),
    };

    const useCase = new CancelSubscription(mockAdapter, mockWriter);
    const result = await useCase.execute({ userId: 'user-123' });

    expect(mockAdapter.cancelSubscription).toHaveBeenCalledWith('sub-123');
    expect(mockAdapter.refundPayment).not.toHaveBeenCalled();
    expect(mockWriter.setDocument).toHaveBeenCalledWith('user_stats', 'user-123', expect.objectContaining({
      subscriptionStatus: 'canceled',
    }));
    expect(result).toEqual({
      success: true,
      refunded: false,
    });
  });

  it('fails if user is not pro or has no active subscription', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      refundPayment: vi.fn(),
      getSubscription: vi.fn(),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const mockWriter: FirestoreAdminWriter = {
      getDocument: vi.fn().mockResolvedValue({
        ok: true,
        exists: true,
        data: {
          planTier: 'free',
          subscriptionStatus: 'expired',
        },
      }),
      setDocument: vi.fn(),
    };

    const useCase = new CancelSubscription(mockAdapter, mockWriter);
    const result = await useCase.execute({ userId: 'user-123' });

    expect(result).toEqual({
      success: false,
      refunded: false,
      reason: 'no_active_pro_subscription',
    });
  });
});
