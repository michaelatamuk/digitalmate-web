import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'digitalmate.web.v2.';

export const STORAGE_KEYS = {
  messages: `${PREFIX}messages.v1`,
  archived: `${PREFIX}archived.v1`,
  settings: `${PREFIX}settings.v1`,
  language: `${PREFIX}language.v1`,
  reactions: `${PREFIX}reactions.v1`,
  topics: `${PREFIX}topics.v1`,
  skills: `${PREFIX}skills.v1`,
  savedCards: `${PREFIX}saved.v1`,
  rssCards: `${PREFIX}rssCards.v1`,
  installed: `${PREFIX}installed.v1`
};

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private mode; the demo still works in memory.
  }
}

export function usePersistentState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readStorage<T>(key, initial));

  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);

  const update = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => (typeof value === 'function' ? (value as (prev: T) => T)(prev) : value));
  }, []);

  return [state, update];
}

export function clearDemoStorage(): void {
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    if (name === 'language') continue;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}
