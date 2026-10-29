import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// The app is fully usable without an account. In production, cache the shell so it can
// reopen offline; the service worker never intercepts /api/ requests.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const primeCache = () => {
    const urls = new Set<string>(['/', '/index.html', '/manifest.webmanifest', '/icon.svg']);
    document.querySelectorAll<HTMLScriptElement>('script[src]').forEach(node => urls.add(node.src));
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
      .forEach(node => urls.add(node.href));
    navigator.serviceWorker.controller?.postMessage({ type: 'CACHE_URLS', urls: [...urls] });
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        primeCache();
        navigator.serviceWorker.addEventListener('controllerchange', primeCache);
      })
      .catch(() => {
        // Offline caching is optional; the local app still works without it.
      });
  });
}
