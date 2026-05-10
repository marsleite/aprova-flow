'use client';

import {
  DEFAULT_ENTITLEMENT_POLICY,
  EntitlementMode,
  FeatureCode,
  PlanCode,
  type FeatureCode as FeatureCodeValue,
} from '@aprovamind/domain';
import type {
  EntitlementSnapshotValueV1,
  UserEntitlementsSnapshotV1,
} from '@aprovamind/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getUserEntitlements as getLegacyUserEntitlements,
  type UserEntitlements,
} from '@/lib/firebase/entitlements';
import { auth } from '@/lib/firebase/config';
import { getCapabilitiesForTier } from '@/lib/entitlements';
import { isAdminIdentity } from '@/lib/admin';
import {
  dispatchEntitlementsUpdated,
  getStoredEntitlementScenarioUserId,
  isEntitlementSandboxAvailable,
  syncEntitlementScenarioFromUrl,
} from '@/lib/entitlement-sandbox';
import {
  fetchUserEntitlementsSnapshot,
  getEntitlementFeature,
  isEntitlementFeatureEnabled,
  mapSnapshotToLegacyEntitlements,
} from '@/lib/entitlements-client';

const DEFAULT_ENTITLEMENTS: UserEntitlements = {
  planTier: 'free',
  capabilities: getCapabilitiesForTier('free'),
};

const ADMIN_ACTIVE_PLANS_LIMIT = 9999;

function buildAdminFeatureSnapshot(
  featureCode: FeatureCodeValue
): EntitlementSnapshotValueV1 {
  if (featureCode === FeatureCode.ActivePlans) {
    return {
      mode: 'quota',
      enabled: true,
      limit: ADMIN_ACTIVE_PLANS_LIMIT,
      used: 0,
      remaining: ADMIN_ACTIVE_PLANS_LIMIT,
      period: 'month',
    };
  }

  const proRule =
    DEFAULT_ENTITLEMENT_POLICY.plans[PlanCode.Pro].features[featureCode];

  if (proRule.mode === EntitlementMode.Quota) {
    return {
      mode: 'quota',
      enabled: true,
      limit: proRule.limit,
      used: 0,
      remaining: proRule.limit,
      period: proRule.period,
    };
  }

  return {
    mode: 'boolean',
    enabled: true,
  };
}

type EntitlementSource = 'api' | 'legacy' | 'default';

export function useEntitlements(userId?: string | null, email?: string | null) {
  const [entitlements, setEntitlements] = useState<UserEntitlements>(DEFAULT_ENTITLEMENTS);
  const [snapshot, setSnapshot] = useState<UserEntitlementsSnapshotV1 | null>(null);
  const [source, setSource] = useState<EntitlementSource>('default');
  const [sandboxScenarioUserId, setSandboxScenarioUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isEntitlementSandboxAvailable()) return;

    const fromUrl = syncEntitlementScenarioFromUrl();
    const stored = getStoredEntitlementScenarioUserId();
    setSandboxScenarioUserId(fromUrl ?? stored);
  }, []);

  const refresh = useCallback(async () => {
    const requestedUserId = sandboxScenarioUserId || userId;

    if (!requestedUserId) {
      setEntitlements(DEFAULT_ENTITLEMENTS);
      setSnapshot(null);
      setSource('default');
      setLoading(false);
      return;
    }

    if (!sandboxScenarioUserId && isAdminIdentity({ uid: userId, email })) {
      setEntitlements({
        planTier: 'admin',
        capabilities: getCapabilitiesForTier('admin'),
      });
      setSnapshot(null);
      setSource('legacy');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiSnapshot = await fetchUserEntitlementsSnapshot({
        sandboxUserId: sandboxScenarioUserId,
        idToken: sandboxScenarioUserId
          ? null
          : await auth.currentUser?.getIdToken().catch(() => null),
      });
      setEntitlements(mapSnapshotToLegacyEntitlements(apiSnapshot));
      setSnapshot(apiSnapshot);
      setSource('api');
    } catch {
      if (sandboxScenarioUserId) {
        setEntitlements(DEFAULT_ENTITLEMENTS);
        setSnapshot(null);
        setSource('default');
      } else if (userId) {
        const data = await getLegacyUserEntitlements(userId, email);
        setEntitlements(data);
        setSnapshot(null);
        setSource('legacy');
      } else {
        setEntitlements(DEFAULT_ENTITLEMENTS);
        setSnapshot(null);
        setSource('default');
      }
    } finally {
      setLoading(false);
    }
  }, [sandboxScenarioUserId, userId, email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleUpdated() {
      if (isEntitlementSandboxAvailable()) {
        setSandboxScenarioUserId(getStoredEntitlementScenarioUserId());
      }
      void refresh();
    }

    window.addEventListener('aprova:entitlements-updated', handleUpdated);
    return () => window.removeEventListener('aprova:entitlements-updated', handleUpdated);
  }, [refresh]);

  const helpers = useMemo(
    () => ({
      hasFeature(featureCode: FeatureCodeValue) {
        if (entitlements.planTier === 'admin') {
          return true;
        }
        return isEntitlementFeatureEnabled(snapshot, featureCode);
      },
      getFeature(featureCode: FeatureCodeValue) {
        if (entitlements.planTier === 'admin') {
          return buildAdminFeatureSnapshot(featureCode);
        }
        return getEntitlementFeature(snapshot, featureCode);
      },
    }),
    [snapshot, entitlements.planTier]
  );

  return {
    ...entitlements,
    entitlementsSnapshot: snapshot,
    source,
    usingSandbox: Boolean(sandboxScenarioUserId),
    sandboxScenarioUserId,
    loading,
    refresh,
    dispatchEntitlementsUpdated,
    ...helpers,
  };
}
