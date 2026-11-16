export const HIVE_SHARE_KEY = 'digitalmate.hive.share';

/**
 * Turns share-target query params into one draft string. Empty values are skipped and repeated
 * values are collapsed, so sharing the same text and url does not duplicate the line.
 */
export function readShareText(params: URLSearchParams): string {
  const parts: string[] = [];
  for (const key of ['title', 'text', 'url']) {
    const value = (params.get(key) ?? '').trim();
    if (value && !parts.includes(value)) parts.push(value);
  }
  return parts.join('\n');
}

/** Holds shared files until the Hive sheet mounts and takes them (same page load only). */
let pendingHiveFiles: File[] = [];

export function stashHiveShareFiles(files: File[]): void {
  if (!files.length) return;
  pendingHiveFiles = [...pendingHiveFiles, ...files].slice(0, 5);
}

export function consumeHiveShareFiles(): File[] {
  const files = pendingHiveFiles;
  pendingHiveFiles = [];
  return files;
}

/** Holds the shared text until the Hive sheet mounts and takes it. */
export function stashHiveShare(text: string): void {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIVE_SHARE_KEY, trimmed);
  } catch {
    // Sharing is best-effort; the app still opens without the draft.
  }
}

/** Reads and clears the pending share, so it lands in exactly one draft. */
export function consumeHiveShare(): string {
  if (typeof window === 'undefined') return '';
  try {
    const value = window.localStorage.getItem(HIVE_SHARE_KEY) ?? '';
    if (value) window.localStorage.removeItem(HIVE_SHARE_KEY);
    return value;
  } catch {
    return '';
  }
}
