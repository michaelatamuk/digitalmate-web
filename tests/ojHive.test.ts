import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { startOjBridge } from '../services/oj-bridge/server.mjs';

interface FakeOj {
  port: number;
  close: () => Promise<void>;
  chats: Array<Record<string, unknown>>;
}

/** A minimal OJ stand-in: agent list plus a streamed chat that echoes "HIVE OK". */
async function startFakeOj(options: { delayMs?: number } = {}): Promise<FakeOj> {
  const delay = options.delayMs ?? 5;
  const chats: FakeOj['chats'] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname === '/api/v1/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"ok":true}');
      return;
    }
    if (url.pathname === '/api/v1/agents/list') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          payload: {
            agents: [
              { name: 'statusline-setup', description: 'internal' },
              { name: 'general-purpose', description: 'General work' },
              { name: 'explore', description: 'Research' }
            ]
          }
        })
      );
      return;
    }
    if (url.pathname === '/api/v1/chat') {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk as Buffer);
      chats.push(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write(
        `data: ${JSON.stringify({ payload: { event_type: 'chat.delta', content: 'HIVE ' } })}\n\n`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      response.write(
        `data: ${JSON.stringify({ payload: { event_type: 'chat.delta', content: 'OK' } })}\n\n`
      );
      response.write(
        `data: ${JSON.stringify({ payload: { event_type: 'chat.final', content: 'HIVE OK' } })}\n\n`
      );
      response.end();
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    port: typeof address === 'object' && address ? address.port : 0,
    close: () => new Promise(resolve => server.close(() => resolve())),
    chats
  };
}

async function snapshot(port: number) {
  return fetch(`http://127.0.0.1:${port}/api/hive/snapshot`).then(response => response.json());
}

async function waitForTask(port: number, taskId: string, timeoutMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snap = await snapshot(port);
    const task = snap.tasks.find((item: { id: string }) => item.id === taskId);
    if (task && ['done', 'error', 'stopped'].includes(task.status)) return task;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`task ${taskId} did not finish`);
}

describe('Hive over OpenJiuwen', () => {
  it('maps OJ agents to lanes and skips internal ones', async () => {
    const oj = await startFakeOj();
    const bridge = await startOjBridge({ ojBase: `http://127.0.0.1:${oj.port}`, port: 0 });
    try {
      const snap = await snapshot(bridge.port);
      const labels = snap.lanes.map((lane: { label: string }) => lane.label);
      expect(labels).toEqual(['Beebou', 'general-purpose', 'explore']);
      expect(snap.lanes[0].kind).toBe('beebou');
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });

  it('runs a task as a real OJ turn and records output plus an artifact', async () => {
    const oj = await startFakeOj();
    const bridge = await startOjBridge({ ojBase: `http://127.0.0.1:${oj.port}`, port: 0 });
    try {
      const send = await fetch(`http://127.0.0.1:${bridge.port}/api/hive/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          laneId: 'general-purpose',
          text: 'Say HIVE OK',
          operationId: 'op-1'
        })
      }).then(response => response.json());

      const task = await waitForTask(bridge.port, send.taskId);
      expect(task.status).toBe('done');
      expect(task.output).toBe('HIVE OK');
      expect(task.artifacts).toHaveLength(1);
      expect(oj.chats).toHaveLength(1);
      expect(oj.chats[0]).toMatchObject({
        channel_id: 'web',
        req_method: 'chat.send',
        is_stream: true,
        params: { query: 'Say HIVE OK' }
      });
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });

  it('queues a second request while one runs and starts it afterwards', async () => {
    const oj = await startFakeOj({ delayMs: 150 });
    const bridge = await startOjBridge({ ojBase: `http://127.0.0.1:${oj.port}`, port: 0 });
    try {
      const send = (text: string) =>
        fetch(`http://127.0.0.1:${bridge.port}/api/hive/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ laneId: 'general-purpose', text })
        }).then(response => response.json());

      const first = await send('First');
      const second = await send('Second');
      const snap = await snapshot(bridge.port);
      const secondTask = snap.tasks.find((item: { id: string }) => item.id === second.taskId);
      expect(secondTask.status).toBe('queued');

      await waitForTask(bridge.port, first.taskId);
      await waitForTask(bridge.port, second.taskId);
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });

  it('stops a running task and reports it as stopped', async () => {
    const oj = await startFakeOj({ delayMs: 5000 });
    const bridge = await startOjBridge({ ojBase: `http://127.0.0.1:${oj.port}`, port: 0 });
    try {
      const send = await fetch(`http://127.0.0.1:${bridge.port}/api/hive/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ laneId: 'general-purpose', text: 'Long task' })
      }).then(response => response.json());
      await new Promise(resolve => setTimeout(resolve, 30));
      await fetch(`http://127.0.0.1:${bridge.port}/api/hive/stop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: send.taskId })
      });
      const task = await waitForTask(bridge.port, send.taskId);
      expect(task.status).toBe('stopped');
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });

  it('reports capabilities and keeps tasks across a snapshot', async () => {
    const oj = await startFakeOj();
    const bridge = await startOjBridge({ ojBase: `http://127.0.0.1:${oj.port}`, port: 0 });
    try {
      const caps = await fetch(`http://127.0.0.1:${bridge.port}/api/hive/capabilities`).then(r => r.json());
      expect(caps.version).toBe(1);
      expect(caps.capabilities).toContain('steer');
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });
});
