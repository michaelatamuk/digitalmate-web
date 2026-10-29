import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendDiagnostic,
  MAX_DIAGNOSTICS,
  readDiagnostics,
  recordDiagnostic,
  sanitizeDiagnosticMessage,
  serializeDiagnostics,
  setDiagnosticsEnabled
} from '../src/lib/diagnostics';

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

describe('diagnostics', () => {
  it('redacts credentials and URL query strings', () => {
    const message = sanitizeDiagnosticMessage(
      'Request to https://bridge.example.com/turn?token=secret123 failed with Bearer abc.def.ghi'
    );
    expect(message).toContain('https://bridge.example.com/turn');
    expect(message).not.toContain('secret123');
    expect(message).not.toContain('abc.def.ghi');
    expect(message).toContain('[redacted]');
  });

  it('caps the number of stored entries', () => {
    let entries: ReturnType<typeof appendDiagnostic> = [];
    for (let index = 0; index < MAX_DIAGNOSTICS + 5; index += 1) {
      entries = appendDiagnostic(entries, { kind: 'error', message: `failure ${index}` }, index * 3_000);
    }
    expect(entries).toHaveLength(MAX_DIAGNOSTICS);
    expect(entries[entries.length - 1].message).toBe(`failure ${MAX_DIAGNOSTICS + 4}`);
  });

  it('collapses immediate duplicate failures', () => {
    const now = Date.parse('2026-10-29T12:00:00.000Z');
    const first = appendDiagnostic([], { kind: 'rejection', message: 'boom' }, now);
    const second = appendDiagnostic(first, { kind: 'rejection', message: 'boom' }, now + 500);
    expect(second).toHaveLength(1);
    const later = appendDiagnostic(second, { kind: 'rejection', message: 'boom' }, now + 10_000);
    expect(later).toHaveLength(2);
  });

  it('records locally only while enabled and can serialize', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    recordDiagnostic('error', 'first failure');
    expect(readDiagnostics()).toHaveLength(1);

    setDiagnosticsEnabled(false);
    recordDiagnostic('error', 'ignored failure');
    expect(readDiagnostics()).toHaveLength(1);

    const exported = JSON.parse(serializeDiagnostics(readDiagnostics())) as {
      app: string;
      entries: Array<{ message: string }>;
    };
    expect(exported.app).toBe('digitalmate-web');
    expect(exported.entries[0].message).toBe('first failure');
  });
});
