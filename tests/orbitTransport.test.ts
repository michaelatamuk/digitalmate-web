import { describe, expect, it, vi } from 'vitest';
import {
  bridgeConfigWarnings,
  isSameOrigin,
  normalizeOrbitEvent,
  orbitHealth,
  readAllowedOrigins,
  readOrbitConfig,
  roomHomeRequest,
  roomMessageRequest
} from '../server/orbit';
import { MockChatTransport } from '../src/transport/mock';
import { OrbitChatTransport, parseSseBlock, toTransportEvent } from '../src/transport/orbit';
import type { ChatTurnEvent } from '../src/transport/types';
import { OrbitSessionStore, readCookie, sessionCookie } from '../server/orbitSession';

describe('Orbit bridge config', () => {
  it('is unconfigured without a gateway URL or token', () => {
    expect(readOrbitConfig({})).toBeNull();
    expect(readOrbitConfig({ ORBIT_GATEWAY_URL: 'wss://gateway.example.com/orbit/ws' })).toBeNull();
    expect(
      readOrbitConfig({
        ORBIT_GATEWAY_URL: 'wss://gateway.example.com/orbit/ws',
        ORBIT_TOKEN: 'secret'
      })
    ).toMatchObject({ bindingId: 'default', tokenSource: 'env' });
  });

  it('rejects plain ws unless explicitly allowed', () => {
    expect(
      readOrbitConfig({
        ORBIT_GATEWAY_URL: 'ws://gateway.example.com/orbit/ws',
        ORBIT_TOKEN: 'secret'
      })
    ).toBeNull();
    expect(
      readOrbitConfig({
        ORBIT_GATEWAY_URL: 'ws://gateway.example.com/orbit/ws',
        ORBIT_TOKEN: 'secret',
        ORBIT_ALLOW_INSECURE_WS: '1'
      })
    ).not.toBeNull();
  });

  it('reports health without leaking the token', () => {
    const config = readOrbitConfig({
      ORBIT_GATEWAY_URL: 'wss://gateway.example.com/orbit/ws?binding_id=demo',
      ORBIT_TOKEN: 'secret'
    });
    const health = orbitHealth(config);
    expect(health).toEqual({
      configured: true,
      mode: 'live',
      gatewayHost: 'gateway.example.com',
      bindingId: 'demo',
      authMode: 'delegated-token',
      tokenSource: 'env'
    });
    expect(JSON.stringify(health)).not.toContain('secret');
    expect(orbitHealth(null)).toEqual({ configured: false, mode: 'unconfigured' });
  });

  it('builds room.home and room.message envelopes', () => {
    expect(roomHomeRequest()).toEqual({
      id: 'orbit-home',
      method: 'orbit.request',
      params: { action: 'room.home' }
    });
    const message = roomMessageRequest('orbit-1', {
      text: 'Find a train',
      roomId: 'room-1',
      submissionId: 'sub-1'
    });
    expect(message.params).toMatchObject({
      action: 'room.message',
      room_id: 'room-1',
      text: 'Find a train',
      submission_id: 'sub-1',
      agent_id: 'orbit'
    });
  });

  it('rejects cross-origin bridge requests but allows same-origin or no origin', () => {
    const request = (headers: Record<string, string>) => ({ headers }) as never;
    expect(isSameOrigin(request({ origin: 'https://app.example.com', host: 'app.example.com' }))).toBe(
      true
    );
    expect(isSameOrigin(request({ origin: 'https://evil.example.com', host: 'app.example.com' }))).toBe(
      false
    );
    expect(isSameOrigin(request({ host: 'app.example.com' }))).toBe(true);
    expect(isSameOrigin(request({ origin: 'not a url' }))).toBe(false);
  });

  it('accepts explicit allowlisted and native origins only', () => {
    const request = (headers: Record<string, string>) => ({ headers }) as never;
    const allowed = ['https://localhost', 'https://app.example.com'];
    expect(
      isSameOrigin(
        request({ origin: 'https://localhost', host: 'bridge.example.com' }),
        allowed
      )
    ).toBe(true);
    expect(
      isSameOrigin(
        request({ origin: 'https://app.example.com', host: 'bridge.example.com' }),
        allowed
      )
    ).toBe(true);
    expect(
      isSameOrigin(
        request({ origin: 'https://evil.example.com', host: 'bridge.example.com' }),
        allowed
      )
    ).toBe(false);
    expect(isSameOrigin(request({ origin: 'null', host: 'bridge.example.com' }), [])).toBe(false);
    expect(
      isSameOrigin(
        request({
          origin: 'http://app.example.com',
          host: 'app.example.com',
          'x-forwarded-proto': 'https'
        }),
        []
      )
    ).toBe(false);
  });

  it('warns about weak production bridge settings without exposing secrets', () => {
    const config = readOrbitConfig({
      ORBIT_GATEWAY_URL: 'wss://gateway.example.com/orbit/ws?token=leaked',
      ORBIT_TOKEN: 'tiny-secret-value'
    });
    expect(config).not.toBeNull();
    const warnings = bridgeConfigWarnings(config, { NODE_ENV: 'production' });
    expect(warnings.join(' ')).toMatch(/shorter than 24/);
    expect(warnings.join(' ')).toMatch(/query parameter/);
    expect(warnings.join(' ')).toMatch(/ORBIT_ALLOWED_ORIGINS/);
    expect(warnings.join(' ')).not.toContain('tiny-secret-value');
    expect(warnings.join(' ')).not.toContain('leaked');
    expect(bridgeConfigWarnings(null, { NODE_ENV: 'production' })).toEqual([
      'Orbit is unconfigured; the app will stay in local mode.'
    ]);
    expect(readAllowedOrigins({ ORBIT_ALLOWED_ORIGINS: ' https://a.test , https://b.test ' })).toEqual([
      'https://a.test',
      'https://b.test'
    ]);
  });
});

