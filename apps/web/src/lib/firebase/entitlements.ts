import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  PlanCapabilities,
  PlanTier,
  extractPlanTierFromData,
  getCapabilitiesForTier,
} from '@/lib/entitlements';
import { isAdminIdentity } from '@/lib/admin';

const USER_STATS_COLLECTION = 'user_stats';

export interface UserEntitlements {
  planTier: PlanTier;
  capabilities: PlanCapabilities;
}

export async function getUserEntitlements(userId: string, email?: string | null): Promise<UserEntitlements> {
  if (isAdminIdentity({ uid: userId, email })) {
    return {
      planTier: 'admin',
      capabilities: getCapabilitiesForTier('admin'),
    };
  }

  const ref = doc(db, USER_STATS_COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      planTier: 'free',
      capabilities: getCapabilitiesForTier('free'),
    };
  }

  const tier = extractPlanTierFromData(snap.data() as Record<string, unknown>);
  return {
    planTier: tier,
    capabilities: getCapabilitiesForTier(tier),
  };
}
