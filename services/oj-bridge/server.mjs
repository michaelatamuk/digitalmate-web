#!/usr/bin/env node
/**
 * OpenJiuwen bridge for the web client.
 *
 * The browser already knows how to talk to `/api/orbit/*` (health probe + SSE turn). This service
 * keeps that contract and forwards the turn to a running JiuwenSwarm instance
 * (`POST /api/v1/chat`, `is_stream: true`), translating its event frames into the events the app
 * renders.
 *
 * It holds the OJ address (and optional token) server-side, so the app never needs model keys and a
 * single APK can point at any deployment.
 *
 *   OJ_BASE_URL=http://127.0.0.1:8770 node services/oj-bridge/server.mjs
 *   OJ_BASE_URL=... BRIDGE_TOKEN=secret node services/oj-bridge/server.mjs
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export const OJ_BRIDGE_VERSION = 1;
const DEFAULT_OJ_BASE = 'http://127.0.0.1:8770';
const DEFAULT_PORT = 8790;

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS'
};

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json', ...CORS_HEADERS });
  response.end(JSON.stringify(body));
}

function sse(response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    ...CORS_HEADERS
  });
}

function sendEvent(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

/** OJ frames are `data: {json}` blocks separated by blank lines. */
export function parseOjFrames(buffer) {
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';
  const frames = [];
  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    try {
      frames.push(JSON.parse(data));
    } catch {
      // A truncated frame is not fatal: the next block still parses.
    }
  }
  return { frames, rest };
}

/**
 * Maps one OJ event to zero or more app events. `state.emitted` tracks streamed text so the final
 * frame does not repeat what was already shown.
 */
export function mapOjFrame(frame, state) {
  const payload = frame?.payload && typeof frame.payload === 'object' ? frame.payload : frame;
  const eventType = typeof payload?.event_type === 'string' ? payload.event_type : '';
  const content = typeof payload?.content === 'string' ? payload.content : '';
  switch (eventType) {
    case 'chat.delta': {
      if (!content) return [];
      state.emitted += content;
      return [{ type: 'text', text: content }];
    }
    case 'chat.final': {
      if (!content) return [];
      if (state.emitted && content.startsWith(state.emitted)) {
        const remainder = content.slice(state.emitted.length);
        state.emitted = content;
        return remainder ? [{ type: 'text', text: remainder }] : [];
      }
      if (state.emitted === content) return [];
      state.emitted = content;
      return [{ type: 'text', text: content }];
    }
    case 'chat.reasoning': {
      // Reasoning arrives token by token; one "Thinking" step is enough for the UI.
      if (state.reasoned) return [];
      state.reasoned = true;
      const step = content.trim().slice(0, 120) || 'Thinking';
      return [{ type: 'thinking', step, steps: [step], index: 0, total: 1 }];
    }
    case 'chat.tool_call': {
      const name = typeof payload?.name === 'string' ? payload.name : 'tool';
      const step = `Using ${name}`;
      return [{ type: 'thinking', step, steps: [step], index: 0, total: 1 }];
    }
    case 'chat.error': {
      const message =
        typeof payload?.error === 'string' && payload.error
          ? payload.error
          : typeof payload?.message === 'string' && payload.message
            ? payload.message
            : 'The agent reported an error.';
      return [{ type: 'error', message }];
    }
    default:
      return [];
  }
}

class OjSession {
  constructor() {
    this.sessionId = randomUUID();
    this.requestId = '';
  }

  reset() {
    this.sessionId = randomUUID();
    this.requestId = '';
  }
}

