import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockHiveTransport } from '../src/transport/hive';
import {
  currentTask,
  laneActivity,
  laneCutoff,
  laneHasActivityGap,
  laneLastActivity,
  laneMemory,
  laneUnreadCount,
  memoryInUse,
  relativeTime,
  taskIsOpen,
  taskRef
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

  it('migrates a legacy v1 snapshot and drops the old key', async () => {
    const storage = memoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    const first = new MockHiveTransport(0);
    const taskId = await first.send({ laneId: 'scout', text: 'Build an artifact' });

    // Simulate an install that only ever wrote the v1 bare snapshot.
    storage.setItem('digitalmate.hive.v1', JSON.stringify(first.snapshot()));
    storage.removeItem('digitalmate.hive.v2');

    const migrated = new MockHiveTransport(0);
    expect(migrated.snapshot().tasks.find(task => task.id === taskId)?.status).toBe('done');

    await migrated.send({ laneId: 'forge', text: 'Draft a note' });
    expect(storage.getItem('digitalmate.hive.v2')).toBeTruthy();
    expect(storage.getItem('digitalmate.hive.v1')).toBeNull();
  });

  it('round-trips an export through import and rejects foreign files', async () => {
    const source = new MockHiveTransport(0);
    const taskId = await source.send({ laneId: 'ledger', text: 'Write a weekly report' });
    const backup = JSON.stringify(source.exportBackup());

    const target = new MockHiveTransport(0);
    expect(target.importBackup(backup).ok).toBe(true);
    const imported = target.snapshot();
    expect(imported.tasks.map(task => task.id)).toEqual(source.snapshot().tasks.map(task => task.id));
    expect(imported.tasks.find(task => task.id === taskId)?.report?.title).toBe('Weekly signal report');
    // The report card keeps its sources and the mail preview across a backup round trip.
    const report = imported.tasks.find(task => task.id === taskId)?.report;
    expect(report?.evidence).toHaveLength(3);
    expect(report?.evidence?.[0].source).toContain('·');
    expect(report?.mail?.from).toContain('Scout');
    expect(imported.activity.length).toBe(source.snapshot().activity.length);

    expect(target.importBackup('{"hello":"world"}').ok).toBe(false);
    expect(target.importBackup('not json').ok).toBe(false);
  });

  it('exposes a stable task ref, lane last activity and relative stamps', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'scout', text: 'Build an artifact' });
    const snapshot = hive.snapshot();
    const task = snapshot.tasks.find(item => item.id === taskId)!;
    expect(taskRef(task)).toMatch(/^T-[A-Z0-9]{4}$/);
    expect(taskRef(task)).toBe(taskRef(task));

    const at = laneLastActivity(snapshot.lanes, snapshot.tasks, 'scout');
    expect(at).toBeGreaterThan(0);
    expect(laneLastActivity(snapshot.lanes, snapshot.tasks, 'forge')).toBeGreaterThan(0);
    const translate = (english: string): string => english;
    expect(relativeTime(at, at + 30_000, translate)).toBe('just now');
    expect(relativeTime(at, at + 90_000, translate)).toBe('1m ago');
    expect(relativeTime(at, at + 3 * 3_600_000, translate)).toBe('3h ago');
    expect(relativeTime(0, at, translate)).toBe('');
  });

  it('remembers finished work and decisions, and reuses them until cut off', async () => {
    const hive = new MockHiveTransport(0);
    expect(laneMemory(hive.snapshot(), 'scout').length).toBe(1);

    const taskId = await hive.send({ laneId: 'scout', text: 'Build an artifact' });
    const afterRun = hive.snapshot();
    expect(laneMemory(afterRun, 'scout').length).toBe(2);
    expect(afterRun.tasks.find(task => task.id === taskId)?.output).toContain('reused 1 memory entry');

    const emailTask = await hive.send({ laneId: 'scout', text: 'Draft an email to Bob' });
    const waiting = hive.snapshot().tasks.find(task => task.id === emailTask)!;
    await hive.answer(emailTask, waiting.question!.id, 'Keep it as a draft');
    expect(laneMemory(hive.snapshot(), 'scout').some(entry => entry.kind === 'decision')).toBe(true);

    const entries = laneMemory(hive.snapshot(), 'scout');
    expect(memoryInUse(hive.snapshot(), 'scout').length).toBe(entries.length);

    // Cutting at an entry hides it and everything older.
    hive.cutOffMemory('scout', entries[0].at);
    expect(laneCutoff(hive.snapshot(), 'scout')).toBe(entries[0].at);
    expect(memoryInUse(hive.snapshot(), 'scout').length).toBe(0);

    hive.restoreMemory('scout');
    expect(laneCutoff(hive.snapshot(), 'scout')).toBe(0);
    expect(memoryInUse(hive.snapshot(), 'scout').length).toBe(entries.length);
  });

  it('loads a v2 backup that predates memory fields', async () => {    const source = new MockHiveTransport(0);
    await source.send({ laneId: 'scout', text: 'Build an artifact' });
    const legacy = source.snapshot() as Record<string, unknown>;
    delete legacy.memory;
    delete legacy.memoryCutoffAt;

    const target = new MockHiveTransport(0);
    const result = target.importBackup(JSON.stringify({
      kind: 'digitalmate.hive.backup',
      version: 2,
      savedAt: Date.now(),
      snapshot: legacy
    }));
    expect(result.ok).toBe(true);
    expect(target.snapshot().memory).toEqual([]);
    expect(target.snapshot().memoryCutoffAt).toEqual({});
    expect(target.snapshot().tasks.length).toBeGreaterThan(0);
  });

  it('deduplicates a retried send by operation id', async () => {    const hive = new MockHiveTransport(0);
    const first = await hive.send({ laneId: 'scout', text: 'Same command', operationId: 'op-1' });
    const retried = await hive.send({ laneId: 'scout', text: 'Same command', operationId: 'op-1' });
    expect(retried).toBe(first);
    expect(hive.snapshot().tasks.filter(task => task.operationId === 'op-1').length).toBe(1);

    const other = await hive.send({ laneId: 'scout', text: 'Same command', operationId: 'op-2' });
    expect(other).not.toBe(first);
    expect(hive.snapshot().tasks.filter(task => task.operationId === 'op-1').length).toBe(1);
  });

  it('gives every task a run identity and a version that advances with state', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'scout', text: 'Build an artifact' });
    const done = hive.snapshot().tasks.find(task => task.id === taskId)!;
    expect(done.runId).toMatch(/^run_/);
    expect(done.version).toBeGreaterThanOrEqual(3);

    const emailTask = await hive.send({ laneId: 'forge', text: 'Draft an email to Alice' });
    const waiting = hive.snapshot().tasks.find(task => task.id === emailTask)!;
    const waitingVersion = waiting.version!;
    await hive.stop(emailTask);
    const stopped = hive.snapshot().tasks.find(task => task.id === emailTask)!;
    expect(stopped.version).toBeGreaterThan(waitingVersion);
  });

  it('reaches the failure state through the documented !fail trigger', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'ledger', text: '!fail Build the weekly numbers' });
    const failed = hive.snapshot().tasks.find(task => task.id === taskId)!;
    expect(failed.status).toBe('error');
    expect(failed.step).toBe('Failed');
    expect(failed.output).toContain('could not finish');
    expect(laneActivity(hive.snapshot(), 'ledger').some(entry => entry.text.startsWith('Failed ·'))).toBe(true);
    // A failure frees the lane for the next task.
    expect(currentTask(hive.snapshot().tasks, 'ledger')).toBeUndefined();
  });

  it('keeps an answer draft with its question until the question is answered', async () => {    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({ laneId: 'scout', text: 'Draft an email to Bob' });
    const question = hive.snapshot().tasks.find(task => task.id === taskId)!.question!;

    hive.saveAnswerDraft(taskId, question.id, 'Keep it as a draft');
    expect(hive.snapshot().tasks.find(task => task.id === taskId)?.question?.draft).toBe('Keep it as a draft');

    await hive.answer(taskId, question.id, 'Keep it as a draft');
    expect(hive.snapshot().tasks.find(task => task.id === taskId)?.question?.draft).toBeUndefined();
    expect(hive.snapshot().tasks.find(task => task.id === taskId)?.question?.answer).toBe('Keep it as a draft');
  });

  it('keeps at most five attachment names on a task', async () => {
    const hive = new MockHiveTransport(0);
    const taskId = await hive.send({
      laneId: 'scout',
      text: 'Check these files',
      attachments: Array.from({ length: 6 }, (_, index) => ({
        name: `f${index}.txt`,
        size: 12,
        type: 'text/plain'
      }))
    });
    expect(hive.snapshot().tasks.find(task => task.id === taskId)?.attachments.map(item => item.name)).toEqual([
      'f0.txt', 'f1.txt', 'f2.txt', 'f3.txt', 'f4.txt'
    ]);
  });
});
