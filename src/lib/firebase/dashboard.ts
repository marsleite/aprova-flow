import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const DASHBOARD_LAYOUT_COLLECTION = 'dashboard_layouts';

export interface DashboardLayoutPrefs {
  order: string[];
  hidden: string[];
  sizes: Record<string, string>;
}

interface DashboardLayoutDoc extends DashboardLayoutPrefs {
  userId: string;
  version: number;
  updatedAt: string;
}

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized || unique.includes(normalized)) continue;
    unique.push(normalized);
  }

  return unique;
}

function sanitizeSizesMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: Record<string, string> = {};

  for (const [key, raw] of entries) {
    const normalizedKey = key.trim();
    if (!normalizedKey || typeof raw !== 'string') continue;
    const normalizedValue = raw.trim();
    if (!normalizedValue) continue;
    normalized[normalizedKey] = normalizedValue;
  }

  return normalized;
}

export async function getDashboardLayoutPrefs(userId: string): Promise<DashboardLayoutPrefs | null> {
  const ref = doc(db, DASHBOARD_LAYOUT_COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Partial<DashboardLayoutDoc>;
  return {
    order: sanitizeStringList(data.order),
    hidden: sanitizeStringList(data.hidden),
    sizes: sanitizeSizesMap(data.sizes),
  };
}

export async function saveDashboardLayoutPrefs(userId: string, prefs: DashboardLayoutPrefs): Promise<void> {
  const ref = doc(db, DASHBOARD_LAYOUT_COLLECTION, userId);
  const payload: DashboardLayoutDoc = {
    userId,
    order: sanitizeStringList(prefs.order),
    hidden: sanitizeStringList(prefs.hidden),
    sizes: sanitizeSizesMap(prefs.sizes),
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ref, payload, { merge: true });
}
