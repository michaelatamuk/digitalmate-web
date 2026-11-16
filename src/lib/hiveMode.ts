export type HiveMode = 'off' | 'mock' | 'bridge';

export const HIVE_MODE_KEY = 'digitalmate.hive.mode';

const MODES: HiveMode[] = ['off', 'mock', 'bridge'];

export function isHiveMode(value: unknown): value is HiveMode {
  return typeof value === 'string' && (MODES as string[]).includes(value);
}

/**
 * Mode resolution, most specific first: `?hive=` override, then the stored choice, then the build
 * env, then the presence of a bridge URL. `off` hides Hive entirely; `bridge` still needs a URL.
 */
export function resolveHiveMode(
  env: { mode?: string; bridgeUrl?: string },
  search: string,
  stored: string
): HiveMode {
  const fromQuery = new URLSearchParams(search).get('hive');
  if (isHiveMode(fromQuery)) return fromQuery;
  if (isHiveMode(stored)) return stored;
  if (isHiveMode(env.mode)) return env.mode;
  return env.bridgeUrl && env.bridgeUrl.trim() ? 'bridge' : 'mock';
}

function readStored(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(HIVE_MODE_KEY) ?? '';
  } catch {
    return '';
  }
}

function store(mode: HiveMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIVE_MODE_KEY, mode);
  } catch {
    // The mode simply falls back to env on the next load.
  }
}

let cached: HiveMode | null = null;

/** Resolved once per page load; a `?hive=` override is remembered for the session. */
export function currentHiveMode(): HiveMode {
  if (cached) return cached;
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const mode = resolveHiveMode(
    {
      mode: import.meta.env?.VITE_HIVE_MODE as string | undefined,
      bridgeUrl: import.meta.env?.VITE_HIVE_BRIDGE_URL as string | undefined
    },
    search,
    readStored()
  );
  const fromQuery = new URLSearchParams(search).get('hive');
  if (isHiveMode(fromQuery)) store(fromQuery);
  cached = mode;
  return mode;
}

export function resetHiveModeCache(): void {
  cached = null;
}
