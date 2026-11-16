import { describe, expect, it } from 'vitest';
import { isHiveMode, resolveHiveMode } from '../src/lib/hiveMode';

describe('Hive mode resolution', () => {
  it('prefers the query override', () => {
    expect(resolveHiveMode({ mode: 'mock' }, '?hive=off', 'bridge')).toBe('off');
    expect(resolveHiveMode({}, '?hive=bridge', '')).toBe('bridge');
  });

  it('falls back to storage, then env, then the bridge url', () => {
    expect(resolveHiveMode({ mode: 'off' }, '', 'mock')).toBe('mock');
    expect(resolveHiveMode({ mode: 'off' }, '', '')).toBe('off');
    expect(resolveHiveMode({}, '', '')).toBe('mock');
    expect(resolveHiveMode({ bridgeUrl: 'https://bridge.test' }, '', '')).toBe('bridge');
  });

  it('ignores unknown values instead of guessing', () => {
    expect(resolveHiveMode({ mode: 'nope' }, '?hive=on', 'what')).toBe('mock');
    expect(isHiveMode('off')).toBe(true);
    expect(isHiveMode('maybe')).toBe(false);
  });
});
