import type { HiveBackup, HiveEvent, HiveSendInput, HiveSnapshot } from '../domain/hive';
import { emptyHiveSnapshot, readHiveSnapshot } from '../domain/hive';
import type { HiveTransport, HiveTransportStatus } from './hive';
import { MockHiveTransport } from './hive';

/**
 * Contract between the web app and the Hive bridge.
 *
 *   GET  /api/hive/snapshot            -> HiveSnapshot
 *   GET  /api/hive/events              -> text/event-stream, `data: {"type":..,"snapshot":..}`
 *   POST /api/hive/send                -> { taskId, snapshot }
 *   POST /api/hive/control             -> { snapshot }
 *   POST /api/hive/answer              -> { snapshot }
 *   POST /api/hive/stop                -> { snapshot }
 *   POST /api/hive/artifact/erase      -> { snapshot }
 *   POST /api/hive/memory/cutoff       -> { snapshot }
 *   POST /api/hive/reset               -> { snapshot }
 *
 * Every response carries a full snapshot so the client never has to guess at state after a
 * command; the event stream is for changes it did not ask for.
 */

export interface HiveBridgeConfig {
  baseUrl: string;
  token?: string;
}

interface EventSourceLike {
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: () => void;
}

export interface HiveBridgeDeps {
  fetchImpl?: typeof fetch;
  eventSourceFactory?: (url: string) => EventSourceLike;
  timeoutMs?: number;
}

type SnapshotResponse = { snapshot?: unknown; taskId?: unknown };

export class BridgeHiveTransport implements HiveTransport {
  readonly id = 'bridge' as const;
  private snapshotValue: HiveSnapshot = emptyHiveSnapshot();
  private statusValue: HiveTransportStatus = {
    mode: 'bridge',
    state: 'connecting',
    message: ''
  };
  private listeners = new Set<(event: HiveEvent) => void>();
  private stream: EventSourceLike | null = null;
  private started = false;
  private disposed = false;
  private readonly fetchImpl: typeof fetch;
  private readonly eventSourceFactory: (url: string) => EventSourceLike;
  private readonly timeoutMs: number;

  constructor(private readonly config: HiveBridgeConfig, deps: HiveBridgeDeps = {}) {
    this.fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
    this.eventSourceFactory = deps.eventSourceFactory ??
      ((url: string) => new EventSource(url) as unknown as EventSourceLike);
    this.timeoutMs = deps.timeoutMs ?? 12_000;
  }

  subscribe(listener: (event: HiveEvent) => void): () => void {
    this.listeners.add(listener);
    listener({ type: 'snapshot', snapshot: this.snapshot() });
    if (!this.started) {
      this.started = true;
      void this.connect();
    }
    return () => this.listeners.delete(listener);
  }

  snapshot(): HiveSnapshot {
    return this.snapshotValue;
  }

  status(): HiveTransportStatus {
    return this.statusValue;
  }

  retry(): void {
    if (this.disposed) return;
    this.closeStream();
    void this.connect();
  }

  selectLane(laneId: string): void {
    if (this.snapshotValue.lanes.some(lane => lane.id === laneId)) {
      this.snapshotValue = { ...this.snapshotValue, selectedLaneId: laneId, selectedTaskId: '' };
      this.emit('lane');
    }
  }

  selectTask(taskId: string): void {
    const task = this.snapshotValue.tasks.find(item => item.id === taskId);
    if (!task) return;
    this.snapshotValue = { ...this.snapshotValue, selectedLaneId: task.laneId, selectedTaskId: taskId };
    this.emit('task');
  }

  async send(input: HiveSendInput): Promise<string> {
    const result = await this.post('/api/hive/send', input);
    const taskId = typeof result.taskId === 'string' ? result.taskId : '';
    if (!taskId) throw new Error('The Hive bridge did not return a task id.');
    return taskId;
  }

  async control(taskId: string, action: 'steer' | 'queue' | 'preempt', text: string): Promise<void> {
    await this.post('/api/hive/control', { taskId, action, text });
  }

  async answer(taskId: string, questionId: string, text: string): Promise<void> {
    await this.post('/api/hive/answer', { taskId, questionId, text });
  }

  async stop(taskId: string): Promise<void> {
    await this.post('/api/hive/stop', { taskId });
  }

  eraseArtifact(artifactId: string): void {
    void this.post('/api/hive/artifact/erase', { artifactId }).catch(() => {});
  }

  markActivityRead(laneId: string): void {
    const latest = this.snapshotValue.activity
      .reduce((max, item) => (item.laneId === laneId ? Math.max(max, item.at) : max), 0);
    if (latest === 0) return;
    this.snapshotValue = {
      ...this.snapshotValue,
      activityReadAt: { ...this.snapshotValue.activityReadAt, [laneId]: latest }
    };
    this.emit('lane');
  }

  cutOffMemory(laneId: string, before: number): void {
    void this.post('/api/hive/memory/cutoff', { laneId, before })
      .then(() => this.emit('lane'))
      .catch(() => {});
  }

