import { describe, expect, it } from 'vitest';
import {
  BACKUP_APP,
  BACKUP_VERSION,
  collectBackup,
  formatBytes,
  parseBackup,
  restoreBackup,
  serializeBackup,
  summarizeBackup
} from '../src/lib/backup';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const prefix = 'digitalmate.web.v2.';

describe('local backup', () => {
  it('collects only DigitalMate keys', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${prefix}messages.v1`, '[]');
    storage.setItem(`${prefix}settings.v1`, '{"cloudBackend":"local"}');
    storage.setItem('unrelated', 'keep me');

    const backup = collectBackup(storage, new Date('2026-10-29T10:00:00Z'));
    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBe('2026-10-29T10:00:00.000Z');
    expect(Object.keys(backup.data)).toEqual([`${prefix}messages.v1`, `${prefix}settings.v1`]);
    expect(summarizeBackup(backup).keys).toBe(2);
  });

  it('round-trips through JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${prefix}messages.v1`, '[{"id":"1"}]');
    const backup = collectBackup(storage);
    const text = serializeBackup(backup);
    expect(parseBackup(text)).toEqual(backup);
  });

  it('rejects invalid or foreign backups', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/);
    expect(() => parseBackup('[]')).toThrow(/JSON object/);
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1, data: {} }))).toThrow(
      /not a DigitalMate/
    );
    expect(() => parseBackup(JSON.stringify({ app: BACKUP_APP, version: 99, data: {} }))).toThrow(
      /version/
    );
    expect(() =>
      parseBackup(JSON.stringify({ app: BACKUP_APP, version: 1, data: { other: 'x' } }))
    ).toThrow(/no DigitalMate data/);
  });

  it('restores a backup and leaves unrelated storage alone', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${prefix}old.v1`, 'old');
    storage.setItem('unrelated', 'keep me');

    const text = JSON.stringify({
      app: BACKUP_APP,
      version: 1,
      exportedAt: '2026-10-29T10:00:00.000Z',
      data: {
        [`${prefix}messages.v1`]: '[{"id":"restored"}]',
        [`${prefix}settings.v1`]: '{"cloudBackend":"local"}',
        suspicious: 'ignored'
      }
    });

    const summary = restoreBackup(storage, text);
    expect(summary.keys).toBe(2);
    expect(storage.getItem(`${prefix}old.v1`)).toBeNull();
    expect(storage.getItem(`${prefix}messages.v1`)).toBe('[{"id":"restored"}]');
    expect(storage.getItem('unrelated')).toBe('keep me');
    expect(storage.getItem('suspicious')).toBeNull();
  });

  it('formats sizes for the settings notice', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
