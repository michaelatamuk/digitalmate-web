/* DigitalMate Web service worker: account-free offline shell and runtime cache. */
const CACHE = 'digitalmate-web-v6';
const SHARE_CACHE = 'digitalmate-share';
const scope = new URL('./', self.location.href);
const shellPath = path => new URL(path, scope).href;
const sharePath = path => new URL(path, self.location.origin).href;
const SHELL = [
  shellPath('./'),
  shellPath('index.html'),
  shellPath('manifest.webmanifest'),
  shellPath('icon.svg'),
  shellPath('bee/bee-idle-still.png')
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  const urls = event.data?.type === 'CACHE_URLS' ? event.data.urls : null;
  if (Array.isArray(urls)) {
    event.waitUntil(
      caches
        .open(CACHE)
        .then(cache => Promise.allSettled(urls.map(url => cache.add(url))))
        .catch(() => undefined)
    );
  }
});

/**
 * POST share target: files and text cannot travel in the query string, so the browser posts a form
 * here, the worker empties it into the share cache and redirects to the app, which reads it once.
 */
async function handleShare(request) {
  try {
    const form = await request.formData();
    const parts = ['title', 'text', 'url']
      .map(key => String(form.get(key) ?? '').trim())
      .filter(Boolean);
    const files = form.getAll('files').filter(value => typeof File !== 'undefined' && value instanceof File);
    const cache = await caches.open(SHARE_CACHE);
    const meta = {
      text: parts.join('\n'),
      files: files.map((file, index) => ({ index, name: file.name, size: file.size, type: file.type }))
    };
    for (const [index, file] of files.entries()) {
      await cache.put(
        sharePath(`/__share/file/${index}/${encodeURIComponent(file.name)}`),
        new Response(file, { headers: { 'content-type': file.type || 'application/octet-stream' } })
      );
    }
    await cache.put(
      sharePath('/__share/meta'),
      new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } })
    );
    return Response.redirect(new URL('./?shared=1', scope).href, 303);
  } catch {
    return Response.redirect(new URL('./', scope).href, 303);
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/share-target')) {
    event.respondWith(handleShare(request));
    return;
  }
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(shellPath('index.html'), copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(shellPath('index.html')).then(cached => cached || caches.match(shellPath('./'))))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    })
  );
});
