/* DigitalMate Web service worker: account-free offline shell and runtime cache. */
const CACHE = 'digitalmate-web-v3';
const scope = new URL('./', self.location.href);
const shellPath = path => new URL(path, scope).href;
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

self.addEventListener('fetch', event => {
  const request = event.request;
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
