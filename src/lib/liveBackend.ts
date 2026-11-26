/**
 * The optional live backend the user configures at runtime.
 *
 * Empty means "local demo": the mock engine and the mock Hive transport run in the browser.
 * A set URL means "use this service for everything it serves": chat turns and Hive both go through
 * it, and a failure is reported as unavailable rather than silently replaced by mock data.
 */
export const LIVE_BACKEND_KEY = 'digitalmate.liveBackend';

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
 * Base for API calls: the user's choice first, then the build-time override. This is what makes a
 * single APK able to point at a different server without a rebuild.
 */
export function liveBackendBase(): string {
  return readLiveBackend() || normalizeBackendUrl(import.meta.env.VITE_API_BASE ?? '');
}

export function hasLiveBackend(): boolean {
  return Boolean(readLiveBackend());
}
