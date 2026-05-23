import type { BillingAdapter } from '../../ports/BillingAdapter';
import type { FirestoreAdminWriter } from '../../ports/FirestoreAdminWriter';

export interface CancelSubscriptionInput {
  userId: string;
}

export interface CancelSubscriptionResult {
  success: boolean;
  refunded: boolean;
  reason?: string;
}

export class CancelSubscription {
  constructor(
    private readonly billingAdapter: BillingAdapter,
    private readonly firestoreWriter: FirestoreAdminWriter
  ) {}

  async execute(
    input: CancelSubscriptionInput
  ): Promise<CancelSubscriptionResult> {
    if (!input.userId) {
      throw new Error('User ID is required');
    }

    // 1. Retrieve user stats to find subscription details
    const userStatsRes = await this.firestoreWriter.getDocument('user_stats', input.userId);
    if (!userStatsRes.ok || !userStatsRes.exists) {
      return {
        success: false,
        refunded: false,
        reason: 'user_stats_not_found',
      };
    }

    const {
      planTier,
      subscriptionStatus,
      subscriptionId,
      subscriptionPaymentId,
      subscriptionStartedAt,
    } = userStatsRes.data || {};

    if (planTier !== 'pro' || subscriptionStatus !== 'active' || !subscriptionId) {
      return {
        success: false,
        refunded: false,
        reason: 'no_active_pro_subscription',
      };
    }

    // 2. Determine if cancellation is within the 7-day CDC reflection period
    const startedAt = subscriptionStartedAt ? new Date(subscriptionStartedAt) : new Date();
    const elapsedMs = Date.now() - startedAt.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const isWithinCDC = elapsedDays <= 7.0;

    try {
      // 3. Cancel the subscription at Mercado Pago
      await this.billingAdapter.cancelSubscription(subscriptionId);

      if (isWithinCDC) {
        // 4a. CDC Case: Refund the payment and downgrade immediately
        if (subscriptionPaymentId) {
          await this.billingAdapter.refundPayment(subscriptionPaymentId);
        }

        const updateRes = await this.firestoreWriter.setDocument('user_stats', input.userId, {
          planTier: 'free',
          subscriptionStatus: 'expired',
          subscriptionUpdatedAt: new Date().toISOString(),
          billingPeriodEnd: new Date(0).toISOString(), // set to epoch to guarantee immediate expiration
        });

        if (!updateRes.ok) {
          throw new Error(`Failed to update user stats during CDC downgrade: ${updateRes.error}`);
        }

        return {
          success: true,
          refunded: true,
        };
      } else {
        // 4b. Standard Case: Keep Pro access until end of current cycle
        const updateRes = await this.firestoreWriter.setDocument('user_stats', input.userId, {
          subscriptionStatus: 'canceled',
          subscriptionUpdatedAt: new Date().toISOString(),
        });

        if (!updateRes.ok) {
          throw new Error(`Failed to update user stats during standard cancellation: ${updateRes.error}`);
        }

        return {
          success: true,
          refunded: false,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        refunded: false,
        reason: error.message || 'billing_adapter_error',
      };
    }
  }
}
