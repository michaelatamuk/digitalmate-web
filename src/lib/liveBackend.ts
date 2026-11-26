/**
 * The optional live backend the user configures at runtime.
 *
 * Empty means "local demo": the mock engine and the mock Hive transport run in the browser.
 * A set URL means "use this service for everything it serves": chat turns and Hive both go through
 * it, and a failure is reported as unavailable rather than silently replaced by mock data.
 */
export const LIVE_BACKEND_KEY = 'digitalmate.liveBackend';
/** Set when a same-origin bridge answered the health probe; cleared when it stops answering. */
export const LIVE_BACKEND_AUTO_KEY = 'digitalmate.liveBackendAuto';

/** Trims whitespace and trailing slashes; returns '' for anything that is not http(s). */
export function normalizeBackendUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\/[^\s]+$/i.test(trimmed) ? trimmed : '';
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The URL saved by the user, or '' when the app runs on the local demo. */
export function readLiveBackend(): string {
  const target = storage();
  if (!target) return '';
  try {
    return normalizeBackendUrl(target.getItem(LIVE_BACKEND_KEY) ?? '');
  } catch {
    return '';
  }
}

export function writeLiveBackend(value: unknown): string {
  const url = normalizeBackendUrl(value);
  const target = storage();
  if (target) {
    try {
      if (url) target.setItem(LIVE_BACKEND_KEY, url);
      else target.removeItem(LIVE_BACKEND_KEY);
    } catch {
      // Storage being unavailable only means the choice is not remembered.
    }
  }
  return url;
}

/**
 * Base for API calls: an explicit URL, then an auto-detected same-origin bridge, then the build-time
 * override. Auto detection returns '' (same origin) so a dev server proxy or a served bridge works.
 */
export function liveBackendBase(): string {
  const explicit = readLiveBackend();
  if (explicit) return explicit;
  if (readAutoBackend()) return '';
  return normalizeBackendUrl(import.meta.env.VITE_API_BASE ?? '');
}

export function hasLiveBackend(): boolean {
  return Boolean(readLiveBackend());
}

export function readAutoBackend(): boolean {
  const target = storage();
  if (!target) return false;
  try {
    return target.getItem(LIVE_BACKEND_AUTO_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeAutoBackend(found: boolean): void {
  const target = storage();
  if (!target) return;
  try {
    if (found) target.setItem(LIVE_BACKEND_AUTO_KEY, '1');
    else target.removeItem(LIVE_BACKEND_AUTO_KEY);
  } catch {
    // Not remembering the probe result only means probing again next time.
  }
}
