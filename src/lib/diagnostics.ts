/**
 * Local-only diagnostics.
 *
 * Recent application errors are kept in this browser so they can be exported
 * for a bug report. Nothing is uploaded, and no account or remote service is
 * involved. Messages are sanitized to drop URLs, query tokens and bearer
 * credentials before they are stored.
 */

export const DIAGNOSTICS_KEY = 'digitalmate.diagnostics.v1';
export const DIAGNOSTICS_ENABLED_KEY = 'digitalmate.diagnostics.enabled.v1';
export const MAX_DIAGNOSTICS = 20;
const MAX_MESSAGE_CHARS = 400;
const MAX_SOURCE_CHARS = 240;
const DEDUPE_MS = 2_000;

export type DiagnosticKind = 'error' | 'rejection' | 'component';

export interface DiagnosticEntry {
  at: string;
  kind: DiagnosticKind;
  message: string;
  source?: string;
}

export function sanitizeDiagnosticMessage(value: unknown): string {
  const raw =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : String(value ?? '');
  return raw
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/([?&](?:token|access_token|key|secret|password)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/https?:\/\/[^\s'")]+/gi, match => {
      try {
        const url = new URL(match);
        return `${url.origin}${url.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
}

function sanitizeSource(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_SOURCE_CHARS);
}

/** Pure list update used by the browser store and by unit tests. */
export function appendDiagnostic(
  entries: DiagnosticEntry[],
  input: { kind: DiagnosticKind; message: unknown; source?: unknown },
  now = Date.now()
): DiagnosticEntry[] {
  const message = sanitizeDiagnosticMessage(input.message);
  if (!message) return entries;

  const at = new Date(now).toISOString();
  const last = entries[entries.length - 1];
  if (last && last.kind === input.kind && last.message === message) {
    const previous = Date.parse(last.at);
    if (Number.isFinite(previous) && Math.abs(now - previous) <= DEDUPE_MS) return entries;
  }

  const source = sanitizeSource(input.source);
  const entry: DiagnosticEntry = { at, kind: input.kind, message, ...(source ? { source } : {}) };
  return [...entries, entry].slice(-MAX_DIAGNOSTICS);
}

export function isDiagnosticsEnabled(): boolean {
  try {
    return window.localStorage.getItem(DIAGNOSTICS_ENABLED_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setDiagnosticsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(DIAGNOSTICS_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // Storage can be unavailable in private mode; recording simply stops.
  }
}

export function readDiagnostics(): DiagnosticEntry[] {
  try {
    const raw = window.localStorage.getItem(DIAGNOSTICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is DiagnosticEntry =>
          Boolean(entry) &&
          typeof entry === 'object' &&
          typeof (entry as DiagnosticEntry).at === 'string' &&
          typeof (entry as DiagnosticEntry).message === 'string' &&
          ['error', 'rejection', 'component'].includes((entry as DiagnosticEntry).kind)
      )
      .slice(-MAX_DIAGNOSTICS);
  } catch {
    return [];
  }
}

export function clearDiagnostics(): void {
  try {
    window.localStorage.removeItem(DIAGNOSTICS_KEY);
  } catch {
    // ignore
  }
}

export function recordDiagnostic(
  kind: DiagnosticKind,
  message: unknown,
  source?: unknown
): void {
  if (!isDiagnosticsEnabled()) return;
  try {
    const entries = appendDiagnostic(readDiagnostics(), { kind, message, source });
    window.localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(entries));
  } catch {
    // Diagnostics must never break the app.
  }
}

function reasonMessage(reason: unknown): unknown {
  if (reason instanceof Error) return reason.message;
  return reason;
}

/** Attach browser-level error capture. Returns a cleanup function. */
export function installDiagnostics(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (event: ErrorEvent) => {
    recordDiagnostic('error', event.message, event.filename);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    recordDiagnostic('rejection', reasonMessage(event.reason));
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

export function serializeDiagnostics(entries: DiagnosticEntry[], now = new Date()): string {
  return JSON.stringify(
    {
      app: 'digitalmate-web',
      kind: 'diagnostics',
      version: 1,
      exportedAt: now.toISOString(),
      entries
    },
    null,
    2
  );
}
