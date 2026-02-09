import { CalendarEvent } from '../types';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (options: {
      client_id: string;
      scope: string;
      callback: (response: { access_token?: string; error?: string }) => void;
    }) => GoogleTokenClient;
  };
};

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts };
  }
}

let accessToken: string | null = null;
let tokenClient: GoogleTokenClient | null = null;
let scriptLoading: Promise<void> | null = null;

const loadGoogleIdentityScript = () => {
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
  return scriptLoading;
};

const ensureTokenClient = async () => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID. Add it to your .env.local file.');
  }
  await loadGoogleIdentityScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services not available.');
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error) {
          console.error('Google OAuth error:', response.error);
          return;
        }
        accessToken = response.access_token ?? null;
      }
    });
  }
};

export const connectCalendar = async (): Promise<boolean> => {
  await ensureTokenClient();
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google token client not initialized.'));
      return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
    const check = () => {
      if (accessToken) {
        resolve(true);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

const guessPlatform = (link?: string): CalendarEvent['platform'] => {
  if (!link) return 'other';
  if (link.includes('meet.google.com')) return 'google_meet';
  if (link.includes('zoom.us')) return 'zoom';
  if (link.includes('teams.microsoft.com')) return 'teams';
  return 'other';
};

const parseEventLink = (event: {
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
}): string | undefined => {
  if (event.hangoutLink) return event.hangoutLink;
  const entryPoint = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === 'video'
  );
  return entryPoint?.uri;
};

export const getUpcomingEvents = async (): Promise<CalendarEvent[]> => {
  if (!accessToken) {
    throw new Error('Google Calendar not connected.');
  }

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: '10',
    singleEvents: 'true',
    orderBy: 'startTime'
  });

  const response = await fetch(`${CALENDAR_API}/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events.');
  }

  const data = (await response.json()) as {
    items?: Array<{
      id?: string;
      summary?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
      attendees?: Array<{ email?: string; displayName?: string }>;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    }>;
  };

  return (
    data.items?.map((event) => {
      const link = parseEventLink(event);
      return {
        id: event.id ?? crypto.randomUUID(),
        title: event.summary ?? 'Untitled event',
        startTime: event.start?.dateTime ? new Date(event.start.dateTime).getTime() : Date.now(),
        endTime: event.end?.dateTime ? new Date(event.end.dateTime).getTime() : Date.now(),
        attendees:
          event.attendees?.map((attendee) => attendee.displayName || attendee.email || 'Guest') ?? [],
        link,
        platform: guessPlatform(link)
      };
    }) ?? []
  );
};
