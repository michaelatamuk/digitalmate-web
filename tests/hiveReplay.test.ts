import { describe, expect, it } from 'vitest';
import type { HiveEvent } from '../src/domain/hive';
import { recordHiveEvents, replayHiveEvents } from '../src/state/hiveReplay';
import { createLocalHiveStore } from '../src/state/hiveStore';
import { MockHiveTransport } from '../src/transport/hive';

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

function offlineHive(): MockHiveTransport {
  return new MockHiveTransport(0, createLocalHiveStore(memoryStorage()));
}

describe('Hive event replay', () => {
  it('records a mock run and replays it into a listener unchanged', async () => {
    const hive = offlineHive();
    const recorder = recordHiveEvents(hive);

    const taskId = await hive.send({ laneId: 'scout', text: 'Summarise the notes' });
    const recorded = recorder.stop();

    expect(recorded.length).toBeGreaterThan(1);
    expect(recorded.some(event => event.type === 'task')).toBe(true);
    expect(recorded.at(-1)!.snapshot.tasks.find(task => task.id === taskId)?.status).toBe('done');

    const replayed: HiveEvent[] = [];
    await replayHiveEvents(recorded, event => replayed.push(event));

    expect(replayed).toHaveLength(recorded.length);
    expect(replayed.map(event => event.type)).toEqual(recorded.map(event => event.type));
    expect(replayed.at(-1)!.snapshot).toEqual(recorded.at(-1)!.snapshot);
    // Replay ends where the live transport is.
    expect(replayed.at(-1)!.snapshot).toEqual(hive.snapshot());
    hive.dispose();
  });

  it('stops recording when asked, so later work is not in the recording', async () => {
    const hive = offlineHive();
    const recorder = recordHiveEvents(hive);

    await hive.send({ laneId: 'scout', text: 'First request' });
    const recorded = recorder.stop();
    const lengthAtStop = recorded.length;

    await hive.send({ laneId: 'scout', text: 'Second request' });

    expect(recorded).toHaveLength(lengthAtStop);
    expect(hive.snapshot().tasks.length).toBeGreaterThan(recorded.at(-1)!.snapshot.tasks.length);
    hive.dispose();
  });

  it('can step through a recording with an interval', async () => {
    const hive = offlineHive();
    const recorder = recordHiveEvents(hive);
    await hive.send({ laneId: 'ledger', text: 'Check the numbers' });
    const recorded = recorder.stop();
    hive.dispose();

    let finished = false;
    const playback = replayHiveEvents(recorded, () => undefined, { intervalMs: 1 }).then(() => {
      finished = true;
    });
    // A positive interval yields between events instead of replaying everything in one tick.
    expect(finished).toBe(false);
    await playback;
    expect(finished).toBe(true);
  });
});
