import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSharedDraft, SHARE_META_URL } from '../src/lib/shareTargetCache';

function fakeCaches(): { caches: CacheStorage; store: Map<string, Response> } {
  const store = new Map<string, Response>();
  const cache = {
    match: async (key: string) => store.get(key),
    put: async (key: string, value: Response) => {
      store.set(key, value);
    },
    delete: async (key: string) => store.delete(key)
  } as unknown as Cache;
  return {
    caches: { open: async () => cache } as unknown as CacheStorage,
    store
  };
}

const origin = 'http://localhost';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST share inbox', () => {
  it('reads text and files once, then clears the inbox', async () => {
    const { caches, store } = fakeCaches();
    vi.stubGlobal('self', { location: { origin } });
    vi.stubGlobal('caches', caches);

    store.set(
      new URL(SHARE_META_URL, origin).href,
      new Response(JSON.stringify({
        text: 'Shared from Android',
        files: [{ index: 0, name: 'shot.png', size: 4, type: 'image/png' }]
      }), { headers: { 'content-type': 'application/json' } })
    );
    store.set(
      new URL('/__share/file/0/shot.png', origin).href,
      new Response(new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }))
    );

    const draft = await readSharedDraft();
    expect(draft?.text).toBe('Shared from Android');
    expect(draft?.files.map(file => file.name)).toEqual(['shot.png']);
    expect(draft?.files[0].size).toBe(4);

    // The inbox is emptied so a reload cannot seed the draft twice.
    expect(await readSharedDraft()).toBeNull();
  });

  it('accepts a text-only share and an empty inbox', async () => {
    const { caches, store } = fakeCaches();
    vi.stubGlobal('self', { location: { origin } });
    vi.stubGlobal('caches', caches);

    expect(await readSharedDraft()).toBeNull();

    store.set(
      new URL(SHARE_META_URL, origin).href,
      new Response(JSON.stringify({ text: 'just text' }), { headers: { 'content-type': 'application/json' } })
    );
    const draft = await readSharedDraft();
    expect(draft?.text).toBe('just text');
    expect(draft?.files).toEqual([]);
  });

  it('survives unreadable files and unreadable metadata', async () => {
    const { caches, store } = fakeCaches();
    vi.stubGlobal('self', { location: { origin } });
    vi.stubGlobal('caches', caches);

    store.set(
      new URL(SHARE_META_URL, origin).href,
      new Response(JSON.stringify({
        text: 'with a missing file',
        files: [{ index: 0, name: 'gone.bin', size: 9, type: 'application/octet-stream' }]
      }), { headers: { 'content-type': 'application/json' } })
    );
    const draft = await readSharedDraft();
    expect(draft?.text).toBe('with a missing file');
    expect(draft?.files).toEqual([]);

    store.set(new URL(SHARE_META_URL, origin).href, new Response('not json'));
    expect(await readSharedDraft()).toBeNull();
  });
});
