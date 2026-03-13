import type { UserEntitlements } from '@aprovamind/domain';
import type {
  EntitlementSnapshotValueV1,
  UserEntitlementsSnapshotV1,
} from '@aprovamind/contracts';

export function toUserEntitlementsSnapshot(
  entitlements: UserEntitlements
): UserEntitlementsSnapshotV1 {
  const features = Object.fromEntries(
    Object.entries(entitlements.features).map(([featureCode, value]) => {
      const snapshotValue: EntitlementSnapshotValueV1 =
        value.mode === 'boolean'
          ? {
              mode: 'boolean',
              enabled: value.enabled,
            }
          : {
              mode: 'quota',
              enabled: value.enabled,
              limit: value.limit,
              used: value.used,
              remaining: value.remaining,
              period: value.period,
            };

      return [featureCode, snapshotValue];
    })
  ) as UserEntitlementsSnapshotV1['features'];

  return {
    catalogPlan: entitlements.catalogPlan,
    effectivePlan: entitlements.effectivePlan,
    status: entitlements.status,
    accessState: entitlements.accessState,
    features,
  };
}
