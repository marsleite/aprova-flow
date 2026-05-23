import { describe, expect, it, vi } from 'vitest';
import { HandleBillingWebhook } from '@aprovamind/application/use-cases/billing/HandleBillingWebhook';
import type { BillingAdapter } from '@aprovamind/application/ports/BillingAdapter';
import type { FirestoreAdminWriter } from '@aprovamind/application/use-cases/billing/HandleBillingWebhook';
import { PlanCode, SubscriptionStatus } from '@aprovamind/domain';

describe('HandleBillingWebhook', () => {
  it('skips processing if event is already processed (idempotency)', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      refundPayment: vi.fn(),
      getSubscription: vi.fn(),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const mockWriter: FirestoreAdminWriter = {
      getDocument: vi.fn().mockImplementation((collection, docId) => {
        if (collection === 'billing_event_logs' && docId === 'evt-123') {
          return Promise.resolve({ ok: true, exists: true });
        }
        return Promise.resolve({ ok: false, exists: false });
      }),
      setDocument: vi.fn(),
    };

    const useCase = new HandleBillingWebhook(mockAdapter, mockWriter);
    const result = await useCase.execute({
      eventId: 'evt-123',
      topic: 'preapproval',
      resourceId: 'sub-123',
    });

    expect(result).toEqual({
      processed: false,
      reason: 'event_already_processed',
    });
    expect(mockAdapter.getSubscription).not.toHaveBeenCalled();
    expect(mockWriter.setDocument).not.toHaveBeenCalled();
  });

  it('processes payment topic by loading payment, subscription, updating stats and logging the event', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      refundPayment: vi.fn(),
      getSubscription: vi.fn().mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        status: SubscriptionStatus.Active,
        plan: PlanCode.Pro,
        billingPeriodEnd: new Date('2026-06-20T00:00:00.000Z'),
        paymentId: 'pay-123',
      }),
      getPayment: vi.fn().mockResolvedValue({
        id: 'pay-123',
        status: 'approved',
        amount: 34.90,
        userId: 'user-123',
        preapprovalId: 'sub-123',
      }),
      verifyWebhookSignature: vi.fn(),
    };

    const mockWriter: FirestoreAdminWriter = {
      getDocument: vi.fn().mockImplementation((collection, docId) => {
        if (collection === 'user_stats' && docId === 'user-123') {
          return Promise.resolve({
            ok: true,
            exists: true,
            data: { subscriptionStartedAt: '2026-05-20T12:00:00.000Z' },
          });
        }
        return Promise.resolve({ ok: false, exists: false });
      }),
      setDocument: vi.fn().mockResolvedValue({ ok: true }),
    };

    const useCase = new HandleBillingWebhook(mockAdapter, mockWriter);
    const result = await useCase.execute({
      eventId: 'evt-123',
      topic: 'payment',
      resourceId: 'pay-123',
    });

    expect(mockAdapter.getPayment).toHaveBeenCalledWith('pay-123');
    expect(mockAdapter.getSubscription).toHaveBeenCalledWith('sub-123');
    expect(mockWriter.setDocument).toHaveBeenCalledWith('user_stats', 'user-123', expect.objectContaining({
      planTier: 'pro',
      subscriptionStatus: 'active',
      subscriptionId: 'sub-123',
      subscriptionPaymentId: 'pay-123',
      billingPeriodEnd: new Date('2026-06-20T00:00:00.000Z').toISOString(),
      subscriptionStartedAt: '2026-05-20T12:00:00.000Z',
    }));
    expect(mockWriter.setDocument).toHaveBeenCalledWith('billing_event_logs', 'evt-123', expect.objectContaining({
      topic: 'payment',
      resourceId: 'pay-123',
      userId: 'user-123',
      planTier: 'pro',
      subscriptionStatus: 'active',
    }));
    expect(result).toEqual({
      processed: true,
      userId: 'user-123',
      planTier: 'pro',
      subscriptionStatus: 'active',
    });
  });

  it('processes preapproval topic directly without fetching payment details', async () => {
    const mockAdapter: BillingAdapter = {
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      refundPayment: vi.fn(),
      getSubscription: vi.fn().mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        status: SubscriptionStatus.Canceled,
        plan: PlanCode.Pro,
        billingPeriodEnd: new Date('2026-06-20T00:00:00.000Z'),
      }),
      getPayment: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    const mockWriter: FirestoreAdminWriter = {
      getDocument: vi.fn().mockResolvedValue({ ok: false, exists: false }),
      setDocument: vi.fn().mockResolvedValue({ ok: true }),
    };

    const useCase = new HandleBillingWebhook(mockAdapter, mockWriter);
    const result = await useCase.execute({
      eventId: 'evt-123',
      topic: 'preapproval',
      resourceId: 'sub-123',
    });

    expect(mockAdapter.getPayment).not.toHaveBeenCalled();
    expect(mockAdapter.getSubscription).toHaveBeenCalledWith('sub-123');
    expect(mockWriter.setDocument).toHaveBeenCalledWith('user_stats', 'user-123', expect.objectContaining({
      planTier: 'pro',
      subscriptionStatus: 'canceled',
      subscriptionId: 'sub-123',
      billingPeriodEnd: new Date('2026-06-20T00:00:00.000Z').toISOString(),
    }));
    expect(result).toEqual({
      processed: true,
      userId: 'user-123',
      planTier: 'pro',
      subscriptionStatus: 'canceled',
    });
  });
});
