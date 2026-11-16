import { describe, expect, it } from 'vitest';
import { MockHiveTransport } from '../src/transport/hive';
import { installHiveNotifications } from '../src/lib/hiveNotifications';

describe('Hive notifications', () => {
  it('notifies once when a Bee finishes while the sheet is closed', async () => {
    const hive = new MockHiveTransport(0);
    const notices: Array<{ title: string; body: string }> = [];
    const opened: string[] = [];
    const stop = installHiveNotifications({
      transport: hive,
      isSheetOpen: () => false,
      onOpen: (taskId: string) => opened.push(taskId),
      notify: input => {
        notices.push({ title: input.title, body: input.body });
        input.onOpen();
      }
    });

    const taskId = await hive.send({ laneId: 'forge', text: 'Build an artifact' });
    expect(notices.length).toBe(1);
    expect(notices[0].title).toBe('Forge finished');
    expect(notices[0].body).toContain('Build an artifact');
    expect(opened).toEqual([taskId]);

    // Re-emitting the same state must not notify twice.
    hive.selectLane('forge');
    expect(notices.length).toBe(1);
    stop();
  });

  it('stays quiet while the sheet is open and never replays old work', async () => {
    const hive = new MockHiveTransport(0);
    const whileOpen: string[] = [];
    const stopOpen = installHiveNotifications({
      transport: hive,
      isSheetOpen: () => true,
      onOpen: () => {},
      notify: input => whileOpen.push(input.title)
    });
    await hive.send({ laneId: 'scout', text: 'Build an artifact' });
    expect(whileOpen.length).toBe(0);
    stopOpen();

    // Installing over finished work primes the state instead of replaying it.
    const replay: string[] = [];
    const stopReplay = installHiveNotifications({
      transport: hive,
      isSheetOpen: () => false,
      onOpen: () => {},
      notify: input => replay.push(input.title)
    });
    expect(replay.length).toBe(0);
    stopReplay();
  });

  it('asks for attention when a Bee has a question', async () => {
    const hive = new MockHiveTransport(0);
    const notices: string[] = [];
    const stop = installHiveNotifications({
      transport: hive,
      isSheetOpen: () => false,
      onOpen: () => {},
      notify: input => notices.push(input.title)
    });
    await hive.send({ laneId: 'forge', text: 'Draft an email to Alice' });
    expect(notices).toContain('Forge needs you');
    stop();
  });
});
