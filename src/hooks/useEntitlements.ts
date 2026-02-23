'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUserEntitlements, UserEntitlements } from '@/lib/firebase/entitlements';
import { getCapabilitiesForTier } from '@/lib/entitlements';

const DEFAULT_ENTITLEMENTS: UserEntitlements = {
  planTier: 'free',
  capabilities: getCapabilitiesForTier('free'),
};

export function useEntitlements(userId?: string | null, email?: string | null) {
  const [entitlements, setEntitlements] = useState<UserEntitlements>(DEFAULT_ENTITLEMENTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntitlements(DEFAULT_ENTITLEMENTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getUserEntitlements(userId, email);
      setEntitlements(data);
    } catch {
      setEntitlements(DEFAULT_ENTITLEMENTS);
    } finally {
      setLoading(false);
    }
  }, [userId, email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleUpdated() {
      void refresh();
    }

    window.addEventListener('aprova:entitlements-updated', handleUpdated);
    return () => window.removeEventListener('aprova:entitlements-updated', handleUpdated);
  }, [refresh]);

  return {
    ...entitlements,
    loading,
    refresh,
  };
}
