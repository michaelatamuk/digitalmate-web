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
});
