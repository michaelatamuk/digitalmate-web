import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeHiveShare, readShareText, stashHiveShare } from '../src/lib/hiveShare';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Hive share target', () => {
  it('joins the shared parts and collapses duplicates', () => {
    expect(readShareText(new URLSearchParams('?title=Hi&text=Hello&url=https%3A%2F%2Fexample.com'))).toBe(
      'Hi\nHello\nhttps://example.com'
    );
    expect(readShareText(new URLSearchParams('?text=Same&url=Same'))).toBe('Same');
    expect(readShareText(new URLSearchParams('?title=%20%20'))).toBe('');
    expect(readShareText(new URLSearchParams(''))).toBe('');
  });

  it('hands a stashed share to exactly one draft', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    stashHiveShare('  Shared text  ');
    expect(consumeHiveShare()).toBe('Shared text');
    expect(consumeHiveShare()).toBe('');
  });

  it('ignores blank shares and missing storage', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    stashHiveShare('   ');
    expect(consumeHiveShare()).toBe('');

    vi.unstubAllGlobals();
    expect(consumeHiveShare()).toBe('');
  });
});
