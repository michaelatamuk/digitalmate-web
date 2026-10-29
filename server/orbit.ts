import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import WebSocket from 'ws';
import { orbitSessions, readCookie, sessionCookie } from './orbitSession';
import type { OrbitSession } from './orbitSession';

const MAX_BODY_BYTES = 32_000;
const REQUEST_TIMEOUT_MS = 12_000;
const TURN_TIMEOUT_MS = 120_000;

export interface OrbitConfig {
  url: URL;
  token: string;
  bindingId: string;
}

export interface OrbitHealth {
  configured: boolean;
  mode: 'live' | 'unconfigured';
  gatewayHost?: string;
  bindingId?: string;
  roomId?: string;
}

type BridgeEvent =
  | { type: 'thinking'; step: string; steps: string[]; index: number; total: number }
  | { type: 'text'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export function readOrbitConfig(env: NodeJS.ProcessEnv = process.env): OrbitConfig | null {
  const rawUrl = env.ORBIT_GATEWAY_URL?.trim();
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const allowInsecure = env.ORBIT_ALLOW_INSECURE_WS === '1';
  if (url.protocol !== 'wss:' && !(allowInsecure && url.protocol === 'ws:')) return null;

  let token = env.ORBIT_TOKEN?.trim() ?? '';
  if (!token && env.ORBIT_TOKEN_FILE) {
    try {
      token = readFileSync(env.ORBIT_TOKEN_FILE, 'utf8').trim();
    } catch {
      token = '';
    }
  }
  if (!token) return null;

  const bindingId = env.ORBIT_BINDING_ID?.trim() || url.searchParams.get('binding_id') || 'default';
  return { url, token, bindingId };
}

export function orbitHealth(config: OrbitConfig | null): OrbitHealth {
  if (!config) return { configured: false, mode: 'unconfigured' };
  return {
    configured: true,
    mode: 'live',
    gatewayHost: config.url.host,
    bindingId: config.bindingId
  };
}

interface OrbitRequest {
  id: string;
  method: 'orbit.request';
  params: {
    action: string;
    room_id?: string;
    text?: string;
    submission_id?: string;
    agent_id?: string;
  };
}

export function roomHomeRequest(id = 'orbit-home'): OrbitRequest {
  return { id, method: 'orbit.request', params: { action: 'room.home' } };
}

export function roomMessageRequest(
  id: string,
  input: { text: string; roomId?: string; submissionId: string }
): OrbitRequest {
  return {
    id,
    method: 'orbit.request',
    params: {
      action: 'room.message',
      ...(input.roomId ? { room_id: input.roomId } : {}),
      text: input.text,
      submission_id: input.submissionId,
      agent_id: 'orbit'
    }
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Map Orbit events to the small event set understood by the web client. */
export function normalizeOrbitEvent(value: unknown): BridgeEvent[] {
  const event = record(value);
  if (!event || typeof event.event !== 'string') return [];

  if (event.event === 'orbit.task.text') {
    const text = typeof event.text === 'string' ? event.text : '';
    const events: BridgeEvent[] = text ? [{ type: 'text', text }] : [];
    if (event.final === true) events.push({ type: 'done' });
    return events;
  }

  if (event.event === 'orbit.task.error' || event.event === 'orbit.error') {
    const message = typeof event.message === 'string' ? event.message : 'Orbit task failed';
    return [{ type: 'error', message }, { type: 'done' }];
  }

  if (event.event === 'orbit.changed' && event.final === true) {
    return [{ type: 'done' }];
  }

  if (event.final === true) return [{ type: 'done' }];

  return [];
}

function sendEvent(response: ServerResponse, event: BridgeEvent): void {
  if (response.writableEnded) return;
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  const value = record(parsed);
  if (!value) throw new Error('Body must be a JSON object');
  return value;
}

function openSse(response: ServerResponse): void {
  response.statusCode = 200;
  response.setHeader('content-type', 'text/event-stream; charset=utf-8');
  response.setHeader('cache-control', 'no-store, no-transform');
  response.setHeader('connection', 'keep-alive');
  response.setHeader('x-accel-buffering', 'no');
  response.flushHeaders();
}

function streamCachedTurn(response: ServerResponse, text: string): void {
  openSse(response);
  sendEvent(response, {
    type: 'thinking',
    step: 'Reuse cached result',
    steps: ['Reuse cached result'],
    index: 0,
    total: 1
  });
  if (text) sendEvent(response, { type: 'text', text });
  sendEvent(response, { type: 'done' });
  response.end();
}

async function streamTurn(
  config: OrbitConfig,
  input: { text: string; roomId?: string; submissionId: string },
  response: ServerResponse,
  request: IncomingMessage,
  session: OrbitSession,
  cachedText = ''
): Promise<void> {
  openSse(response);

  const upstreamUrl = new URL(config.url.toString());
  if (!upstreamUrl.searchParams.has('binding_id')) {
    upstreamUrl.searchParams.set('binding_id', config.bindingId);
  }

  const socket = new WebSocket(upstreamUrl, {
    headers: {
      authorization: `Bearer ${config.token}`,
      'user-agent': 'DigitalMateWebBridge/0.1'
    },
    handshakeTimeout: REQUEST_TIMEOUT_MS
  });

  const pending = new Map<
    string,
    { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
  >();
  let ended = false;
  let taskId: string | undefined;
  let accumulated = cachedText;
  let resolveClosed: () => void = () => undefined;
  const closed = new Promise<void>(resolve => {
    resolveClosed = resolve;
  });

  const remember = (done: boolean) => {
    orbitSessions.rememberSubmission(session, input.submissionId, {
      text: accumulated,
      done,
      taskId
    });
  };

  const finish = (event: BridgeEvent) => {
    if (ended) return;
    sendEvent(response, event);
    ended = true;
    clearTimeout(turnTimer);
    clearInterval(heartbeat);
    pending.forEach(entry => {
      clearTimeout(entry.timer);
      entry.reject(new Error('Bridge closed'));
    });
    pending.clear();
    socket.close();
    if (!response.writableEnded) response.end();
    resolveClosed();
  };

  const fail = (message: string) => {
    if (ended) return;
    const text = accumulated ? `${accumulated}\n\n${message}` : message;
    orbitSessions.rememberSubmission(session, input.submissionId, { text, done: true, taskId });
    finish({ type: 'error', message });
  };

  const requestUpstream = (payload: OrbitRequest): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(payload.id);
        reject(new Error(`Orbit request timed out: ${payload.params.action}`));
      }, REQUEST_TIMEOUT_MS);
      pending.set(payload.id, { resolve, reject, timer });
      socket.send(JSON.stringify(payload));
    });

  const turnTimer = setTimeout(() => fail('Orbit turn timed out'), TURN_TIMEOUT_MS);
  const heartbeat = setInterval(() => {
    if (!response.writableEnded) response.write(': ping\n\n');
  }, 15_000);

  const cleanup = () => {
    clearTimeout(turnTimer);
    clearInterval(heartbeat);
    pending.forEach(entry => {
      clearTimeout(entry.timer);
      entry.reject(new Error('Bridge closed'));
    });
    pending.clear();
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    resolveClosed();
  };

  request.on('aborted', cleanup);
  response.on('close', cleanup);

  socket.on('message', data => {
    let payload: unknown;
    try {
      payload = JSON.parse(data.toString()) as unknown;
    } catch {
      return;
    }

    const message = record(payload);
    if (!message) return;

    if (typeof message.id === 'string' && pending.has(message.id)) {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.ok === false) {
        const error = record(message.error);
        entry.reject(new Error(typeof error?.message === 'string' ? error.message : 'Orbit request failed'));
      } else {
        entry.resolve(record(message.result) ?? {});
      }
      return;
    }

    for (const event of normalizeOrbitEvent(payload)) {
      if (event.type === 'text') {
        accumulated += event.text;
        remember(false);
        sendEvent(response, event);
      }
      if (event.type === 'error') {
        accumulated = accumulated ? `${accumulated}\n\n${event.message}` : event.message;
        remember(true);
        sendEvent(response, event);
      }
      if (event.type === 'done') {
        remember(true);
        finish({ type: 'done' });
      }
    }

    if (typeof message.task_id === 'string') taskId = message.task_id;
  });

  socket.on('error', error => {
    fail(`Orbit connection failed: ${error.message}`);
  });

  socket.on('close', () => {
    if (!ended) {
      cleanup();
      fail('Orbit connection closed before the task finished');
    }
  });

  try {
    sendEvent(response, {
      type: 'thinking',
      step: 'Connecting to Orbit',
      steps: ['Connect to Orbit', 'Authorise the room', 'Send the request', 'Stream the result'],
      index: 0,
      total: 4
    });

    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    if (ended) return;

    sendEvent(response, {
      type: 'thinking',
      step: 'Authorise the room',
      steps: ['Connect to Orbit', 'Authorise the room', 'Send the request', 'Stream the result'],
      index: 1,
      total: 4
    });

    const home = await requestUpstream(roomHomeRequest());
    if (ended) return;
    const roomId =
      input.roomId ||
      session.roomId ||
      (typeof home.room_id === 'string' ? home.room_id : undefined) ||
      (typeof record(home.snapshot)?.room_id === 'string' ? record(home.snapshot)?.room_id : undefined);
    if (!roomId) throw new Error('Orbit did not return a room id');
    orbitSessions.setRoom(session, roomId);

    sendEvent(response, {
      type: 'thinking',
      step: 'Send the request',
      steps: ['Connect to Orbit', 'Authorise the room', 'Send the request', 'Stream the result'],
      index: 2,
      total: 4
    });

    const accepted = await requestUpstream(
      roomMessageRequest(`orbit-msg-${Date.now().toString(36)}`, {
        text: input.text,
        roomId,
        submissionId: input.submissionId
      })
    );
    if (ended) return;

    taskId = typeof accepted.task_id === 'string' ? accepted.task_id : taskId;
    remember(false);

    sendEvent(response, {
      type: 'thinking',
      step: 'Stream the result',
      steps: ['Connect to Orbit', 'Authorise the room', 'Send the request', 'Stream the result'],
      index: 3,
      total: 4
    });
  } catch (error) {
    if (!ended) fail(error instanceof Error ? error.message : 'Orbit request failed');
  } finally {
    clearInterval(heartbeat);
  }

  await closed;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/orbit/')) return;

  const config = readOrbitConfig();

  if (url.pathname === '/api/orbit/health') {
    const sessionId = readCookie(request.headers.cookie, 'dm_orbit_session');
    const session = sessionId ? orbitSessions.get(sessionId) : undefined;
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.end(JSON.stringify({ ...orbitHealth(config), roomId: session?.roomId }));
    return;
  }

  if (url.pathname === '/api/orbit/reset') {
    if (request.method !== 'POST') {
      response.statusCode = 405;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: 'Use POST' }));
      return;
    }
    const sessionId = readCookie(request.headers.cookie, 'dm_orbit_session');
    if (sessionId) orbitSessions.delete(sessionId);
    const secure =
      String(request.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https' ||
      Boolean((request.socket as { encrypted?: boolean }).encrypted);
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('set-cookie', sessionCookie('', secure, 0));
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname !== '/api/orbit/turn') {
    response.statusCode = 404;
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'Use POST' }));
    return;
  }

  if (!config) {
    response.statusCode = 503;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(
      JSON.stringify({
        error:
          'Orbit is not configured. Set ORBIT_GATEWAY_URL and ORBIT_TOKEN (or ORBIT_TOKEN_FILE) on the bridge.'
      })
    );
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (error) {
    response.statusCode = 400;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid body' }));
    return;
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    response.statusCode = 400;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'text is required' }));
    return;
  }

  const submissionId =
    typeof body.submissionId === 'string' && body.submissionId
      ? body.submissionId
      : `sub-${Date.now().toString(36)}`;
  const sessionId = readCookie(request.headers.cookie, 'dm_orbit_session');
  const session = orbitSessions.getOrCreate(sessionId);
  const secure =
    String(request.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https' ||
    Boolean((request.socket as { encrypted?: boolean }).encrypted);
  response.setHeader('set-cookie', sessionCookie(session.id, secure));

  const cached = orbitSessions.getSubmission(session, submissionId);
  if (cached?.done) {
    streamCachedTurn(response, cached.text);
    return;
  }

  await streamTurn(
    config,
    {
      text: text.slice(0, 8_000),
      roomId: typeof body.roomId === 'string' ? body.roomId : undefined,
      submissionId
    },
    response,
    request,
    session,
    cached?.text ?? ''
  );
}

export function orbitBridgePlugin(): Plugin {
  return {
    name: 'digitalmate-orbit-bridge',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRequest(request, response).then(() => {
          if (!response.writableEnded) next();
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRequest(request, response).then(() => {
          if (!response.writableEnded) next();
        });
      });
    }
  };
}
