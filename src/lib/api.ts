import { liveBackendBase } from './liveBackend';

/**
 * Absolute API base for native/static builds and for a user-configured live backend.
 * Empty means same-origin. The user setting wins over VITE_API_BASE.
 * Example: VITE_API_BASE=https://bridge.example.com
 */
export function apiUrl(path: string): string {
  const base = liveBackendBase();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
