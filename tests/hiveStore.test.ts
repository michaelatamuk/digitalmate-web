import { describe, expect, it } from 'vitest';
import { emptyHiveSnapshot, HIVE_STORE_VERSION, type HiveSnapshot } from '../src/domain/hive';
import {
  createLocalHiveStore,
  HIVE_LEGACY_STORAGE_KEY,
  HIVE_STORAGE_KEY
} from '../src/state/hiveStore';

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

function snapshotWithSelection(selectedLaneId: string, selectedTaskId: string): HiveSnapshot {
  return { ...emptyHiveSnapshot(), selectedLaneId, selectedTaskId };
}

/** A storage that behaves like a browser in private mode: every call fails. */
function brokenStorage(): Storage {
  const fail = (): never => {
    throw new Error('storage unavailable');
  };
  return {
    get length() {
      return 0;
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail
  };
}

describe('Hive store', () => {
  it('round-trips a snapshot through the versioned envelope', () => {
    const storage = memoryStorage();
    const store = createLocalHiveStore(storage);

    store.save(snapshotWithSelection('forge', 'task_one'));

    const raw = JSON.parse(storage.getItem(HIVE_STORAGE_KEY)!);
    expect(raw.kind).toBe('digitalmate.hive.backup');
    expect(raw.version).toBe(HIVE_STORE_VERSION);
    expect(raw.snapshot.selectedLaneId).toBe('forge');

    const loaded = store.load();
    expect(loaded?.selectedLaneId).toBe('forge');
    expect(loaded?.selectedTaskId).toBe('task_one');
  });

  it('migrates a legacy v1 payload and drops it on the next save', () => {
    const storage = memoryStorage();
    // v1 wrote a bare snapshot, without the envelope.
    storage.setItem(HIVE_LEGACY_STORAGE_KEY, JSON.stringify(snapshotWithSelection('ledger', '')));

    const store = createLocalHiveStore(storage);
    expect(store.load()?.selectedLaneId).toBe('ledger');

    store.save({ ...snapshotWithSelection('ledger', ''), activityTrimmed: true });
    expect(storage.getItem(HIVE_LEGACY_STORAGE_KEY)).toBeNull();
    expect(store.load()?.activityTrimmed).toBe(true);
  });

  it('returns null for a corrupt or foreign payload instead of throwing', () => {
    const storage = memoryStorage();
    const store = createLocalHiveStore(storage);

    storage.setItem(HIVE_STORAGE_KEY, '{not json');
    expect(store.load()).toBeNull();

    storage.setItem(HIVE_STORAGE_KEY, JSON.stringify({ kind: 'something-else' }));
    expect(store.load()).toBeNull();

    storage.setItem(HIVE_STORAGE_KEY, JSON.stringify({ lanes: [], tasks: [] }));
    expect(store.load()).toBeNull();
  });

  it('works without usable storage', () => {
    const store = createLocalHiveStore(brokenStorage());

    expect(store.load()).toBeNull();
    expect(() => store.save(emptyHiveSnapshot())).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });

  it('starts empty when nothing was saved', () => {
    expect(createLocalHiveStore(memoryStorage()).load()).toBeNull();
  });

  it('clears both the current and the legacy payload', () => {
    const storage = memoryStorage();
    const store = createLocalHiveStore(storage);
    store.save(emptyHiveSnapshot());
    storage.setItem(HIVE_LEGACY_STORAGE_KEY, JSON.stringify(emptyHiveSnapshot()));

    store.clear();

    expect(storage.getItem(HIVE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(HIVE_LEGACY_STORAGE_KEY)).toBeNull();
    expect(store.load()).toBeNull();
  });
});
