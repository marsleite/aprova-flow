/**
 * Google Calendar API integration via Firebase Google Auth
 *
 * Uses signInWithPopup with calendar scope to get an OAuth access token,
 * then calls the Google Calendar REST API directly from the client.
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

const GCAL_API = 'https://www.googleapis.com/calendar/v3';

// Color IDs for Google Calendar events
// https://developers.google.com/calendar/api/v3/reference/colors
const TYPE_COLOR: Record<string, string> = {
  study: '9',    // Blueberry
  review: '7',   // Peacock
  test: '11',    // Tomato
  break: '2',    // Sage
};

export interface GCalEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type?: string;
  reminderMinutes?: number;
}

/**
 * Get a Google OAuth access token with calendar.events scope.
 * Shows a popup for consent if the user hasn't granted it yet.
 */
export async function getGoogleCalendarToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error('Não foi possível obter acesso ao Google Calendar.');
  }

  return credential.accessToken;
}

/**
 * Create a single event in Google Calendar.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: GCalEventInput
): Promise<string> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const body = {
    summary: event.summary,
    description: event.description || '',
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone,
    },
    colorId: TYPE_COLOR[event.type || 'study'] || '9',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: event.reminderMinutes ?? 10 },
      ],
    },
  };

  const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Calendar error: ${res.status}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Create multiple events in Google Calendar.
 * Returns the number of events created.
 */
export async function syncEventsToGoogleCalendar(
  accessToken: string,
  events: GCalEventInput[]
): Promise<number> {
  let created = 0;
  for (const event of events) {
    await createGoogleCalendarEvent(accessToken, event);
    created++;
  }
  return created;
}
