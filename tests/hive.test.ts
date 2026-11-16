import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockHiveTransport } from '../src/transport/hive';
import {
  currentTask,
  laneActivity,
  laneHasActivityGap,
  laneUnreadCount,
  taskIsOpen
} from '../src/domain/hive';

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

describe('Hive local transport', () => {
  it('starts with Beebou and active Bees', () => {
    const hive = new MockHiveTransport(0);
    const snapshot = hive.snapshot();
    expect(snapshot.lanes.map(lane => lane.id)).toEqual(['beebou', 'scout', 'forge', 'ledger']);
    expect(snapshot.lanes.filter(lane => lane.kind === 'bee').every(lane => lane.lifecycle === 'active')).toBe(true);
  });

  it('runs a task and asks before sending', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'forge', text: 'Draft an email to Alice' });
    const waiting = hive.snapshot().tasks.find(task => task.id === taskId);
    expect(waiting?.status).toBe('waiting_user');
    expect(waiting?.question?.answerable).toBe(true);

    await hive.answer(taskId, waiting!.question!.id, 'Keep it as a draft');
    const done = hive.snapshot().tasks.find(task => task.id === taskId);
    expect(done?.status).toBe('done');
    expect(done?.output).toContain('Nothing was sent');
    expect(done?.artifacts.length).toBeGreaterThan(0);
    expect(currentTask(hive.snapshot().tasks, 'forge')).toBeUndefined();
  });

  it('stops open work and erases artifacts', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'scout', text: 'Build an artifact' });
    const task = hive.snapshot().tasks.find(item => item.id === taskId);
    expect(task?.status).toBe('done');
    expect(task?.artifacts.length).toBeGreaterThan(0);
    const artifactId = task!.artifacts[0].id;
    hive.eraseArtifact(artifactId);
    expect(hive.snapshot().tasks.find(item => item.id === taskId)?.artifacts[0].erasedAt).toBeTruthy();
    expect(taskIsOpen(task!)).toBe(false);
  });

  it('restores completed work after a reload', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    const first = new MockHiveTransport(0);
    const taskId = await first.send({ laneId: 'scout', text: 'Build an artifact' });
    const second = new MockHiveTransport(0);
    expect(second.snapshot().tasks.find(task => task.id === taskId)?.status).toBe('done');
  });

  it('records lane activity and clears the unread cursor on read', async () => {
    const hive = new MockHiveTransport(0);
    await hive.send({ laneId: 'scout', text: 'Build an artifact' });
    const snapshot = hive.snapshot();
    const feed = laneActivity(snapshot, 'scout');
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0].laneId).toBe('scout');
    expect(feed.map(item => item.kind)).toContain('task_created');
    expect(laneUnreadCount(snapshot, 'scout')).toBe(feed.length);
    expect(laneUnreadCount(snapshot, 'forge')).toBe(0);

    hive.markActivityRead('scout');
    expect(laneUnreadCount(hive.snapshot(), 'scout')).toBe(0);
    expect(laneActivity(hive.snapshot(), 'scout').length).toBe(feed.length);
  });

  it('reports a gap once the bounded activity log drops older entries', async () => {
    const hive = new MockHiveTransport(0);
    for (let index = 0; index < 40; index += 1) {
      await hive.send({ laneId: 'ledger', text: `Summarise note ${index}` });
    }
    const snapshot = hive.snapshot();
    expect(snapshot.activityTrimmed).toBe(true);
    expect(snapshot.activity.length).toBe(60);
    expect(laneHasActivityGap(snapshot, 'ledger')).toBe(true);
    expect(laneHasActivityGap(snapshot, 'forge')).toBe(false);
  });

  it('records steering, answers and stops as activity', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'forge', text: 'Draft an email to Alice' });
    const question = hive.snapshot().tasks.find(task => task.id === taskId)!.question!;
    await hive.answer(taskId, question.id, 'Keep it as a draft');
    const kinds = laneActivity(hive.snapshot(), 'forge').map(item => item.kind);
    expect(kinds).toContain('question');
    expect(kinds).toContain('answer');

    const emailTask = await hive.send({ laneId: 'scout', text: 'Draft an email to Bob' });
    expect(hive.snapshot().tasks.find(task => task.id === emailTask)?.status).toBe('waiting_user');
    await hive.stop(emailTask);
    const scoutKinds = laneActivity(hive.snapshot(), 'scout').map(item => item.kind);
    expect(scoutKinds).toContain('stop');
    expect(hive.snapshot().tasks.find(task => task.id === emailTask)?.status).toBe('stopped');
  });
});
