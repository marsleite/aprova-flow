import type {
  GetUserSubscriptionStateParams,
  GetUserSubscriptionStateResult,
  SubscriptionStateDataSource,
  UserSubscriptionState,
} from '@aprovamind/application/ports/SubscriptionStateDataSource';
import type { FeatureUsageMap, PlanCode, SubscriptionStatus } from '@aprovamind/domain';
import { PlanCode as Plan, SubscriptionStatus as Status } from '@aprovamind/domain';
import {
  getFirestoreDocumentWithUserToken,
  setFirestoreDocumentWithUserToken,
  type FirestoreDocumentResult,
  type FirestoreWriteResult,
} from '@aprovamind/infrastructure-firebase';
import {
  buildSubscriptionPatch,
  extractPlanCode,
  extractSubscriptionStatus,
  extractUsage,
  type AdminIdentity,
} from './subscription-state.shared';
import { USER_STATS_COLLECTION } from './firestore-subscription-state-data-source';

export interface UpdateUserSubscriptionStateParams {
  userId: string;
  plan?: PlanCode;
  status?: SubscriptionStatus;
  usage?: FeatureUsageMap;
  resetUsage?: boolean;
}

export interface SubscriptionAdminDataSource extends SubscriptionStateDataSource {
  updateUserSubscriptionState(
    params: UpdateUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult>;
}

interface FirestoreSubscriptionAdminDataSourceOptions {
  idToken: string;
  identity: AdminIdentity;
  loadUserStats?: (params: {
    userId: string;
    idToken: string;
  }) => Promise<FirestoreDocumentResult>;
  saveUserStats?: (params: {
    userId: string;
    idToken: string;
    data: Record<string, string>;
  }) => Promise<FirestoreWriteResult>;
}

async function defaultLoadUserStats(params: {
  userId: string;
  idToken: string;
}): Promise<FirestoreDocumentResult> {
  return getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: params.userId,
    idToken: params.idToken,
  });
}

async function defaultSaveUserStats(params: {
  userId: string;
  idToken: string;
  data: Record<string, string>;
}): Promise<FirestoreWriteResult> {
  return setFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION,
    documentId: params.userId,
    idToken: params.idToken,
    data: params.data,
  });
}

export class FirestoreSubscriptionAdminDataSource
  implements SubscriptionAdminDataSource
{
  private readonly loadUserStats: NonNullable<
    FirestoreSubscriptionAdminDataSourceOptions['loadUserStats']
  >;

  private readonly saveUserStats: NonNullable<
    FirestoreSubscriptionAdminDataSourceOptions['saveUserStats']
  >;

  constructor(private readonly options: FirestoreSubscriptionAdminDataSourceOptions) {
    this.loadUserStats = options.loadUserStats ?? defaultLoadUserStats;
    this.saveUserStats = options.saveUserStats ?? defaultSaveUserStats;
  }

  async getUserSubscriptionState(
    params: GetUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult> {
    const document = await this.loadUserStats({
      userId: params.userId,
      idToken: this.options.idToken,
    });

    if (!document.ok) {
      throw new Error(
        `subscription_state_read_failed:${document.status ?? 'unknown'}:${
          document.error || 'unknown_error'
        }`
      );
    }

    if (!document.exists) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: Plan.Free,
          status: Status.Active,
        },
      };
    }

    return {
      found: true,
      subscription: this.toSubscription(params.userId, document.data),
    };
  }

  async updateUserSubscriptionState(
    params: UpdateUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult> {
    const currentState = await this.getUserSubscriptionState({
      userId: params.userId,
    });

    const currentPlan =
      currentState.found ? currentState.subscription.plan : Plan.Free;
    const currentStatus =
      currentState.found ? currentState.subscription.status : Status.Active;

    const patch = buildSubscriptionPatch({
      plan: params.plan,
      status: params.status,
      usage: params.usage,
      resetUsage: params.resetUsage,
      currentPlan,
      currentStatus,
    });

    if (Object.keys(patch).length === 1 && patch.subscriptionUpdatedAt) {
      throw new Error('subscription_update_empty');
    }

    const write = await this.saveUserStats({
      userId: params.userId,
      idToken: this.options.idToken,
      data: patch,
    });

    if (!write.ok) {
      throw new Error(
        `subscription_state_write_failed:${write.status ?? 'unknown'}:${
          write.error || 'unknown_error'
        }`
      );
    }

    return this.getUserSubscriptionState({ userId: params.userId });
  }
  private toSubscription(
    userId: string,
    data: Record<string, unknown> | undefined
  ): UserSubscriptionState {
    return {
      userId,
      plan: extractPlanCode(data),
      status: extractSubscriptionStatus(data),
      usage: extractUsage(data),
    };
  }
}
