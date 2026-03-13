import type {
  AccessState,
  EntitlementPeriod,
  FeatureCode,
  PlanCode,
  SubscriptionStatus,
} from '@aprovamind/domain';

export interface BooleanEntitlementSnapshotV1 {
  mode: 'boolean';
  enabled: boolean;
}

export interface QuotaEntitlementSnapshotV1 {
  mode: 'quota';
  enabled: boolean;
  limit: number;
  used: number;
  remaining: number;
  period: EntitlementPeriod;
}

export type EntitlementSnapshotValueV1 =
  | BooleanEntitlementSnapshotV1
  | QuotaEntitlementSnapshotV1;

export type UserEntitlementFeaturesSnapshotV1 = Record<
  FeatureCode,
  EntitlementSnapshotValueV1
>;

export interface UserEntitlementsSnapshotV1 {
  catalogPlan: PlanCode;
  effectivePlan: PlanCode;
  status: SubscriptionStatus;
  accessState: AccessState;
  features: UserEntitlementFeaturesSnapshotV1;
}

export interface GetUserEntitlementsResponseV1 {
  entitlements: UserEntitlementsSnapshotV1;
}
