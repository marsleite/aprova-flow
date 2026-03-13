import type { UserEntitlementsSnapshotV1 } from '@aprovamind/contracts';
import type {
  GetUserSubscriptionStateResult,
  SubscriptionStateDataSource,
} from '@aprovamind/application/ports/SubscriptionStateDataSource';
import {
  DEFAULT_ENTITLEMENT_POLICY,
  resolveUserEntitlements,
  type EntitlementPolicy,
} from '@aprovamind/domain';
import { toUserEntitlementsSnapshot } from '@aprovamind/application/mappers/toUserEntitlementsSnapshot';

export interface GetUserEntitlementsInput {
  userId: string;
}

export type GetUserEntitlementsResult =
  | {
      found: true;
      entitlements: UserEntitlementsSnapshotV1;
    }
  | Extract<GetUserSubscriptionStateResult, { found: false }>;

export class GetUserEntitlements {
  constructor(
    private readonly dataSource: SubscriptionStateDataSource,
    private readonly policy: EntitlementPolicy = DEFAULT_ENTITLEMENT_POLICY
  ) {}

  async execute(
    input: GetUserEntitlementsInput
  ): Promise<GetUserEntitlementsResult> {
    const loaded = await this.dataSource.getUserSubscriptionState({
      userId: input.userId,
    });

    if (!loaded.found) {
      return loaded;
    }

    const entitlements = resolveUserEntitlements(
      {
        plan: loaded.subscription.plan,
        status: loaded.subscription.status,
        usage: loaded.subscription.usage,
      },
      this.policy
    );

    return {
      found: true,
      entitlements: toUserEntitlementsSnapshot(entitlements),
    };
  }
}
