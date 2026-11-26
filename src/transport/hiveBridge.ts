import type { HiveBackup, HiveEvent, HiveSendInput, HiveSnapshot } from '../domain/hive';
import { emptyHiveSnapshot, readHiveSnapshot } from '../domain/hive';
import type { HiveTransport, HiveTransportStatus } from './hive';
import type { HiveConflict, HiveFeature } from './hive';
import type { HiveAttachmentMeta } from '../domain/hive';
import { HIVE_FEATURES, MockHiveTransport, newOperationId } from './hive';
import { readLiveBackend } from '../lib/liveBackend';

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

/** Contract version this client speaks; a bridge may advertise a newer one and be refused. */
export const HIVE_BRIDGE_VERSION = 1;

export type HiveBridgeErrorKind =
  | 'unavailable'
  | 'timeout'
  | 'conflict'
  | 'stale'
  | 'unsupported'
  | 'unauthorized'
  | 'incompatible'
  | 'unknown';

export class HiveTransportError extends Error {
  constructor(
    readonly kind: HiveBridgeErrorKind,
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'HiveTransportError';
  }
}

function classifyStatus(status: number): HiveBridgeErrorKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 409) return 'conflict';
  if (status === 410 || status === 412) return 'stale';
  if (status === 404 || status === 405 || status === 501) return 'unsupported';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

function statusMessage(kind: HiveBridgeErrorKind, status: number): string {
  switch (kind) {
    case 'unauthorized':
      return 'The Hive bridge rejected this session. Check the access token.';
    case 'conflict':
      return 'That task changed on the bridge. Refresh and try again.';
    case 'stale':
      return 'That target is out of date. Refresh and try again.';
    case 'unsupported':
      return 'This Hive bridge does not support that action.';
    case 'unavailable':
      return `The Hive bridge is unavailable (HTTP ${status}).`;
    default:
      return `The Hive bridge rejected the request (HTTP ${status}).`;
  }
}

interface EventSourceLike {
  onopen?: (() => void) | null;
  onmessage: ((event: { data: string; lastEventId?: string }) => void) | null;
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
  private version: number | undefined = undefined;
  private capabilities: Set<HiveFeature> | null = null;
  private negotiated = false;
  /** Last event id received, replayed by the bridge on reconnect as `?since=`. */
  private lastEventId = '';
  private resumeTimer: number | null = null;
  private resumeAttempt = 0;
  /** Last command that failed in a retryable way, kept so Retry reuses its operation id. */
  private failed: { path: string; body: Record<string, unknown> } | null = null;
  /** Last refused command: its task changed under us, so the snapshot was refreshed. */
  private lastConflict: HiveConflict | undefined = undefined;
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

  clearConflict(): void {
    if (!this.lastConflict) return;
    this.lastConflict = undefined;
    this.setStatus({ ...this.statusValue, lastConflict: undefined });
  }

  /**
   * Until a bridge has advertised its capabilities the baseline is assumed, so a bridge that does
   * not implement `/api/hive/capabilities` still works.
   */
  supports(feature: HiveFeature): boolean {
    if (!this.capabilities) return true;
    return this.capabilities.has(feature);
  }

  hasFailedOperation(): boolean {
    return this.failed !== null;
  }

  /** Re-posts the failed command with its original body, so the operation id is unchanged. */
  async retryLastOperation(): Promise<void> {
    const failed = this.failed;
    if (!failed) return;
    this.failed = null;
    try {
      await this.post(failed.path, failed.body);
    } catch (error) {
      this.failed = failed;
      throw error;
    }
  }

  retry(): void {
    if (this.disposed) return;
    this.resumeAttempt = 0;
    this.clearResumeTimer();
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
    const operationId = input.operationId?.trim() || newOperationId();
    const result = await this.post('/api/hive/send', { ...input, operationId });
    const taskId = typeof result.taskId === 'string' ? result.taskId : '';
    if (!taskId) throw new Error('The Hive bridge did not return a task id.');
    return taskId;
  }

