/**
 * Optional absolute API base for native/static builds. Empty means same-origin.
 * Example: VITE_API_BASE=https://bridge.example.com
 */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE ?? '').trim().replace(/\/+$/, '');
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
