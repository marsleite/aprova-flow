import { Timestamp } from 'firebase/firestore';

export type FirestoreDateLike = string | Date | Timestamp | null | undefined;

export function toIsoString(value: FirestoreDateLike): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value.toDate().toISOString();
}

export function toDateOnly(value: FirestoreDateLike): string | null {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
}

export function normalizeDateOnly(value: unknown, fallback: string | null = null): string | null {
  if (typeof value !== 'string') return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function nowIso(): string {
  return new Date().toISOString();
}
