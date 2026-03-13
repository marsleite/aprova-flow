const STORAGE_KEY = 'aprovamind.entitlementScenarioUserId';
const QUERY_PARAM = 'entitlementScenario';

export function isEntitlementSandboxAvailable(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function getStoredEntitlementScenarioUserId(): string | null {
  if (typeof window === 'undefined' || !isEntitlementSandboxAvailable()) {
    return null;
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function setStoredEntitlementScenarioUserId(userId: string | null) {
  if (typeof window === 'undefined' || !isEntitlementSandboxAvailable()) {
    return;
  }

  if (userId && userId.trim().length > 0) {
    window.localStorage.setItem(STORAGE_KEY, userId.trim());
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function syncEntitlementScenarioFromUrl(): string | null {
  if (typeof window === 'undefined' || !isEntitlementSandboxAvailable()) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(QUERY_PARAM);

  if (fromUrl && fromUrl.trim().length > 0) {
    const userId = fromUrl.trim();
    setStoredEntitlementScenarioUserId(userId);
    return userId;
  }

  return null;
}

export function dispatchEntitlementsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('aprova:entitlements-updated'));
}
