import type {
  GetUserSubscriptionStateParams,
  GetUserSubscriptionStateResult,
  SubscriptionStateDataSource,
} from '@aprovamind/application/ports/SubscriptionStateDataSource';
import {
  PlanCode,
  SubscriptionStatus,
} from '@aprovamind/domain';
import {
  getFirestoreDocumentWithUserToken,
  type FirestoreDocumentResult,
} from '@aprovamind/infrastructure-firebase';
import {
  defaultIsAdminIdentity,
  extractPlanCode,
  extractSubscriptionStatus,
  extractUsage,
  type AdminIdentity,
} from './subscription-state.shared';

export const USER_STATS_COLLECTION = 'user_stats';

interface FirestoreSubscriptionStateDataSourceOptions {
  idToken: string;
  identity: AdminIdentity;
  loadUserStats?: (params: {
    userId: string;
    idToken: string;
  }) => Promise<FirestoreDocumentResult>;
  isAdminIdentity?: (identity: AdminIdentity) => boolean;
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

export class FirestoreSubscriptionStateDataSource
  implements SubscriptionStateDataSource
{
  private readonly loadUserStats: NonNullable<
    FirestoreSubscriptionStateDataSourceOptions['loadUserStats']
  >;

  private readonly isAdminIdentity: NonNullable<
    FirestoreSubscriptionStateDataSourceOptions['isAdminIdentity']
  >;

  constructor(private readonly options: FirestoreSubscriptionStateDataSourceOptions) {
    this.loadUserStats = options.loadUserStats ?? defaultLoadUserStats;
    this.isAdminIdentity = options.isAdminIdentity ?? defaultIsAdminIdentity;
  }

  async getUserSubscriptionState(
    params: GetUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult> {
    if (
      this.isAdminIdentity({
        uid: params.userId || this.options.identity.uid,
        email: params.email || this.options.identity.email,
      })
    ) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Pro,
          status: SubscriptionStatus.Active,
        },
      };
    }

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
          plan: PlanCode.Free,
          status: SubscriptionStatus.Active,
        },
      };
    }

    const data = document.data as Record<string, unknown> | undefined;

    return {
      found: true,
      subscription: {
        userId: params.userId,
        plan: extractPlanCode(data),
        status: extractSubscriptionStatus(data),
        usage: extractUsage(data),
      },
    };
  }
}
