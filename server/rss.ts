import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { parseFeedXml } from '../src/lib/rssParse';
import type { RssFeed } from '../src/types';

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 9_000;
const MAX_REDIRECTS = 3;

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === 'metadata.google.internal' || host === 'metadata.azure.internal') return true;
  if (/^(0|10|127)\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host === '::1' || host === '::' || /^(fc|fd|fe80)/.test(host)) return true;
  return false;
}

export function assertFetchableUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Feed URL is not a valid absolute URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https feed URLs are supported');
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error('Private and loopback hosts are not allowed');
  }
  return url;
}

export async function fetchFeed(rawUrl: string): Promise<RssFeed> {
  let url = assertFetchableUrl(rawUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'user-agent': 'DigitalMateWeb/0.1 (+https://github.com/michaelatamuk/digitalmate-web)'
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Feed redirected without a Location header (${response.status})`);
      url = assertFetchableUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Feed request failed with HTTP ${response.status}`);
    }

    const declared = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      throw new Error('Feed is larger than the 2 MB limit');
    }

    const xml = await response.text();
    if (xml.length > MAX_BYTES) {
      throw new Error('Feed is larger than the 2 MB limit');
    }

    const feed = parseFeedXml(xml, url.toString());
    if (feed.items.length === 0) {
      throw new Error('Feed parsed successfully but contained no usable items');
    }
    return feed;
  }

  throw new Error('Too many redirects');
}

export async function handleRssRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname !== '/api/rss') return;
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'Use GET' }));
    return;
  }

  const target = url.searchParams.get('url')?.trim();
  if (!target) {
    response.statusCode = 400;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }

  try {
    const feed = await fetchFeed(target);
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.end(JSON.stringify(feed));
  } catch (error) {
    response.statusCode = 502;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Could not fetch the feed' })
    );
  }
}

export function rssProxyPlugin(): Plugin {
  return {
    name: 'digitalmate-rss-proxy',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRssRequest(request, response).then(() => {
          if (!response.writableEnded) next();
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRssRequest(request, response).then(() => {
          if (!response.writableEnded) next();
        });
      });
    }
  };
}
