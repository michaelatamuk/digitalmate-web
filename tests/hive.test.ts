import { describe, expect, it } from 'vitest';
import { MockHiveTransport } from '../src/transport/hive';
import { currentTask, taskIsOpen } from '../src/domain/hive';

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
});
