import { GoogleAuthProvider, reauthenticateWithPopup, type User } from 'firebase/auth';
import type { WeeklyEvent } from '../types';
import { localDateKey } from '../utils/calendarMonth';

type GoogleEvent = {
  id: string; summary?: string; status?: string; htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export async function authorizeGoogleCalendar(user: User): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
  if (user.email) provider.setCustomParameters({ login_hint: user.email });
  const result = await reauthenticateWithPopup(user, provider);
  if (result.user.uid !== user.uid) throw new Error('Autorize a mesma conta Google utilizada no Nodrix.');
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) throw new Error('O Google não retornou a autorização. Tente conectar novamente.');
  return token;
}

function trustedLink(link?: string): string | undefined {
  try {
    if (!link) return undefined;
    const u = new URL(link);
    if (u.protocol === 'https:' && (u.hostname === 'calendar.google.com' ||
      (u.hostname === 'www.google.com' && u.pathname.startsWith('/calendar/')))) return u.href;
  } catch { /* Invalid external URL */ }
  return undefined;
}

/** Values used only in the authenticated user's browser; never persisted to Firestore. */
export function mapGoogleEvents(events: GoogleEvent[], userId: string): WeeklyEvent[] {
  const results: WeeklyEvent[] = [];
  for (const item of events) {
    if (!item.id || item.status === 'cancelled') continue;
    const instant = item.start?.dateTime ? new Date(item.start.dateTime) : null;
    const start = item.start?.date || (instant && !Number.isNaN(instant.getTime()) ? localDateKey(instant) : '');
    if (!start) continue;
    const time = instant && !Number.isNaN(instant.getTime())
      ? `${String(instant.getHours()).padStart(2, '0')}:${String(instant.getMinutes()).padStart(2, '0')}` : undefined;
    const base = {
      title: item.summary || 'Ocupado', type: 'outro' as const, time,
      assigneeIds: [userId], createdById: userId, createdAt: '',
      source: 'google' as const, googleHtmlLink: trustedLink(item.htmlLink),
    };
    // An all-day end date is exclusive: repeat multi-day entries in each cell.
    const end = item.start?.date && item.end?.date ? item.end.date : '';
    if (end > start) {
      const [y,m,d] = start.split('-').map(Number);
      const cursor = new Date(y,m-1,d,12);
      for (let day = 0; day < 370 && localDateKey(cursor) < end; day++) {
        const date = localDateKey(cursor);
        results.push({ ...base, id: `google:${item.id}:${date}`, date });
        cursor.setDate(cursor.getDate()+1);
      }
    } else results.push({ ...base, id: `google:${item.id}:${start}`, date: start });
  }
  return results;
}

function localMidnight(key: string) {
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y,m-1,d).toISOString();
}
export async function fetchGoogleCalendar(
  token: string, start: string, endExclusive: string, userId: string, signal?: AbortSignal,
): Promise<WeeklyEvent[]> {
  const items: GoogleEvent[] = [];
  let next: string | undefined;
  for (let page=0; page<20; page++) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('singleEvents','true');
    url.searchParams.set('orderBy','startTime');
    url.searchParams.set('maxResults','500');
    url.searchParams.set('timeMin',localMidnight(start));
    url.searchParams.set('timeMax',localMidnight(endExclusive));
    if (next) url.searchParams.set('pageToken',next);
    const response = await fetch(url.toString(), {
      headers:{Authorization:`Bearer ${token}`}, signal, cache:'no-store',
    });
    if (!response.ok) {
      if (response.status===401) throw new Error('Autorização expirada. Conecte sua conta Google novamente.');
      if (response.status===403) throw new Error('Acesso negado. Verifique a permissão e a ativação da Calendar API no Google Cloud.');
      throw new Error('Não foi possível atualizar os compromissos Google.');
    }
    const payload = await response.json() as { items?: GoogleEvent[]; nextPageToken?: string };
    items.push(...(payload.items || []));
    next=payload.nextPageToken;
    if (!next) return mapGoogleEvents(items,userId).filter(event=>event.date>=start&&event.date<endExclusive);
  }
  throw new Error('A consulta excedeu o limite de páginas de eventos.');
}
