import type { RssFeed } from '../types';
import { apiUrl } from './api';

export async function fetchRssFeed(url: string, signal?: AbortSignal): Promise<RssFeed> {
  const response = await fetch(apiUrl(`/api/rss?url=${encodeURIComponent(url)}`), {
    headers: { accept: 'application/json' },
    signal
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`RSS proxy returned HTTP ${response.status}`);
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `RSS proxy returned HTTP ${response.status}`;
    throw new Error(message);
  }

  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as RssFeed).items)) {
    throw new Error('RSS proxy returned an unexpected payload');
  }

  return payload as RssFeed;
}
