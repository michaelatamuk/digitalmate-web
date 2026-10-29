import type { A2uiSurface } from '../types';
import type { ChatTransport, ChatTurnEvent, ChatTurnRequest } from './types';

export interface OrbitHealth {
  configured: boolean;
  mode: 'live' | 'unconfigured';
  gatewayHost?: string;
  bindingId?: string;
  roomId?: string;
  authMode?: 'delegated-token';
  tokenSource?: 'env' | 'file';
}

export async function orbitHealth(signal?: AbortSignal): Promise<OrbitHealth> {
  const response = await fetch('/api/orbit/health', {
    headers: { accept: 'application/json' },
    signal
  });
  if (!response.ok) throw new Error(`Orbit health check failed with HTTP ${response.status}`);
  return (await response.json()) as OrbitHealth;
}

export async function resetOrbitSession(): Promise<void> {
  const response = await fetch('/api/orbit/reset', { method: 'POST' });
  if (!response.ok) throw new Error(`Orbit session reset failed with HTTP ${response.status}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function openStream(request: ChatTurnRequest, signal: AbortSignal): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('/api/orbit/turn', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream'
        },
        body: JSON.stringify(request),
        signal
      });
      if (response.status !== 502 && response.status !== 504) return response;
      lastError = new Error(`Orbit bridge returned HTTP ${response.status}`);
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
    if (attempt < 2) await wait(400 * (attempt + 1), signal);
  }
  throw lastError instanceof Error ? lastError : new Error('Orbit bridge is unreachable');
}

function isSurface(value: unknown): value is A2uiSurface {
  return isRecord(value) && typeof value.root === 'string' && isRecord(value.components);
}

/** Parse one SSE block and return the JSON payload, if any. */
export function parseSseBlock(block: string): unknown | null {
  const data = block
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n');
  if (!data) return null;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return null;
  }
}

/** Convert a bridge payload into a transport event, ignoring unknown shapes. */
export function toTransportEvent(value: unknown): ChatTurnEvent | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  switch (value.type) {
    case 'thinking':
      return {
        type: 'thinking',
        step: typeof value.step === 'string' ? value.step : 'Working',
        steps: Array.isArray(value.steps)
          ? value.steps.filter(item => typeof item === 'string')
          : [typeof value.step === 'string' ? value.step : 'Working'],
        index: typeof value.index === 'number' ? value.index : 0,
        total: typeof value.total === 'number' ? value.total : 1
      };
    case 'text':
      return typeof value.text === 'string' ? { type: 'text', text: value.text } : null;
    case 'surface':
      return isSurface(value.surface) ? { type: 'surface', surface: value.surface } : null;
    case 'followUps':
      return Array.isArray(value.followUps)
        ? { type: 'followUps', followUps: value.followUps.filter(item => typeof item === 'string') }
        : null;
    case 'error':
      return { type: 'error', message: typeof value.message === 'string' ? value.message : 'Orbit error' };
    case 'done':
      return { type: 'done' };
    default:
      return null;
  }
}

/**
 * Browser side of the bridge. The bridge owns the upstream WSS connection and the Bearer
 * token; this class only speaks the local SSE endpoint.
 */
export class OrbitChatTransport implements ChatTransport {
  readonly id = 'orbit' as const;

  async send(
    request: ChatTurnRequest,
    onEvent: (event: ChatTurnEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    const response = await openStream(request, signal);

    if (!response.ok) {
      let message = `Orbit bridge returned HTTP ${response.status}`;
      try {
        const payload = (await response.json()) as unknown;
        if (isRecord(payload) && typeof payload.error === 'string') message = payload.error;
      } catch {
        // Keep the HTTP status message.
      }
      onEvent({ type: 'error', message });
      onEvent({ type: 'done' });
      return;
    }

    if (!response.body) {
      onEvent({ type: 'error', message: 'Orbit bridge returned no stream' });
      onEvent({ type: 'done' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;

    try {
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        let separator = buffer.indexOf('\n\n');
        while (separator !== -1) {
          const block = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          const event = toTransportEvent(parseSseBlock(block));
          if (event) {
            onEvent(event);
            if (event.type === 'done') {
              finished = true;
              break;
            }
          }
          separator = buffer.indexOf('\n\n');
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    if (!finished) onEvent({ type: 'done' });
  }
}
