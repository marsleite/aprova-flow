import type {
  FeatureUsageMap,
  PlanCode,
  SubscriptionStatus,
} from '@aprovamind/domain';

export interface UserSubscriptionState {
  userId: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  usage?: FeatureUsageMap;
}

export interface GetUserSubscriptionStateParams {
  userId: string;
}

export type GetUserSubscriptionStateResult =
  | {
      found: true;
      subscription: UserSubscriptionState;
    }
  | {
      found: false;
      reason: 'user_not_found' | 'subscription_not_found';
    };

export interface SubscriptionStateDataSource {
  getUserSubscriptionState(
    params: GetUserSubscriptionStateParams
  ): Promise<GetUserSubscriptionStateResult>;
}