describe('Orbit event normalization', () => {
  it('maps streamed text and the final event', () => {
    expect(normalizeOrbitEvent({ event: 'orbit.task.text', text: 'Hello', final: false })).toEqual([
      { type: 'text', text: 'Hello' }
    ]);
    expect(normalizeOrbitEvent({ event: 'orbit.task.text', text: '', final: true })).toEqual([
      { type: 'done' }
    ]);
  });

  it('maps task errors and ignores unknown events', () => {
    expect(normalizeOrbitEvent({ event: 'orbit.task.error', message: 'boom' })).toEqual([
      { type: 'error', message: 'boom' },
      { type: 'done' }
    ]);
    expect(normalizeOrbitEvent({ event: 'orbit.changed' })).toEqual([]);
    expect(normalizeOrbitEvent({ nope: true })).toEqual([]);
  });
});

describe('SSE and transport events', () => {
  it('parses data blocks and validates event shapes', () => {
    const payload = parseSseBlock('event: text\ndata: {"type":"text","text":"hi"}');
    expect(payload).toEqual({ type: 'text', text: 'hi' });
    expect(toTransportEvent(payload)).toEqual({ type: 'text', text: 'hi' });
    expect(toTransportEvent({ type: 'unknown' })).toBeNull();
    expect(toTransportEvent({ type: 'surface', surface: { id: 'x' } })).toBeNull();
  });

  it('reads an SSE response until done', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"thinking","step":"Connect","steps":["Connect","Send"],"index":0,"total":2}\n\n',
      'data: {"type":"text","text":"Hello"}\n\n',
      'data: {"type":"done"}\n\n'
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
            controller.close();
          }
        });
        return new Response(stream, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' }
        });
      })
    );

    const events: ChatTurnEvent[] = [];
    await new OrbitChatTransport().send(
      { text: 'Hi', lang: 'en', submissionId: 'sub-1' },
      event => events.push(event),
      new AbortController().signal
    );

    expect(events.map(event => event.type)).toEqual(['thinking', 'text', 'done']);
    expect(events[1]).toEqual({ type: 'text', text: 'Hello' });
    vi.unstubAllGlobals();
  });
});

describe('Orbit bridge sessions', () => {
  it('parses and writes the session cookie without exposing extras', () => {
    expect(readCookie('a=1; dm_orbit_session=abc; b=2', 'dm_orbit_session')).toBe('abc');
    expect(readCookie('a=1', 'dm_orbit_session')).toBeUndefined();
    expect(sessionCookie('abc', false)).toBe(
      'dm_orbit_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800'
    );
    expect(sessionCookie('abc', true)).toContain('Secure');
    expect(sessionCookie('abc', false)).not.toContain('Secure');
  });

  it('keeps room and submission state per session', () => {
    let now = 1_000;
    const store = new OrbitSessionStore(1_000, () => now);
    const session = store.getOrCreate('s1');
    store.setRoom(session, 'room_1');
    store.rememberSubmission(session, 'sub_1', { text: 'Hello', taskId: 'task_1' });

    expect(store.get('s1')?.roomId).toBe('room_1');
    expect(store.getSubmission(session, 'sub_1')).toMatchObject({
      text: 'Hello',
      taskId: 'task_1',
      done: false
    });

    store.rememberSubmission(session, 'sub_1', { done: true });
    expect(store.getSubmission(session, 'sub_1')).toMatchObject({ done: true, text: 'Hello' });

    store.setSnapshot(session, { rooms: [{ id: 'room_1' }] });
    expect(store.getSnapshot(session)).toEqual({ rooms: [{ id: 'room_1' }] });

    store.delete('s1');
    expect(store.get('s1')).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('prunes sessions after the TTL', () => {
    let now = 1_000;
    const store = new OrbitSessionStore(500, () => now);
    store.getOrCreate('old');
    now = 1_600;
    store.prune();
    expect(store.get('old')).toBeUndefined();
    expect(store.size()).toBe(0);
  });
});

describe('mock transport', () => {
  it('emits thinking, text, surface and done in order', async () => {
    const transport = new MockChatTransport([], 0);
    const events: ChatTurnEvent[] = [];
    await transport.send(
      { text: 'Find trains from Beijing to Shanghai tomorrow evening', lang: 'en', submissionId: 'sub-1' },
      event => events.push(event),
      new AbortController().signal
    );

    expect(events[0].type).toBe('thinking');
    expect(events.some(event => event.type === 'surface')).toBe(true);
    expect(events.some(event => event.type === 'followUps')).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'done' });
    const text = events
      .filter((event): event is Extract<ChatTurnEvent, { type: 'text' }> => event.type === 'text')
      .map(event => event.text)
      .join('');
    expect(text).toContain('Beijing');
  });

  it('stops emitting when the signal is aborted', async () => {
    const transport = new MockChatTransport([], 0);
    const controller = new AbortController();
    controller.abort();
    const events: ChatTurnEvent[] = [];
    await transport.send(
      { text: 'Hello', lang: 'en', submissionId: 'sub-1' },
      event => events.push(event),
      controller.signal
    );
    expect(events).toEqual([]);
  });
});
