import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LIVE_BACKEND_KEY,
  hasLiveBackend,
  liveBackendBase,
  normalizeBackendUrl,
  readLiveBackend,
  writeLiveBackend
} from '../src/lib/liveBackend';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    key: index => Array.from(data.keys())[index] ?? null,
    removeItem: key => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    }
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('live backend setting', () => {
  it('accepts http(s) URLs only and trims trailing slashes', () => {
    expect(normalizeBackendUrl(' https://oj.example.com/ ')).toBe('https://oj.example.com');
    expect(normalizeBackendUrl('http://192.168.1.5:8790')).toBe('http://192.168.1.5:8790');
    expect(normalizeBackendUrl('oj.example.com')).toBe('');
    expect(normalizeBackendUrl('ftp://example.com')).toBe('');
    expect(normalizeBackendUrl('')).toBe('');
    expect(normalizeBackendUrl(undefined)).toBe('');
  });

  it('stores, reads and clears the choice', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    expect(readLiveBackend()).toBe('');
    expect(hasLiveBackend()).toBe(false);

    expect(writeLiveBackend('https://oj.example.com/')).toBe('https://oj.example.com');
    expect(window.localStorage.getItem(LIVE_BACKEND_KEY)).toBe('https://oj.example.com');
    expect(readLiveBackend()).toBe('https://oj.example.com');
    expect(liveBackendBase()).toBe('https://oj.example.com');

    writeLiveBackend('');
    expect(readLiveBackend()).toBe('');
    expect(hasLiveBackend()).toBe(false);
  });

  it('ignores a corrupt stored value', () => {
    const storage = memoryStorage();
    storage.setItem(LIVE_BACKEND_KEY, 'not a url');
    vi.stubGlobal('window', { localStorage: storage });
    expect(readLiveBackend()).toBe('');
    expect(liveBackendBase()).toBe('');
  });
});
