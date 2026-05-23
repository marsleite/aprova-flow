import type { BillingAdapter } from '../../ports/BillingAdapter';
import type { FirestoreAdminWriter } from '../../ports/FirestoreAdminWriter';

export interface HandleBillingWebhookInput {
  eventId: string;
  topic: 'payment' | 'preapproval' | string;
  resourceId: string;
}

export interface HandleBillingWebhookResult {
  processed: boolean;
  reason?: string;
  userId?: string;
  planTier?: string;
  subscriptionStatus?: string;
}

export class HandleBillingWebhook {
  constructor(
    private readonly billingAdapter: BillingAdapter,
    private readonly firestoreWriter: FirestoreAdminWriter
  ) {}

  async execute(
    input: HandleBillingWebhookInput
  ): Promise<HandleBillingWebhookResult> {
    if (!input.eventId) {
      throw new Error('Event ID is required');
    }
    if (!input.topic) {
      throw new Error('Topic is required');
    }
    if (!input.resourceId) {
      throw new Error('Resource ID is required');
    }

    // 1. Idempotency Check
    const logCheck = await this.firestoreWriter.getDocument(
      'billing_event_logs',
      input.eventId
    );
    if (logCheck.ok && logCheck.exists) {
      return {
        processed: false,
        reason: 'event_already_processed',
      };
    }

    let subscriptionId = '';
    let lastPaymentId = '';

    if (input.topic === 'payment') {
      const paymentResult = await this.billingAdapter.getPayment(input.resourceId);
      if (!paymentResult.preapprovalId) {
        return {
          processed: false,
          reason: 'payment_not_associated_with_subscription',
        };
      }
      subscriptionId = paymentResult.preapprovalId;
      lastPaymentId = paymentResult.id;
    } else if (input.topic === 'preapproval') {
      subscriptionId = input.resourceId;
    } else {
      return {
        processed: false,
        reason: `unsupported_topic_${input.topic}`,
      };
    }

    // 2. Fetch latest subscription details
    const subscriptionResult = await this.billingAdapter.getSubscription(subscriptionId);
    const userId = subscriptionResult.userId;

    if (!userId) {
      return {
        processed: false,
        reason: 'subscription_no_user_reference',
      };
    }

    // 3. Retrieve current user stats to preserve subscriptionStartedAt
    const userStatsRes = await this.firestoreWriter.getDocument('user_stats', userId);
    let subscriptionStartedAt = new Date().toISOString();
    if (
      userStatsRes.ok &&
      userStatsRes.exists &&
      userStatsRes.data?.subscriptionStartedAt
    ) {
      subscriptionStartedAt = userStatsRes.data.subscriptionStartedAt;
    }

    // 4. Determine plan and status
    const planTier = subscriptionResult.plan;
    const subscriptionStatus = subscriptionResult.status;

    // 5. Update user_stats
    const patch: Record<string, any> = {
      planTier,
      subscriptionStatus,
      subscriptionId,
      subscriptionUpdatedAt: new Date().toISOString(),
      billingPeriodEnd: subscriptionResult.billingPeriodEnd.toISOString(),
    };

    if (lastPaymentId || subscriptionResult.paymentId) {
      patch.subscriptionPaymentId =
        lastPaymentId || subscriptionResult.paymentId;
    }

    if (subscriptionStatus === 'active') {
      patch.subscriptionStartedAt = subscriptionStartedAt;
    }

    const updateRes = await this.firestoreWriter.setDocument(
      'user_stats',
      userId,
      patch
    );
    if (!updateRes.ok) {
      throw new Error(`Failed to update user subscription: ${updateRes.error}`);
    }

    // 6. Log the webhook event
    const logRes = await this.firestoreWriter.setDocument(
      'billing_event_logs',
      input.eventId,
      {
        topic: input.topic,
        resourceId: input.resourceId,
        userId,
        processedAt: new Date().toISOString(),
        planTier,
        subscriptionStatus,
      }
    );

    if (!logRes.ok) {
      console.warn(
        `Failed to write idempotency log for event ${input.eventId}: ${logRes.error}`
      );
    }

    return {
      processed: true,
      userId,
      planTier,
      subscriptionStatus,
    };
  }
}
