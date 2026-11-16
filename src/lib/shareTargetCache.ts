/** Cache storage used by the service worker to hand a share to the page. */
export const SHARE_CACHE = 'digitalmate-share';
export const SHARE_META_URL = '/__share/meta';
export const SHARE_FILE_PREFIX = '/__share/file/';

export interface SharedDraft {
  text: string;
  files: File[];
}

interface SharedMeta {
  text?: string;
  files?: Array<{ index: number; name: string; size: number; type: string }>;
}

function shareUrl(path: string): string {
  return new URL(path, self.location.origin).href;
}

function fileKey(index: number, name: string): string {
  return shareUrl(`${SHARE_FILE_PREFIX}${index}/${encodeURIComponent(name)}`);
}

/**
 * Reads and clears the inbox the service worker fills on a POST share. Returns null when nothing
 * was shared, so callers can skip the work entirely.
 */
export async function readSharedDraft(): Promise<SharedDraft | null> {
  if (typeof caches === 'undefined') return null;
  let cache: Cache;
  try {
    cache = await caches.open(SHARE_CACHE);
  } catch {
    return null;
  }
  const metaResponse = await cache.match(shareUrl(SHARE_META_URL));
  if (!metaResponse) return null;

  let meta: SharedMeta = {};
  try {
    meta = await metaResponse.json() as SharedMeta;
  } catch {
    meta = {};
  }

  const files: File[] = [];
  for (const entry of meta.files ?? []) {
    const response = await cache.match(fileKey(entry.index, entry.name));
    if (!response) continue;
    try {
      const blob = await response.blob();
      files.push(new File([blob], entry.name, { type: entry.type || blob.type || 'application/octet-stream' }));
    } catch {
      // A missing or unreadable file must not block the text half of the share.
    }
  }

  await cache.delete(shareUrl(SHARE_META_URL)).catch(() => false);
  for (const entry of meta.files ?? []) {
    await cache.delete(fileKey(entry.index, entry.name)).catch(() => false);
  }

  const text = typeof meta.text === 'string' ? meta.text.trim() : '';
  if (!text && files.length === 0) return null;
  return { text, files };
}
