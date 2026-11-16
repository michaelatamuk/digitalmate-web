/**
 * Minimal RFC 5545 event writer. Times are floating local times on purpose: a phone or desktop
 * calendar reads them in its own timezone, which is what a "create event at 15:00" means here.
 */
export interface CalendarIcsInput {
  title: string;
  start: Date;
  durationMinutes: number;
  description?: string;
  uid?: string;
}

const CRLF = '\r\n';

export function buildCalendarIcs(input: CalendarIcsInput, now = new Date()): string {
  const start = input.start;
  const minutes = Number.isFinite(input.durationMinutes) && input.durationMinutes > 0
    ? input.durationMinutes
    : 30;
  const end = new Date(start.getTime() + minutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DigitalMate//Local demo//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeText(input.uid ?? `dm-${start.getTime()}@digitalmate.local`)}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `SUMMARY:${escapeText(input.title || 'DigitalMate event')}`,
    ...(input.description ? [`DESCRIPTION:${escapeText(input.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Returns a downloadable filename that is stable enough to recognise in a downloads list. */
export function icsFilename(title: string, start: Date): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const date = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
  return `${slug ? `${slug}-` : 'digitalmate-'}${date}.ics`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localStamp(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function utcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/** Escapes the four characters RFC 5545 reserves in text values. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Lines longer than 75 octets are folded with a single leading space, as the spec requires. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines carry a leading space, so they may hold one octet less.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  if (current) parts.push(current);
  return parts.join(`${CRLF} `);
}
