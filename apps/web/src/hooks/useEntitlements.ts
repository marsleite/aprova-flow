'use client';

import { FeatureCode, type FeatureCode as FeatureCodeValue } from '@aprovamind/domain';
import type { UserEntitlementsSnapshotV1 } from '@aprovamind/contracts';
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
        return isEntitlementFeatureEnabled(snapshot, featureCode);
      },
      getFeature(featureCode: FeatureCodeValue) {
        return getEntitlementFeature(snapshot, featureCode);
      },
    }),
    [snapshot]
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
