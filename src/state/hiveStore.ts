import type { HiveSnapshot } from '../domain/hive';
import { HIVE_STORE_VERSION, readHiveBackup } from '../domain/hive';

export const HIVE_STORAGE_KEY = 'digitalmate.hive.v2';
/** v1 stored a bare snapshot; it is migrated on read and dropped on the next write. */
export const HIVE_LEGACY_STORAGE_KEY = 'digitalmate.hive.v1';

export interface HiveStore {
  load: () => HiveSnapshot | null;
  save: (snapshot: HiveSnapshot) => void;
  clear: () => void;
}

/**
 * Versioned, quota-safe persistence for the local Hive demo. The transport owns state; this module
 * owns how that state reaches disk, so migration and backups have one home.
 */
export function createLocalHiveStore(storage?: Storage): HiveStore {
  const target = (): Storage | null => {
    if (storage) return storage;
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  };

  return {
    load(): HiveSnapshot | null {
      const store = target();
      if (!store) return null;
      try {
        const raw = store.getItem(HIVE_STORAGE_KEY) ?? store.getItem(HIVE_LEGACY_STORAGE_KEY);
        if (!raw) return null;
        return readHiveBackup(JSON.parse(raw))?.snapshot ?? null;
      } catch {
        return null;
      }
    },

    save(snapshot: HiveSnapshot): void {
      const store = target();
      if (!store) return;
      try {
        store.setItem(HIVE_STORAGE_KEY, JSON.stringify({
          kind: 'digitalmate.hive.backup',
          version: HIVE_STORE_VERSION,
          savedAt: Date.now(),
          snapshot
        }));
        // The migrated payload replaces the legacy one; leaving it would resurrect stale state.
        store.removeItem(HIVE_LEGACY_STORAGE_KEY);
      } catch {
        // The local demo still works when storage is unavailable or full.
      }
    },

    clear(): void {
      const store = target();
      if (!store) return;
      try {
        store.removeItem(HIVE_STORAGE_KEY);
        store.removeItem(HIVE_LEGACY_STORAGE_KEY);
      } catch {
        // Nothing to do.
      }
    }
  };
}