export function createOjBridge(options = {}) {
  const ojBase = (options.ojBase ?? process.env.OJ_BASE_URL ?? DEFAULT_OJ_BASE).replace(/\/+$/, '');
  const token = (options.token ?? process.env.BRIDGE_TOKEN ?? '').trim();
  const now = options.now ?? (() => Date.now());
  const session = options.session ?? new OjSession();
  const fetchImpl = options.fetch ?? globalThis.fetch;

  const authorised = request => {
    if (!token) return true;
    const header = request.headers.authorization ?? '';
    return header === `Bearer ${token}`;
  };

  async function probe() {
    const response = await fetchImpl(`${ojBase}/api/v1/health`, {
      headers: { accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`OpenJiuwen health returned HTTP ${response.status}`);
    return response.json().catch(() => ({ ok: true }));
  }

  async function forwardTurn(body, response) {
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      json(response, 400, { error: { code: 'BAD_PARAMS', message: 'text is required' } });
      return;
    }
    const requestId = randomUUID();
    session.requestId = requestId;
    const payload = {
      request_id: requestId,
      channel_id: 'web',
      session_id: session.sessionId,
      req_method: 'chat.send',
      is_stream: true,
      timestamp: now() / 1000,
      params: { query: text }
    };

    let upstream;
    try {
      upstream = await fetchImpl(`${ojBase}/api/v1/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      json(response, 502, {
        error: { code: 'UNAVAILABLE', message: String(error?.message ?? error) }
      });
      return;
    }

    if (!upstream.ok || !upstream.body) {
      json(response, 502, {
        error: { code: 'UPSTREAM', message: `OpenJiuwen returned HTTP ${upstream.status}` }
      });
      return;
    }

    sse(response);
    sendEvent(response, { type: 'thinking', step: 'Asking OpenJiuwen', steps: ['Asking OpenJiuwen'], index: 0, total: 1 });

    const state = { emitted: '', reasoned: false };
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;

    const flush = chunk => {
      buffer += chunk;
      const { frames, rest } = parseOjFrames(buffer);
      buffer = rest;
      for (const frame of frames) {
        if (frame?.ok === false && frame?.payload?.error) {
          sendEvent(response, {
            type: 'error',
            message: String(frame.payload.error)
          });
          finished = true;
          continue;
        }
        for (const event of mapOjFrame(frame, state)) sendEvent(response, event);
      }
    };

    try {
      for await (const part of upstream.body) {
        flush(decoder.decode(part, { stream: true }));
      }
      flush(decoder.decode());
    } catch (error) {
      if (!finished) sendEvent(response, { type: 'error', message: String(error?.message ?? error) });
    }

    sendEvent(response, { type: 'done' });
    response.end();
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }
    if (!authorised(request)) {
      json(response, 401, { error: { code: 'UNAUTHORIZED' } });
      return;
    }

    try {
      if (url.pathname === '/api/orbit/health' && request.method === 'GET') {
        try {
          await probe();
          json(response, 200, {
            configured: true,
            mode: 'live',
            backend: 'openjiuwen',
            gatewayHost: new URL(ojBase).host,
            authMode: token ? 'bridge-token' : 'none',
            version: OJ_BRIDGE_VERSION
          });
        } catch (error) {
          json(response, 503, {
            configured: false,
            mode: 'unconfigured',
            backend: 'openjiuwen',
            message: String(error?.message ?? error)
          });
        }
        return;
      }

      if (url.pathname === '/api/orbit/turn' && request.method === 'POST') {
        const chunks = [];
        for await (const part of request) chunks.push(part);
        let body = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        } catch {
          json(response, 400, { error: { code: 'BAD_JSON' } });
          return;
        }
        await forwardTurn(body, response);
        return;
      }

      if (url.pathname === '/api/orbit/reset' && request.method === 'POST') {
        session.reset();
        json(response, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/oj/agents' && request.method === 'GET') {
        const upstream = await fetchImpl(`${ojBase}/api/v1/agents/list`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}'
        });
        const payload = await upstream.json().catch(() => ({}));
        json(response, upstream.ok ? 200 : 502, payload);
        return;
      }

      json(response, 404, { error: { code: 'NOT_FOUND' } });
    } catch (error) {
      json(response, 500, { error: { code: 'INTERNAL', message: String(error?.message ?? error) } });
    }
  });

  return { server, session, ojBase };
}

export function startOjBridge(options = {}) {
  const { server, session } = createOjBridge(options);
  const port = options.port ?? Number(process.env.OJ_BRIDGE_PORT ?? DEFAULT_PORT);
  return new Promise(resolve => {
    server.listen(port, options.host ?? '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, session, port: typeof address === 'object' && address ? address.port : port });
    });
  });
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('server.mjs');
if (isDirectRun) {
  startOjBridge()
    .then(({ port }) => {
      console.log(`OpenJiuwen bridge listening on http://127.0.0.1:${port}`);
      console.log(`Forwarding to ${process.env.OJ_BASE_URL ?? DEFAULT_OJ_BASE}`);
      console.log('Point the app at it in Settings → Live backend.');
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
