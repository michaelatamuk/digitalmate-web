import { describe, expect, it, vi } from 'vitest';
import { BridgeHiveTransport, createHiveTransport } from '../src/transport/hiveBridge';
import { MockHiveTransport } from '../src/transport/hive';
import fixture from './fixtures/hive-bridge-snapshot.json';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

interface FakeStream {
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: () => void;
}

function fakeStream(): FakeStream & { closed: () => boolean } {
  let closed = false;
  return {
    onmessage: null,
    onerror: null,
    close: () => {
      closed = true;
    },
    closed: () => closed
  };
}

function bridge(fetchImpl: ReturnType<typeof vi.fn>, stream?: FakeStream): BridgeHiveTransport {
  return new BridgeHiveTransport(
    { baseUrl: 'https://bridge.test' },
    {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      eventSourceFactory: () => stream ?? fakeStream(),
      timeoutMs: 500
    }
  );
}

describe('Hive bridge transport', () => {
  it('loads the snapshot, reports ready and opens the event stream', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(fixture));
    const stream = fakeStream();
    const transport = bridge(fetchImpl, stream);
    expect(transport.status().state).toBe('connecting');

    const events: string[] = [];
    transport.subscribe(event => events.push(event.type));

    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));
    expect(transport.snapshot().tasks.map(task => task.id)).toEqual(['task_bridge_1']);
    expect(transport.snapshot().selectedLaneId).toBe('scout');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://bridge.test/api/hive/snapshot',
      expect.objectContaining({ method: 'GET' })
    );

    // A pushed event updates the snapshot without a command round trip.
    stream.onmessage?.({ data: JSON.stringify({ type: 'task', snapshot: { ...fixture, selectedTaskId: '' } }) });
    expect(transport.snapshot().selectedTaskId).toBe('');
    expect(events.length).toBeGreaterThan(1);
    transport.dispose();
    expect(stream.closed()).toBe(true);
  });

  it('sends commands with the documented payload and applies the returned snapshot', async () => {
    const fetchImpl = vi.fn(async (_input: unknown, init?: { body?: string }) => {
      if (init?.body) {
        const body = JSON.parse(init.body);
        if (body.text === 'Hello bridge') {
          return jsonResponse({ taskId: 'task_new', snapshot: { ...fixture, selectedTaskId: 'task_new' } });
        }
      }
      return jsonResponse(fixture);
    });
    const transport = bridge(fetchImpl);
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));

    const taskId = await transport.send({ laneId: 'scout', text: 'Hello bridge' });
    expect(taskId).toBe('task_new');
    expect(transport.snapshot().selectedTaskId).toBe('task_new');

    const sendCall = fetchImpl.mock.calls.find(call => String(call[0]).endsWith('/api/hive/send'));
    expect(sendCall).toBeTruthy();
    expect(JSON.parse((sendCall![1] as { body: string }).body)).toEqual({ laneId: 'scout', text: 'Hello bridge' });
    transport.dispose();
  });

  it('reports an unreachable bridge instead of pretending to be ready', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const transport = bridge(fetchImpl);
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('unavailable'));
    expect(transport.status().message).toContain('network down');

    await expect(transport.send({ laneId: 'scout', text: 'anything' })).rejects.toThrow('network down');
    expect(transport.status().state).toBe('unavailable');
    transport.dispose();
  });

  it('refuses local import while a bridge owns the state', () => {
    const transport = bridge(vi.fn(async () => jsonResponse(fixture)));
    const result = transport.importBackup('{}');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('import is disabled');
    transport.dispose();
  });

  it('picks the mock without a bridge url and the bridge with one', () => {
    const mock = createHiveTransport({ url: '' });
    expect(mock).toBeInstanceOf(MockHiveTransport);
    mock.dispose();

    const remote = createHiveTransport({ url: 'https://bridge.test' });
    expect(remote.id).toBe('bridge');
    remote.dispose();
  });

  it('negotiates capabilities and hides what the bridge does not implement', async () => {
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) {
        return jsonResponse({ version: 1, capabilities: { steer: false, queue: false } });
      }
      return jsonResponse(fixture);
    });
    const transport = bridge(fetchImpl);
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));

    expect(transport.status().version).toBe(1);
    expect(transport.status().negotiated).toBe(true);
    expect(transport.status().features).toEqual(['preempt', 'artifacts', 'memoryCutoff']);
    expect(transport.supports('steer')).toBe(false);
    expect(transport.supports('queue')).toBe(false);
    expect(transport.supports('preempt')).toBe(true);
    transport.dispose();
  });

  it('assumes the v1 baseline when the bridge has no capability probe', async () => {
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) return jsonResponse({}, 404);
      return jsonResponse(fixture);
    });
    const transport = bridge(fetchImpl);
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));

    expect(transport.status().negotiated).toBe(false);
    expect(transport.supports('steer')).toBe(true);
    expect(transport.status().features).toEqual(['steer', 'queue', 'preempt', 'artifacts', 'memoryCutoff']);
    transport.dispose();
  });

  it('refuses a bridge that speaks a newer contract instead of guessing', async () => {
    let streamOpened = false;
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) return jsonResponse({ version: 2, capabilities: {} });
      return jsonResponse(fixture);
    });
    const transport = new BridgeHiveTransport(
      { baseUrl: 'https://bridge.test' },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        eventSourceFactory: () => {
          streamOpened = true;
          return fakeStream();
        },
        timeoutMs: 500
      }
    );
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('unavailable'));
    expect(transport.status().message).toContain('v2');
    expect(transport.status().message).toContain('v1');
    expect(streamOpened).toBe(false);
    transport.dispose();
  });

  it('reconnects with the last event id so missed events are replayed', async () => {
    const urls: string[] = [];
    const streams: FakeStream[] = [];
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) return jsonResponse({ version: 1 });
      return jsonResponse(fixture);
    });
    const transport = new BridgeHiveTransport(
      { baseUrl: 'https://bridge.test' },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        eventSourceFactory: (url: string) => {
          urls.push(url);
          const stream = fakeStream();
          streams.push(stream);
          return stream;
        },
        timeoutMs: 500
      }
    );
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));
    expect(urls[0]).toBe('https://bridge.test/api/hive/events');

    streams[0].onmessage?.({
      data: JSON.stringify({ type: 'task', snapshot: { ...fixture, selectedTaskId: 'task_later' } }),
      lastEventId: '42'
    });
    expect(transport.snapshot().selectedTaskId).toBe('task_later');

    transport.retry();
    await vi.waitFor(() => expect(urls.length).toBe(2));
    expect(urls[1]).toContain('since=42');
    transport.dispose();
  });

  it('resumes by itself after the event stream drops', async () => {
    const urls: string[] = [];
    const streams: FakeStream[] = [];
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) return jsonResponse({ version: 1 });
      return jsonResponse(fixture);
    });
    const transport = new BridgeHiveTransport(
      { baseUrl: 'https://bridge.test' },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        eventSourceFactory: (url: string) => {
          urls.push(url);
          const stream = fakeStream();
          streams.push(stream);
          return stream;
        },
        timeoutMs: 500
      }
    );
    transport.subscribe(() => {});
    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));

    streams[0].onerror?.();
    expect(transport.status().state).toBe('unavailable');
    expect(transport.status().message).toContain('event stream was lost');

    // Backoff starts at one second; the reconnect happens without user input.
    await vi.waitFor(() => expect(urls.length).toBe(2), { timeout: 4_000 });
    await vi.waitFor(() => expect(transport.status().state).toBe('ready'));
    transport.dispose();
  });

  it('maps bridge failures onto typed errors and readable messages', async () => {    const conflictFetch = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) return jsonResponse({ version: 1 });
      if (url.endsWith('/api/hive/snapshot')) return jsonResponse(fixture);
      return jsonResponse({}, 409);
    });
    const conflict = bridge(conflictFetch);
    conflict.subscribe(() => {});
    await vi.waitFor(() => expect(conflict.status().state).toBe('ready'));
    await expect(conflict.send({ laneId: 'scout', text: 'x' })).rejects.toMatchObject({ kind: 'conflict' });
    expect(conflict.status().message).toContain('changed on the bridge');
    conflict.dispose();

    const unsupportedFetch = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/api/hive/capabilities')) return jsonResponse({ version: 1 });
      if (url.endsWith('/api/hive/snapshot')) return jsonResponse(fixture);
      return jsonResponse({}, 501);
    });
    const unsupported = bridge(unsupportedFetch);
    unsupported.subscribe(() => {});
    await vi.waitFor(() => expect(unsupported.status().state).toBe('ready'));
    await expect(unsupported.stop('task_bridge_1')).rejects.toMatchObject({ kind: 'unsupported' });
    unsupported.dispose();

    const timeoutFetch = vi.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    });
    const timeout = bridge(timeoutFetch);
    timeout.subscribe(() => {});
    await vi.waitFor(() => expect(timeout.status().state).toBe('unavailable'));
    expect(timeout.status().message).toContain('did not answer in time');
    timeout.dispose();
  });
});