  restoreMemory(laneId: string): void {
    void this.post('/api/hive/memory/cutoff', { laneId, before: 0 })
      .then(() => this.emit('lane'))
      .catch(() => {});
  }

  exportBackup(): HiveBackup {
    return {
      kind: 'digitalmate.hive.backup',
      version: 3,
      savedAt: Date.now(),
      snapshot: this.snapshotValue
    };
  }

  importBackup(): { ok: boolean; error?: string } {
    return { ok: false, error: 'A bridge session owns its state; import is disabled while connected.' };
  }

  reset(): void {
    void this.post('/api/hive/reset', {}).catch(() => {});
  }

  dispose(): void {
    this.disposed = true;
    this.closeStream();
    this.listeners.clear();
  }

  private async connect(): Promise<void> {
    this.setStatus({ mode: 'bridge', state: 'connecting', message: '' });
    try {
      const response = await this.request('/api/hive/snapshot', { method: 'GET' });
      const snapshot = readHiveSnapshot(response);
      if (!snapshot) throw new Error('The Hive bridge returned an unreadable snapshot.');
      this.snapshotValue = snapshot;
      this.setStatus({ mode: 'bridge', state: 'ready', message: '' });
      this.emit('snapshot');
      this.openStream();
    } catch (error) {
      this.setStatus({
        mode: 'bridge',
        state: 'unavailable',
        message: error instanceof Error ? error.message : 'The Hive bridge is unavailable.'
      });
      this.emit('snapshot');
    }
  }

  private openStream(): void {
    if (this.disposed || this.stream) return;
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/hive/events`;
    try {
      const stream = this.eventSourceFactory(this.withToken(url));
      stream.onmessage = (event: { data: string }): void => this.applyEvent(event.data);
      stream.onerror = (): void => {
        this.setStatus({ mode: 'bridge', state: 'unavailable', message: 'The Hive event stream was lost.' });
        this.emit('snapshot');
      };
      this.stream = stream;
    } catch (_error) {
      // The snapshot is still usable; the next retry re-opens the stream.
    }
  }

  private applyEvent(data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    const payload = parsed as { type?: unknown; snapshot?: unknown };
    const snapshot = readHiveSnapshot(payload.snapshot);
    if (!snapshot) return;
    this.snapshotValue = snapshot;
    const type = payload.type;
    this.emit(type === 'task' || type === 'message' || type === 'lane' ? type : 'snapshot');
  }

  private async post(path: string, body: unknown): Promise<SnapshotResponse> {
    const response = await this.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const parsed = response as SnapshotResponse;
    const snapshot = readHiveSnapshot(parsed.snapshot);
    if (snapshot) {
      this.snapshotValue = snapshot;
      this.emit('snapshot');
    }
    if (this.statusValue.state !== 'ready') {
      this.setStatus({ mode: 'bridge', state: 'ready', message: '' });
    }
    return parsed;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}),
          ...(init.headers ?? {})
        }
      });
      if (!response.ok) {
        throw new Error(`The Hive bridge answered ${response.status}.`);
      }
      return await response.json();
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'The Hive bridge did not answer in time.'
        : error instanceof Error ? error.message : 'The Hive bridge is unavailable.';
      this.setStatus({ mode: 'bridge', state: 'unavailable', message });
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  private withToken(url: string): string {
    if (!this.config.token) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}access_token=${encodeURIComponent(this.config.token)}`;
  }

  private closeStream(): void {
    if (!this.stream) return;
    try {
      this.stream.close();
    } catch (_error) {
      // Closing a dead stream is not an error worth surfacing.
    }
    this.stream = null;
  }

  private setStatus(status: HiveTransportStatus): void {
    this.statusValue = status;
  }

  private emit(type: HiveEvent['type']): void {
    const event: HiveEvent = { type, snapshot: this.snapshotValue };
    for (const listener of this.listeners) listener(event);
  }
}

/**
 * Picks the transport at runtime. Without `VITE_HIVE_BRIDGE_URL` the local mock is used, so the
 * app stays fully usable offline; a configured-but-broken bridge is reported, never silently
 * swapped for fake data.
 */
export function createHiveTransport(env?: { url?: string; token?: string }): HiveTransport {
  const url = env?.url ?? (import.meta.env?.VITE_HIVE_BRIDGE_URL as string | undefined) ?? '';
  if (!url.trim()) return new MockHiveTransport();
  const token = env?.token ?? (import.meta.env?.VITE_HIVE_BRIDGE_TOKEN as string | undefined) ?? '';
  return new BridgeHiveTransport({ baseUrl: url.trim(), token: token.trim() || undefined });
}

// The sheet mounts once per session; keeping the instance here means StrictMode's double effect
// does not hand the second mount a disposed transport, and a bridge keeps its stream open.
let sharedTransport: HiveTransport | null = null;

export function currentHiveTransport(): HiveTransport {
  if (!sharedTransport) sharedTransport = createHiveTransport();
  return sharedTransport;
}

export function resetSharedHiveTransport(): void {
  sharedTransport?.dispose();
  sharedTransport = null;
}