  async control(taskId: string, action: 'steer' | 'queue' | 'preempt', text: string): Promise<void> {
    await this.post('/api/hive/control', { taskId, action, text, operationId: newOperationId() });
  }

  async answer(taskId: string, questionId: string, text: string): Promise<void> {
    await this.post('/api/hive/answer', { taskId, questionId, text, operationId: newOperationId() });
  }

  saveAnswerDraft(taskId: string, questionId: string, text: string): void {
    // Drafts stay client-side until sent: typing must not spam the bridge.
    void this.post('/api/hive/answer/draft', { taskId, questionId, text, operationId: newOperationId() })
      .catch(() => {});
  }

  /** Uploads the bytes once; the returned `id` travels with the send instead of the file. */
  async uploadAttachment(file: File): Promise<HiveAttachmentMeta> {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let index = 0; index < buffer.length; index += 0x8000) {
      binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000));
    }
    const data = btoa(binary);
    if (!data) throw new HiveTransportError('unknown', 'Could not read the file.');

    const uploaded = await this.request('/api/hive/attachment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data
      })
    }) as { id?: unknown; name?: unknown; size?: unknown; type?: unknown };

    if (typeof uploaded?.id !== 'string' || !uploaded.id) {
      throw new HiveTransportError('unavailable', 'The Hive bridge did not store the attachment.');
    }
    return {
      id: uploaded.id,
      name: typeof uploaded.name === 'string' ? uploaded.name : file.name,
      size: typeof uploaded.size === 'number' ? uploaded.size : file.size,
      type: typeof uploaded.type === 'string' ? uploaded.type : (file.type || 'application/octet-stream')
    };
  }

  attachmentUrl(attachment: HiveAttachmentMeta): string {
    if (!attachment.id) return '';
    const base = `${this.config.baseUrl.replace(/\/$/, '')}/api/hive/attachment/${encodeURIComponent(attachment.id)}`;
    return this.config.token ? `${base}?access_token=${encodeURIComponent(this.config.token)}` : base;
  }

  async stop(taskId: string): Promise<void> {
    await this.post('/api/hive/stop', { taskId, operationId: newOperationId() });
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
    this.clearResumeTimer();
    this.closeStream();
    this.listeners.clear();
  }

  private applySnapshot(snapshot: HiveSnapshot): void {
    // Selection belongs to the reader, not the server: a snapshot refresh must not yank the lane or
    // task the user is looking at. Falls back to the server's choice when ours no longer exists.
    const keepLane = this.snapshotValue.lanes.some(lane => lane.id === this.snapshotValue.selectedLaneId);
    this.snapshotValue = {
      ...snapshot,
      selectedLaneId: keepLane ? this.snapshotValue.selectedLaneId : snapshot.selectedLaneId,
      selectedTaskId: keepLane ? this.snapshotValue.selectedTaskId : snapshot.selectedTaskId
    };
  }

  private async connect(): Promise<void> {
    this.setStatus({ mode: 'bridge', state: 'connecting', message: this.lastEventId ? 'Resuming the Hive bridge…' : '' });
    try {
      // Re-probe only until the contract has been agreed once; a reconnect keeps the cached caps.
      if (!this.negotiated) await this.negotiate();
      const response = await this.request('/api/hive/snapshot', { method: 'GET' });
      const snapshot = readHiveSnapshot(response);
      if (!snapshot) throw new Error('The Hive bridge returned an unreadable snapshot.');
      this.applySnapshot(snapshot);
      this.resumeAttempt = 0;
      this.setStatus({
        mode: 'bridge',
        state: 'ready',
        message: '',
        version: this.version,
        negotiated: this.negotiated,
        features: this.capabilities ? HIVE_FEATURES.filter(feature => this.capabilities!.has(feature)) : [...HIVE_FEATURES]
      });
      this.emit('snapshot');
      this.openStream();
    } catch (error) {
      this.setStatus({
        mode: 'bridge',
        state: 'unavailable',
        message: error instanceof Error ? error.message : 'The Hive bridge is unavailable.',
        version: this.version
      });
      this.emit('snapshot');
      this.scheduleResume();
    }
  }

  /**
   * Reads the bridge's contract version and feature set. A bridge without the endpoint is treated
   * as v1 with every baseline feature; a bridge that speaks a newer contract is refused rather
   * than guessed at.
   */
  private async negotiate(): Promise<void> {
    try {
      const raw = await this.request('/api/hive/capabilities', { method: 'GET' }) as {
        version?: unknown;
        capabilities?: unknown;
      };
      const version = typeof raw.version === 'number' ? raw.version : HIVE_BRIDGE_VERSION;
      if (version > HIVE_BRIDGE_VERSION) {
        throw new HiveTransportError(
          'incompatible',
          `The Hive bridge speaks v${version}; this app supports v${HIVE_BRIDGE_VERSION}. Update the app or the bridge.`
        );
      }
      const advertised = raw.capabilities && typeof raw.capabilities === 'object'
        ? raw.capabilities as Record<string, unknown>
        : null;
      // Only an explicit `false` disables a feature: unknown keys stay at the baseline.
      this.capabilities = advertised
        ? new Set(HIVE_FEATURES.filter(feature => advertised[feature] !== false))
        : new Set(HIVE_FEATURES);
      this.version = version;
      this.negotiated = true;
    } catch (error) {
      if (error instanceof HiveTransportError && error.kind === 'unsupported') {
        this.capabilities = new Set(HIVE_FEATURES);
        this.version = HIVE_BRIDGE_VERSION;
        this.negotiated = false;
        return;
      }
      throw error;
    }
  }

  private openStream(): void {
    if (this.disposed || this.stream) return;
    const base = `${this.config.baseUrl.replace(/\/$/, '')}/api/hive/events`;
    const url = this.withToken(this.lastEventId
      ? `${base}?since=${encodeURIComponent(this.lastEventId)}`
      : base);
    try {
      const stream = this.eventSourceFactory(url);
      stream.onopen = (): void => {
        this.resumeAttempt = 0;
        if (this.statusValue.state !== 'ready') {
          this.setStatus({
            mode: 'bridge',
            state: 'ready',
            message: '',
            version: this.version,
            negotiated: this.negotiated,
            features: this.capabilities
              ? HIVE_FEATURES.filter(feature => this.capabilities!.has(feature))
              : [...HIVE_FEATURES]
          });
          this.emit('snapshot');
        }
      };
      stream.onmessage = (event: { data: string; lastEventId?: string }): void => {
        if (event.lastEventId) this.lastEventId = event.lastEventId;
        this.applyEvent(event.data);
      };
      stream.onerror = (): void => {
        this.closeStream();
        this.setStatus({
          mode: 'bridge',
          state: 'unavailable',
          message: 'The Hive event stream was lost.',
          version: this.version
        });
        this.emit('snapshot');
        this.scheduleResume();
      };
      this.stream = stream;
    } catch (_error) {
      // The snapshot is still usable; the next retry re-opens the stream.
    }
  }

  /** Reconnects with exponential backoff (1s → 30s) while someone is still listening. */
  private scheduleResume(): void {
    if (this.disposed || this.listeners.size === 0 || this.resumeTimer !== null) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.resumeAttempt);
    this.resumeAttempt += 1;
    this.resumeTimer = setTimeout((): void => {
      this.resumeTimer = null;
      if (this.disposed || this.listeners.size === 0) return;
      void this.connect();
    }, delay) as unknown as number;
  }

  private clearResumeTimer(): void {
    if (this.resumeTimer === null) return;
    clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
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
    this.applySnapshot(snapshot);
    const type = payload.type;
    this.emit(type === 'task' || type === 'message' || type === 'lane' ? type : 'snapshot');
  }

  private async post(path: string, body: unknown): Promise<SnapshotResponse> {
    let response: unknown;
    try {
      response = await this.request(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (error) {
      if (error instanceof HiveTransportError) {
        if (error.kind === 'conflict' || error.kind === 'stale') {
          const target = (body as { taskId?: unknown }).taskId;
          this.lastConflict = {
            kind: error.kind,
            taskId: typeof target === 'string' ? target : undefined,
            at: Date.now()
          };
          this.setStatus({
            mode: 'bridge',
            state: 'ready',
            message: '',
            version: this.version,
            negotiated: this.negotiated,
            features: this.capabilities
              ? HIVE_FEATURES.filter(feature => this.capabilities!.has(feature))
              : [...HIVE_FEATURES],
            lastConflict: this.lastConflict
          });
          this.emit('snapshot');
          // The command was refused because our view is stale, so refresh it: the retry the user
          // sees afterwards must be meaningful.
          void this.refreshSnapshot();
        } else if (error.kind === 'unavailable' || error.kind === 'timeout') {
          this.failed = { path, body: body as Record<string, unknown> };
        }
      }
      throw error;
    }
    const parsed = response as SnapshotResponse;
    this.failed = null;
    this.lastConflict = undefined;
    const snapshot = readHiveSnapshot(parsed.snapshot);
    if (snapshot) {
      this.applySnapshot(snapshot);
      this.emit('snapshot');
    }
    this.setStatus({
      mode: 'bridge',
      state: 'ready',
      message: '',
      version: this.version,
      negotiated: this.negotiated,
      features: this.capabilities
        ? HIVE_FEATURES.filter(feature => this.capabilities!.has(feature))
        : [...HIVE_FEATURES]
    });
    return parsed;
  }

  /** Re-reads the snapshot after a refusal, so the next action targets the current state. */
  private async refreshSnapshot(): Promise<void> {
    try {
      const response = await this.request('/api/hive/snapshot', { method: 'GET' });
      const snapshot = readHiveSnapshot(response);
      if (!snapshot) return;
      this.applySnapshot(snapshot);
      this.emit('snapshot');
    } catch (_error) {
      // Keeping the previous snapshot is better than blanking the UI; the status already explains.
    }
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
        const kind = classifyStatus(response.status);
        throw new HiveTransportError(kind, statusMessage(kind, response.status), response.status);
      }
      return await response.json();
    } catch (error) {
      // Only transient failures mark the whole bridge unavailable; a 409 means the transport is
      // fine and the command is stale.
      if (error instanceof HiveTransportError) {
        if (error.kind === 'unavailable' || error.kind === 'timeout') {
          this.setStatus({
            mode: 'bridge', state: 'unavailable', message: error.message, version: this.version
          });
        }
        throw error;
      }
      const kind: HiveBridgeErrorKind = error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : 'unavailable';
      const message = kind === 'timeout'
        ? 'The Hive bridge did not answer in time.'
        : error instanceof Error ? error.message : 'The Hive bridge is unavailable.';
      this.setStatus({ mode: 'bridge', state: 'unavailable', message, version: this.version });
      throw new HiveTransportError(kind, message);
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
 * Picks the transport at runtime: an explicit URL, then the user's live backend, then the build-time
 * Hive bridge, then the local mock. A configured-but-broken bridge is reported, never silently
 * swapped for fake data.
 */
export function createHiveTransport(env?: { url?: string; token?: string }): HiveTransport {
  const builtIn = (import.meta.env?.VITE_HIVE_BRIDGE_URL as string | undefined) ?? '';
  // `||`, not `??`: an empty stored value must fall through to the build-time URL.
  const url = env?.url ?? (readLiveBackend() || builtIn);
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
