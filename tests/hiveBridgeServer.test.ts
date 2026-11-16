import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startHiveBridge } from '../services/hive-bridge/server.mjs';

interface Bridge {
  server: { close: (callback?: () => void) => void };
  state: { tasks: Array<{ id: string; status: string; operationId?: string }> };
  port: number;
}

let bridge: Bridge;
let base = '';

async function get(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${base}${path}`, init);
  return response.json();
}

async function post(path: string, body: unknown, init?: RequestInit): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...init
  });
}

async function waitFor(check: () => Promise<boolean>, timeout = 4000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await check()) return true;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  return false;
}

beforeAll(async () => {
  bridge = (await startHiveBridge({ port: 0, stepDelayMs: 40 })) as Bridge;
  base = `http://127.0.0.1:${bridge.port}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => bridge.server.close(() => resolve()));
});

describe('Hive bridge service', () => {
  it('reports health and negotiates capabilities', async () => {
    const health = await get('/api/hive/health');
    expect(health.ok).toBe(true);
    expect(health.version).toBe(1);

    const capabilities = await get('/api/hive/capabilities');
    expect(capabilities.version).toBe(1);
    expect(capabilities.capabilities).toMatchObject({ steer: true, queue: true, preempt: true });
  });

  it('deduplicates a retried send by operation id', async () => {
    const body = { laneId: 'scout', text: 'Bridge dedupe', operationId: 'op-dedupe' };
    const first = await post('/api/hive/send', body).then(response => response.json());
    const second = await post('/api/hive/send', body).then(response => response.json());
    expect(second.taskId).toBe(first.taskId);

    const snapshot = await get('/api/hive/snapshot');
    expect(snapshot.tasks.filter((task: { operationId?: string }) => task.operationId === 'op-dedupe')).toHaveLength(1);
  });

  it('runs a task to done with an artifact and activity', async () => {
    const created = await post('/api/hive/send', { laneId: 'forge', text: 'Build an artifact' })
      .then(response => response.json());
    expect(created.taskId).toBeTruthy();

    const done = await waitFor(async () => {
      const snapshot = await get('/api/hive/snapshot');
      const task = snapshot.tasks.find((item: { id: string }) => item.id === created.taskId);
      return task?.status === 'done';
    });
    expect(done).toBe(true);

    const snapshot = await get('/api/hive/snapshot');
    const task = snapshot.tasks.find((item: { id: string }) => item.id === created.taskId);
    expect(task.artifacts).toHaveLength(1);
    expect(snapshot.activity.some((entry: { kind: string }) => entry.kind === 'task_status')).toBe(true);
    expect(snapshot.memory.some((entry: { kind: string }) => entry.kind === 'task_summary')).toBe(true);
  });

  it('asks a question and finishes after the answer', async () => {
    const created = await post('/api/hive/send', { laneId: 'ledger', text: 'Draft an email to Dana' })
      .then(response => response.json());

    const asked = await waitFor(async () => {
      const snapshot = await get('/api/hive/snapshot');
      return snapshot.tasks.find((item: { id: string }) => item.id === created.taskId)?.status === 'waiting_user';
    });
    expect(asked).toBe(true);

    const snapshot = await get('/api/hive/snapshot');
    const task = snapshot.tasks.find((item: { id: string }) => item.id === created.taskId);
    const answered = await post('/api/hive/answer', {
      taskId: created.taskId,
      questionId: task.question.id,
      text: 'Keep it as a draft'
    });
    expect(answered.status).toBe(200);

    const finished = await waitFor(async () => {
      const next = await get('/api/hive/snapshot');
      return next.tasks.find((item: { id: string }) => item.id === created.taskId)?.status === 'done';
    });
    expect(finished).toBe(true);
    const after = await get('/api/hive/snapshot');
    expect(after.memory.some((entry: { kind: string }) => entry.kind === 'decision')).toBe(true);
  });

  it('stops a task and refuses stale targets with 410', async () => {
    const created = await post('/api/hive/send', { laneId: 'scout', text: 'Draft an email to Eve' })
      .then(response => response.json());
    await waitFor(async () => {
      const snapshot = await get('/api/hive/snapshot');
      return snapshot.tasks.find((item: { id: string }) => item.id === created.taskId)?.status === 'waiting_user';
    });

    const stopped = await post('/api/hive/stop', { taskId: created.taskId }).then(response => response.json());
    expect(stopped.status).toBe('STOPPED');
    const snapshot = await get('/api/hive/snapshot');
    expect(snapshot.tasks.find((item: { id: string }) => item.id === created.taskId)?.status).toBe('stopped');

    const stale = await post('/api/hive/stop', { taskId: 'missing-task' });
    expect(stale.status).toBe(410);
  });

  it('streams the snapshot as server-sent events', async () => {
    const controller = new AbortController();
    const response = await fetch(`${base}/api/hive/events`, { signal: controller.signal });
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body!.getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    expect(chunk).toContain('"type":"snapshot"');
    expect(chunk).toContain('"lanes"');
    controller.abort();
  });

  it('serves memory cut-off and clears it', async () => {
    const before = await get('/api/hive/snapshot');
    const entry = before.memory.find((item: { laneId: string }) => item.laneId === 'ledger');
    expect(entry).toBeTruthy();

    const cut = await post('/api/hive/memory/cutoff', { laneId: 'ledger', before: entry.at })
      .then(response => response.json());
    expect(cut.snapshot.memoryCutoffAt.ledger).toBe(entry.at);

    const cleared = await post('/api/hive/memory/cutoff', { laneId: 'ledger', before: 0 })
      .then(response => response.json());
    expect(cleared.snapshot.memoryCutoffAt.ledger).toBeUndefined();
  });

  it('requires the bearer token when one is configured', async () => {
    const secured = (await startHiveBridge({ port: 0, token: 'secret', stepDelayMs: 10 })) as Bridge;
    const securedBase = `http://127.0.0.1:${secured.port}`;
    try {
      const unauthorized = await fetch(`${securedBase}/api/hive/snapshot`);
      expect(unauthorized.status).toBe(401);

      const authorized = await fetch(`${securedBase}/api/hive/snapshot`, {
        headers: { authorization: 'Bearer secret' }
      });
      expect(authorized.status).toBe(200);

      const viaQuery = await fetch(`${securedBase}/api/hive/health?access_token=secret`);
      expect(viaQuery.status).toBe(200);
    } finally {
      await new Promise<void>(resolve => secured.server.close(() => resolve()));
    }
  });
});
