import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createOjBridge, mapOjFrame, parseOjFrames, startOjBridge } from '../services/oj-bridge/server.mjs';

interface FakeOj {
  port: number;
  close: () => Promise<void>;
  requests: Array<{ path: string; body: unknown }>;
}

async function startFakeOj(frames: string[]): Promise<FakeOj> {
  const requests: FakeOj['requests'] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname === '/api/v1/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"ok":true}');
      return;
    }
    if (url.pathname === '/api/v1/chat') {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk as Buffer);
      requests.push({ path: url.pathname, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') });
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      for (const frame of frames) response.write(frame);
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
    requests
  };
}

function frame(eventType: string, payload: Record<string, unknown> = {}): string {
  return `data: ${JSON.stringify({ ok: true, payload: { event_type: eventType, ...payload } })}\n\n`;
}

async function readSse(response: Response): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  return text
    .split('\n\n')
    .map(block => block.split(/\r?\n/).filter(line => line.startsWith('data:')).join('\n'))
    .filter(Boolean)
    .map(line => JSON.parse(line.slice(5).trimStart()));
}

describe('OpenJiuwen bridge', () => {
  it('parses partial SSE buffers without losing frames', () => {
    const first = parseOjFrames(`data: {"a":1}\n\ndata: {"b"`);
    expect(first.frames).toEqual([{ a: 1 }]);
    const second = parseOjFrames(`${first.rest}:2}\n\n`);
    expect(second.frames).toEqual([{ b: 2 }]);
  });

  it('maps deltas, final remainder, tools and errors', () => {
    const state = { emitted: '' };
    expect(mapOjFrame({ payload: { event_type: 'chat.delta', content: 'Hel' } }, state)).toEqual([
      { type: 'text', text: 'Hel' }
    ]);
    expect(mapOjFrame({ payload: { event_type: 'chat.delta', content: 'lo' } }, state)).toEqual([
      { type: 'text', text: 'lo' }
    ]);
    // The final repeats what was already streamed: only the remainder is emitted.
    expect(mapOjFrame({ payload: { event_type: 'chat.final', content: 'Hello world' } }, state)).toEqual([
      { type: 'text', text: ' world' }
    ]);
    expect(mapOjFrame({ payload: { event_type: 'chat.final', content: 'Hello world' } }, state)).toEqual([]);
    expect(mapOjFrame({ payload: { event_type: 'chat.tool_call', name: 'search' } }, state)).toEqual([
      { type: 'thinking', step: 'Using search', steps: ['Using search'], index: 0, total: 1 }
    ]);
    // Reasoning streams token by token; only the first one becomes a step.
    expect(mapOjFrame({ payload: { event_type: 'chat.reasoning', content: 'Let me' } }, state)).toEqual([
      { type: 'thinking', step: 'Let me', steps: ['Let me'], index: 0, total: 1 }
    ]);
    expect(mapOjFrame({ payload: { event_type: 'chat.reasoning', content: ' think' } }, state)).toEqual([]);
    expect(mapOjFrame({ payload: { event_type: 'chat.error', error: 'boom' } }, state)).toEqual([
      { type: 'error', message: 'boom' }
    ]);
    expect(mapOjFrame({ payload: { event_type: 'chat.processing_status' } }, state)).toEqual([]);
  });

  it('streams a real turn, forwards the request and closes with done', async () => {
    const oj = await startFakeOj([
      frame('chat.delta', { content: 'Hello' }),
      frame('chat.final', { content: 'Hello from OJ' })
    ]);
    const bridge = await startOjBridge({ ojBase: `http://127.0.0.1:${oj.port}`, port: 0 });
    try {
      const health = await fetch(`http://127.0.0.1:${bridge.port}/api/orbit/health`).then(r => r.json());
      expect(health).toMatchObject({ configured: true, mode: 'live', backend: 'openjiuwen' });

      const response = await fetch(`http://127.0.0.1:${bridge.port}/api/orbit/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Say hello' })
      });
      expect(response.status).toBe(200);
      const events = await readSse(response);
      expect(events[0].type).toBe('thinking');
      expect(events.filter(event => event.type === 'text').map(event => event.text).join('')).toBe(
        'Hello from OJ'
      );
      expect(events.at(-1)).toEqual({ type: 'done' });

      expect(oj.requests).toHaveLength(1);
      const body = oj.requests[0].body as Record<string, unknown>;
      expect(body).toMatchObject({
        channel_id: 'web',
        req_method: 'chat.send',
        is_stream: true,
        params: { query: 'Say hello' }
      });
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });

  it('reports an unreachable OJ as unavailable instead of pretending', async () => {
    const bridge = await startOjBridge({ ojBase: 'http://127.0.0.1:9', port: 0 });
    try {
      const response = await fetch(`http://127.0.0.1:${bridge.port}/api/orbit/health`);
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.configured).toBe(false);
      expect(body.backend).toBe('openjiuwen');
    } finally {
      await bridge.server.close();
    }
  });

  it('refuses an empty turn and rotates the session on reset', async () => {    const oj = await startFakeOj([frame('chat.final', { content: 'ok' })]);
    const bridge = createOjBridge({ ojBase: `http://127.0.0.1:${oj.port}` });
    await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve));
    try {
      const address = bridge.server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const empty = await fetch(`http://127.0.0.1:${port}/api/orbit/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '   ' })
      });
      expect(empty.status).toBe(400);

      await fetch(`http://127.0.0.1:${port}/api/orbit/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'one' })
      }).then(response => response.text());
      const firstSession = (oj.requests[0].body as { session_id: string }).session_id;

      await fetch(`http://127.0.0.1:${port}/api/orbit/reset`, { method: 'POST' });
      await fetch(`http://127.0.0.1:${port}/api/orbit/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'two' })
      }).then(response => response.text());
      const secondSession = (oj.requests[1].body as { session_id: string }).session_id;
      expect(secondSession).not.toBe(firstSession);
    } finally {
      await new Promise<void>(resolve => bridge.server.close(() => resolve()));
      await oj.close();
    }
  });

  it('only allows configured origins', async () => {
    const oj = await startFakeOj([frame('chat.final', { content: 'ok' })]);
    const bridge = await startOjBridge({
      ojBase: `http://127.0.0.1:${oj.port}`,
      port: 0,
      allowedOrigins: ['https://localhost']
    });
    try {
      const allowed = await fetch(`http://127.0.0.1:${bridge.port}/api/orbit/health`, {
        headers: { origin: 'https://localhost' }
      });
      expect(allowed.headers.get('access-control-allow-origin')).toBe('https://localhost');

      const denied = await fetch(`http://127.0.0.1:${bridge.port}/api/orbit/health`, {
        headers: { origin: 'https://evil.example' }
      });
      expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });

  it('rejects a request body above the configured limit', async () => {
    const oj = await startFakeOj([frame('chat.final', { content: 'ok' })]);
    const bridge = await startOjBridge({
      ojBase: `http://127.0.0.1:${oj.port}`,
      port: 0,
      maxBodyBytes: 64
    });
    try {
      const response = await fetch(`http://127.0.0.1:${bridge.port}/api/orbit/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'x'.repeat(200) })
      });
      expect(response.status).toBe(413);
      expect(oj.requests).toHaveLength(0);
    } finally {
      await bridge.server.close();
      await oj.close();
    }
  });
});
