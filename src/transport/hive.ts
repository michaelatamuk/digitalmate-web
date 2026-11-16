import type {
  HiveActivity,
  HiveActivityKind,
  HiveArtifact,
  HiveAttachmentMeta,
  HiveBackup,
  HiveEvent,
  HiveLane,
  HiveMemoryEntry,
  HiveMemoryKind,
  HiveMessage,
  HiveQuestion,
  HiveSendInput,
  HiveSnapshot,
  HiveTask
} from '../domain/hive';
import { currentTask, HIVE_STORE_VERSION, readHiveBackup, taskIsOpen } from '../domain/hive';
import type { HiveStore } from '../state/hiveStore';
import { createLocalHiveStore } from '../state/hiveStore';

export type HiveTransportMode = 'mock' | 'bridge';
export type HiveTransportState = 'ready' | 'connecting' | 'unavailable';

/** Features a bridge may or may not implement; the UI hides what it cannot do. */
export type HiveFeature = 'steer' | 'queue' | 'preempt' | 'artifacts' | 'memoryCutoff';

export const HIVE_FEATURES: HiveFeature[] = ['steer', 'queue', 'preempt', 'artifacts', 'memoryCutoff'];

export interface HiveConflict {
  kind: 'conflict' | 'stale';
  /** Task the refused command targeted, when the command named one. */
  taskId?: string;
  at: number;
}

export interface HiveTransportStatus {
  mode: HiveTransportMode;
  state: HiveTransportState;
  /** Human-readable reason, empty when ready. */
  message: string;
  /** Contract version negotiated with a bridge; undefined for the mock. */
  version?: number;
  /** Features the bridge advertised (empty means "all baseline features"). */
  features?: HiveFeature[];
  /** True when the bridge answered the capability probe; false when the v1 baseline was assumed. */
  negotiated?: boolean;
  /** Last refused command, kept so the UI can explain that its view was refreshed. */
  lastConflict?: HiveConflict;
}

export interface HiveTransport {
  readonly id: 'mock' | 'bridge';
  subscribe: (listener: (event: HiveEvent) => void) => () => void;
  snapshot: () => HiveSnapshot;
  status: () => HiveTransportStatus;
  supports: (feature: HiveFeature) => boolean;
  /** True when the last bridge command failed in a way that is worth retrying. */
  hasFailedOperation: () => boolean;
  /** Re-sends the failed command with the same operation id, so the bridge can dedupe it. */
  retryLastOperation: () => Promise<void>;
  /** Drops the "your view was refreshed" notice after a conflict. */
  clearConflict: () => void;
  retry: () => void;
  selectLane: (laneId: string) => void;
  selectTask: (taskId: string) => void;
  send: (input: HiveSendInput) => Promise<string>;
  control: (taskId: string, action: 'steer' | 'queue' | 'preempt', text: string) => Promise<void>;
  answer: (taskId: string, questionId: string, text: string) => Promise<void>;
  /** Keeps the unsent answer with its question; no network call is implied. */
  saveAnswerDraft: (taskId: string, questionId: string, text: string) => void;
  /** Stores attachment bytes when the transport can; the mock keeps them locally. */
  uploadAttachment?: (file: File) => Promise<HiveAttachmentMeta>;
  /** A URL usable in an <img>/<a> for a stored attachment, or '' when unavailable. */
  attachmentUrl?: (attachment: HiveAttachmentMeta) => string;
  stop: (taskId: string) => Promise<void>;
  eraseArtifact: (artifactId: string) => void;
  markActivityRead: (laneId: string) => void;
  cutOffMemory: (laneId: string, before: number) => void;
  restoreMemory: (laneId: string) => void;
  exportBackup: () => HiveBackup;
  importBackup: (raw: string) => { ok: boolean; error?: string };
  reset: () => void;
  dispose: () => void;
}

const LANES: HiveLane[] = [
  {
    id: 'beebou',
    kind: 'beebou',
    label: 'Beebou',
    avatar: '✦',
    color: '#a06b58',
    lifecycle: 'active',
    lastActivityAt: 0,
    capabilities: { steer: false, queue: false, preempt: false },
    description: 'The host. Routes work to the right Bee.'
  },
  {
    id: 'scout',
    kind: 'bee',
    label: 'Scout',
    avatar: '⌕',
    color: '#5b7fa8',
    lifecycle: 'active',
    lastActivityAt: 0,
    capabilities: { steer: true, queue: true, preempt: true },
    description: 'Research, sources and summaries.'
  },
  {
    id: 'forge',
    kind: 'bee',
    label: 'Forge',
    avatar: '◈',
    color: '#6b6fa8',
    lifecycle: 'active',
    lastActivityAt: 0,
    capabilities: { steer: true, queue: true, preempt: true },
    description: 'Builds artifacts, drafts and structured output.'
  },
  {
    id: 'ledger',
    kind: 'bee',
    label: 'Ledger',
    avatar: '▤',
    color: '#5d7f73',
    lifecycle: 'active',
    lastActivityAt: 0,
    capabilities: { steer: true, queue: true, preempt: true },
    description: 'Reports, mail and numbers.'
  }
];

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Stable command id: `crypto.randomUUID` when available, otherwise a local fallback. */
export function newOperationId(): string {
  const random = globalThis.crypto as Crypto | undefined;
  if (random && typeof random.randomUUID === 'function') return random.randomUUID();
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Bounded so the local store cannot grow without limit; dropping entries is reported as a gap. */
const MAX_ACTIVITY = 60;

/** Local Hive demo. It mirrors the event and control shape of a real Hive bridge. */
export class MockHiveTransport implements HiveTransport {
  readonly id = 'mock' as const;
  private lanes: HiveLane[];
  private tasks: HiveTask[] = [];
  private messages: HiveMessage[] = [];
  private activity: HiveActivity[] = [];
  private activityReadAt: Record<string, number> = {};
  private activityTrimmed = false;
  private memory: HiveMemoryEntry[] = [];
  private memoryCutoffAt: Record<string, number> = {};
  /** Attachment bytes for this session, keyed by the id handed back to the task. */
  private files = new Map<string, string>();
  private selectedLaneId = 'beebou';
  private selectedTaskId = '';
  private listeners = new Set<(event: HiveEvent) => void>();
  private timers = new Set<number>();
  private disposed = false;

  constructor(
    private readonly timingScale = 1,
    private readonly store: HiveStore = createLocalHiveStore()
  ) {
    this.lanes = clone(LANES).map(lane => ({
      ...lane,
      lastActivityAt: Date.now() - Math.floor(Math.random() * 8_000)
    }));
    const restored = this.restore();
    if (restored) {
      this.applySnapshot(restored);
    } else {
      this.messages.push({
        id: id('msg'),
        laneId: 'beebou',
        role: 'beebou',
        text: 'I am Beebou. I keep the Hive in order and hand work to the right Bee.',
        createdAt: Date.now() - 60_000
      });
      this.seed();
    }
  }

  /** Applies a validated snapshot from storage or an imported backup. */
  private applySnapshot(snapshot: HiveSnapshot): void {
    this.lanes = snapshot.lanes.length > 0 ? snapshot.lanes : this.lanes;
    this.tasks = snapshot.tasks;
    this.messages = snapshot.messages;
    this.activity = snapshot.activity;
    this.activityReadAt = snapshot.activityReadAt;
    this.activityTrimmed = snapshot.activityTrimmed;
    this.memory = snapshot.memory;
    this.memoryCutoffAt = snapshot.memoryCutoffAt;
    this.selectedLaneId = this.lanes.some(lane => lane.id === snapshot.selectedLaneId)
      ? snapshot.selectedLaneId
      : 'beebou';
    this.selectedTaskId = snapshot.selectedTaskId;
    this.normalizeRestored();
  }

  subscribe(listener: (event: HiveEvent) => void): () => void {
    this.listeners.add(listener);
    listener({ type: 'snapshot', snapshot: this.snapshot() });
    return () => this.listeners.delete(listener);
  }

  status(): HiveTransportStatus {
    return { mode: 'mock', state: 'ready', message: '', version: undefined, features: [...HIVE_FEATURES] };
  }

  supports(_feature: HiveFeature): boolean {
    return true;
  }

  hasFailedOperation(): boolean {
    return false;
  }

  async retryLastOperation(): Promise<void> {
    // The local demo has no transport to retry.
  }

  clearConflict(): void {
    // The mock cannot conflict with itself.
  }

  retry(): void {
    // The local demo has nothing to reconnect to.
  }

  snapshot(): HiveSnapshot {
    return {
      lanes: clone(this.lanes),
      tasks: clone(this.tasks),
      messages: clone(this.messages),
      activity: clone(this.activity),
      activityReadAt: { ...this.activityReadAt },
      activityTrimmed: this.activityTrimmed,
      memory: clone(this.memory),
      memoryCutoffAt: { ...this.memoryCutoffAt },
      selectedLaneId: this.selectedLaneId,
      selectedTaskId: this.selectedTaskId
    };
  }

  selectLane(laneId: string): void {
    if (!this.lanes.some(lane => lane.id === laneId)) return;
    this.selectedLaneId = laneId;
    this.selectedTaskId = '';
    this.markActivityRead(laneId);
    this.emit('lane');
  }

  /** Moves the lane's read cursor to now, so the unread badge clears. */
  markActivityRead(laneId: string): void {
    const latest = this.activity.reduce((max, item) => (item.laneId === laneId ? Math.max(max, item.at) : max), 0);
    if (latest === 0 || (this.activityReadAt[laneId] ?? 0) >= latest) return;
    this.activityReadAt = { ...this.activityReadAt, [laneId]: latest };
    this.emit('lane');
  }

  selectTask(taskId: string): void {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return;
    this.selectedLaneId = task.laneId;
    this.selectedTaskId = taskId;
    this.emit('task');
  }

  async send(input: HiveSendInput): Promise<string> {
    const lane = this.lanes.find(item => item.id === input.laneId);
    const text = input.text.trim();
    if (!lane || !text) throw new Error('A Bee and a request are required.');
    const operationId = input.operationId?.trim() || newOperationId();
    // A retried command must not create a second task for the same Bee.
    const existing = this.tasks.find(task => task.laneId === lane.id && task.operationId === operationId);
    if (existing) return existing.id;
    const busy = Boolean(currentTask(this.tasks, lane.id));
    // The demo keeps attachment names on the task; real bytes would be uploaded by a bridge.
    const kept = (input.attachments ?? []).slice(0, 5);
    const task = this.createTask(lane.id, text, busy, kept, operationId);
    this.touchLane(lane.id);
    this.messages.push({
      id: id('msg'),
      laneId: lane.id,
      role: 'user',
      text,
      createdAt: Date.now()
    });
    this.emit('task');
    this.pump(lane.id);
    return task.id;
  }

  async control(taskId: string, action: 'steer' | 'queue' | 'preempt', text: string): Promise<void> {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return;
    const prompt = text.trim();
    if (!prompt) throw new Error('Write something first.');
    if (action === 'steer') {
      if (task.status !== 'running') throw new Error('Only a running Bee can take a steer.');
      task.steering.push(prompt);
      task.step = 'Applying your steer';
      task.updatedAt = Date.now();
      this.record('steer', task.laneId, task.id, `Steer · ${prompt}`);
      this.messages.push({
        id: id('msg'),
        laneId: task.laneId,
        role: 'user',
        text: `Steer: ${prompt}`,
        createdAt: Date.now()
      });
      this.emit('task');
      this.schedule(() => this.finish(task.id), 900);
      return;
    }
    if (action === 'queue') {
      if (!currentTask(this.tasks, task.laneId)) {
        await this.send({ laneId: task.laneId, text: prompt });
        return;
      }
      this.createTask(task.laneId, prompt, true, []);
      this.touchLane(task.laneId);
      this.emit('task');
      this.pump(task.laneId);
      return;
    }
    // Preempt: stop the open task, then start this one.
    if (currentTask(this.tasks, task.laneId)) {
      this.stopTask(task.laneId, 'Stopped to make room for your new request.');
    }
    const next = this.createTask(task.laneId, prompt, true, []);
    this.messages.push({
      id: id('msg'),
      laneId: task.laneId,
      role: 'user',
      text: prompt,
      createdAt: Date.now()
    });
    this.selectedTaskId = next.id;
    this.emit('task');
    this.pump(task.laneId);
  }

  async answer(taskId: string, questionId: string, text: string): Promise<void> {
    const task = this.tasks.find(item => item.id === taskId);
    const answer = text.trim();
    if (!task || !task.question || task.question.id !== questionId || !answer) {
      throw new Error('This question can no longer be answered.');
    }
    task.question.answer = answer;
    task.question.draft = undefined;
    task.status = 'running';
    task.step = 'Using your answer';
    task.steering.push(answer);
    task.updatedAt = Date.now();
    this.bumpVersion(task);
    this.record('answer', task.laneId, task.id, `Answered · ${answer}`);
    this.recordMemory('decision', task.laneId, task.id, `User decided: ${answer}`);
    this.messages.push({
      id: id('msg'),
      laneId: task.laneId,
      role: 'user',
      text: answer,
      createdAt: Date.now()
    });
    this.emit('task');
    this.schedule(() => this.finish(task.id), 900);
  }

  async stop(taskId: string): Promise<void> {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return;
    this.stopTask(task.laneId, 'Stopped by you.');
  }

  saveAnswerDraft(taskId: string, questionId: string, text: string): void {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || !task.question || task.question.id !== questionId || task.question.answer) return;
    task.question.draft = text;
    // No emit: the field is controlled by this value and re-rendering on each keystroke would fight
    // the cursor. Persisting keeps the draft across a reload or a lane switch.
    this.persist();
  }

  /** The mock keeps bytes in an object URL for this session; nothing leaves the device. */
  async uploadAttachment(file: File): Promise<HiveAttachmentMeta> {
    const fileId = id('local');
    const canCreate = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    if (canCreate) this.files.set(fileId, URL.createObjectURL(file));
    return { id: fileId, name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
  }

  attachmentUrl(attachment: HiveAttachmentMeta): string {
    return attachment.id ? this.files.get(attachment.id) ?? '' : '';
  }

  eraseArtifact(artifactId: string): void {
    for (const task of this.tasks) {
      const artifact = task.artifacts.find(item => item.id === artifactId);
      if (artifact) {
        artifact.erasedAt = Date.now();
        this.record('artifact', task.laneId, task.id, `Erased · ${artifact.title}`);
        this.emit('task');
        return;
      }
    }
  }

  reset(): void {
    this.tasks = [];
    this.messages = [];
    this.activity = [];
    this.activityReadAt = {};
    this.activityTrimmed = false;
    this.memory = [];
    this.memoryCutoffAt = {};
    this.selectedLaneId = 'beebou';
    this.selectedTaskId = '';
    this.seed();
    this.emit('snapshot');
  }

  /** Hides this lane's memory at and before `before` from what the Bee reuses. */
  cutOffMemory(laneId: string, before: number): void {
    if (!Number.isFinite(before) || before <= 0) return;
    const existing = this.memoryCutoffAt[laneId] ?? 0;
    if (before <= existing) return;
    this.memoryCutoffAt = { ...this.memoryCutoffAt, [laneId]: before };
    this.record('task_status', laneId, '', 'Memory cut-off moved');
    this.emit('lane');
  }

  /** Drops the lane's cut-off, so every stored memory entry is reused again. */
  restoreMemory(laneId: string): void {
    if (!(laneId in this.memoryCutoffAt)) return;
    const next = { ...this.memoryCutoffAt };
    delete next[laneId];
    this.memoryCutoffAt = next;
    this.record('task_status', laneId, '', 'Memory cut-off cleared');
    this.emit('lane');
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.listeners.clear();
  }

  /** Reads the current version, and migrates a legacy v1 payload if that is all there is. */
  private restore(): HiveSnapshot | null {
    return this.store.load();
  }

  private normalizeRestored(): void {
    this.tasks = this.tasks.map(task => {
      const interrupted = task.status === 'running' || task.status === 'waiting_user';
      return {
        ...task,
        attachments: Array.isArray(task.attachments) ? task.attachments : [],
        steering: Array.isArray(task.steering) ? task.steering : [],
        artifacts: Array.isArray(task.artifacts) ? task.artifacts : [],
        question: interrupted ? undefined : task.question,
        status: interrupted ? 'stopped' : task.status,
        step: interrupted ? 'Interrupted by reload' : task.step
      };
    });
  }

  private persist(): void {
    this.store.save(this.snapshot());
  }

  /** A portable copy of the current Hive state. */
  exportBackup(): HiveBackup {
    return {
      kind: 'digitalmate.hive.backup',
      version: HIVE_STORE_VERSION,
      savedAt: Date.now(),
      snapshot: this.snapshot()
    };
  }

  /** Replaces the local demo state with a backup file's contents. */
  importBackup(raw: string): { ok: boolean; error?: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'That file is not valid JSON.' };
    }
    const backup = readHiveBackup(parsed);
    if (!backup) return { ok: false, error: 'That file is not a Hive backup.' };
    this.applySnapshot(backup.snapshot);
    this.emit('snapshot');
    return { ok: true };
  }

  private seed(): void {
    const now = Date.now();    const task: HiveTask = {
      id: 'task_seed_scout',
      laneId: 'scout',
      title: 'What is moving in on-device agents?',
      prompt: 'What is moving in on-device agents this week?',
      status: 'done',
      step: 'Summary ready',
      output:
        'Three threads keep showing up: smaller local models, tool use that stays on the device, and memory that can be inspected rather than merely stored.',
      steering: [],
      attachments: [],
      createdAt: now - 11 * 60_000,
      updatedAt: now - 9 * 60_000,
      artifacts: [
        {
          id: 'artifact_seed_scout',
          taskId: 'task_seed_scout',
          title: 'On-device agent watch',
          kind: 'text',
          content:
            'On-device agents are moving from demos to small, bounded jobs: reading, summarizing, and operating one app at a time.',
          createdAt: now - 9 * 60_000
        }
      ]
    };
    this.tasks.push(task);
    this.messages.push({
      id: 'msg_seed_scout',
      laneId: 'scout',
      role: 'bee',
      text: 'I found three signals: local models, on-device tools, and inspectable memory.',
      createdAt: now - 9 * 60_000
    });
    this.memory.push({
      id: 'mem_seed_scout',
      laneId: 'scout',
      taskId: 'task_seed_scout',
      kind: 'task_summary',
      text: 'On-device agents are moving to narrow, bounded jobs; inspectable memory is the open problem.',
      at: now - 9 * 60_000
    });
    this.lanes = this.lanes.map(lane =>
      lane.id === 'scout' ? { ...lane, lastActivityAt: now - 9 * 60_000 } : lane
    );
  }

  private createTask(
    laneId: string,
    text: string,
    queued: boolean,
    attachments: HiveAttachmentMeta[],
    operationId: string = newOperationId()
  ): HiveTask {
    const task: HiveTask = {
      id: id('task'),
      laneId,
      title: text.length > 58 ? `${text.slice(0, 55)}…` : text,
      prompt: text,
      status: 'queued',
      step: queued ? 'Waiting for the current task' : 'Getting ready',
      output: '',
      steering: [],
      attachments: attachments.slice(0, 5),
      operationId,
      runId: id('run'),
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      artifacts: []
    };
    this.tasks.push(task);
    this.record('task_created', laneId, task.id,
      queued ? `Queued · ${task.title}` : `Started · ${task.title}`);
    return task;
  }

  private record(kind: HiveActivityKind, laneId: string, taskId: string, text: string): void {
    this.activity.push({ id: id('act'), laneId, taskId, kind, text, at: Date.now() });
    if (this.activity.length > MAX_ACTIVITY) {
      this.activity = this.activity.slice(this.activity.length - MAX_ACTIVITY);
      this.activityTrimmed = true;
    }
  }

  /** Upstream rows carry a version; every state change bumps it here too. */
  private bumpVersion(task: HiveTask): void {
    task.version = (task.version ?? 0) + 1;
  }

  private recordMemory(kind: HiveMemoryKind, laneId: string, taskId: string, text: string): void {
    const at = Date.now();
    // Keep memory readable: the view shows one line, the full answer stays on the task.
    this.memory.push({ id: id('mem'), laneId, taskId, kind, text: text.slice(0, 200), at });
  }

  /** How many entries the lane would reuse right now, honouring its cut-off. */
  private memoryInUseCount(laneId: string): number {
    const cutoff = this.memoryCutoffAt[laneId] ?? 0;
    return this.memory.filter(entry => entry.laneId === laneId && entry.at > cutoff).length;
  }

  private pump(laneId: string): void {
    if (this.disposed) return;
    const open = this.tasks.find(
      task =>
        task.laneId === laneId &&
        (task.status === 'running' || task.status === 'waiting_user')
    );
    if (open) return;
    const next = [...this.tasks]
      .filter(task => task.laneId === laneId && task.status === 'queued')
      .sort((left, right) => left.createdAt - right.createdAt)[0];
    if (!next) return;
    next.status = 'running';
    next.step = 'Reading the request';
    next.updatedAt = Date.now();
    this.bumpVersion(next);
    this.selectedTaskId = next.id;
    this.emit('task');
    this.schedule(() => this.advance(next.id, 0), 500);
  }

  private advance(taskId: string, index: number): void {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status !== 'running' || this.disposed) return;
    // A deliberate, documented way to reach the failure state in the local demo: start the prompt
    // with `!fail`. Everything else about the flow stays the same, so the error UI is testable.
    if (/^\s*!fail\b/i.test(task.prompt)) {
      this.fail(task, 'The Bee could not finish this request.');
      return;
    }
    const steps = ['Gathering context', 'Comparing sources', 'Writing the result'];
    if (index >= steps.length) {
      this.finish(task.id);
      return;
    }
    task.step = steps[index];
    task.updatedAt = Date.now();
    if (index === 1 && this.needsConfirmation(task)) {
      this.ask(task);
      return;
    }
    this.emit('task');
    this.schedule(() => this.advance(task.id, index + 1), 900);
  }

  private fail(task: HiveTask, reason: string): void {
    task.status = 'error';
    task.step = 'Failed';
    task.updatedAt = Date.now();
    task.output = reason;
    this.bumpVersion(task);
    this.record('task_status', task.laneId, task.id, `Failed · ${task.title}`);
    this.messages.push({
      id: id('msg'),
      laneId: task.laneId,
      role: 'bee',
      text: reason,
      createdAt: Date.now()
    });
    this.touchLane(task.laneId);
    this.emit('task');
    this.pump(task.laneId);
  }

  private needsConfirmation(task: HiveTask): boolean {
    return /email|send|pay|order|book|publish|delete|approve/i.test(task.prompt);
  }

  private ask(task: HiveTask): void {
    const question: HiveQuestion = {
      id: id('question'),
      taskId: task.id,
      interactionId: `hive-bee-question.${task.id}`,
      question: /email|send|publish/i.test(task.prompt)
        ? 'Should I send the draft, or keep it as a draft?'
        : 'Should I continue with the proposed option?',
      answerable: true
    };
    task.question = question;
    task.status = 'waiting_user';
    task.step = 'Waiting for your decision';
    task.updatedAt = Date.now();
    this.bumpVersion(task);
    this.record('question', task.laneId, task.id, `Needs you · ${question.question}`);
    this.emit('task');
  }

  private finish(taskId: string): void {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status === 'stopped' || task.status === 'error') return;
    task.status = 'done';
    task.step = 'Done';
    task.updatedAt = Date.now();
    this.bumpVersion(task);
    const steering = task.steering.length > 0 ? ` I also used your steer: ${task.steering.join('; ')}.` : '';
    const remembered = this.memoryInUseCount(task.laneId);
    const memoryNote = remembered > 0
      ? ` I reused ${remembered} memory ${remembered === 1 ? 'entry' : 'entries'} from this lane.`
      : '';
    task.output = `${this.answerFor(task)}${steering}${memoryNote}`;
    task.artifacts = this.artifactsFor(task);
    task.report = this.reportFor(task);
    this.recordMemory('task_summary', task.laneId, task.id, `${task.title} — ${task.output}`);
    this.record('task_status', task.laneId, task.id, `Done · ${task.title}`);
    for (const artifact of task.artifacts) {
      this.record('artifact', task.laneId, task.id, `Artifact · ${artifact.title}`);
    }
    if (task.report) this.record('report', task.laneId, task.id, `Report · ${task.report.title}`);
    this.messages.push({
      id: id('msg'),
      laneId: task.laneId,
      role: 'bee',
      text: task.output,
      createdAt: Date.now()
    });
    this.touchLane(task.laneId);
    this.emit('task');
    this.pump(task.laneId);
  }

  private answerFor(task: HiveTask): string {
    if (/report|week|summary/i.test(task.prompt)) {
      return 'I put the important changes into a short report and kept the sources beside each claim.';
    }
    if (/email|mail|draft/i.test(task.prompt)) {
      return 'I prepared the draft. Nothing was sent. The draft is attached to this task.';
    }
    if (/code|build|artifact/i.test(task.prompt)) {
      return 'I built the artifact and checked it once more before handing it back.';
    }
    return 'I finished the request. The steps above show what I checked before answering.';
  }

  private artifactsFor(task: HiveTask): HiveArtifact[] {
    if (!/report|email|draft|code|build|artifact|summary/i.test(task.prompt)) return task.artifacts;
    return [
      ...task.artifacts,
      {
        id: id('artifact'),
        taskId: task.id,
        title: task.title,
        kind: /report|week|summary/i.test(task.prompt) ? 'report' : 'text',
        content: task.output || 'A local Hive artifact.',
        createdAt: Date.now()
      }
    ];
  }

  private reportFor(task: HiveTask): HiveTask['report'] {
    if (!/report|week|summary/i.test(task.prompt)) return undefined;
    return {
      title: 'Weekly signal report',
      summary: 'Three changes are worth your attention this week.',
      sections: [
        { label: 'Signal', value: 'On-device agents are becoming narrower and more reliable.' },
        { label: 'Risk', value: 'Memory is still often a black box.' },
        { label: 'Next', value: 'Ask for a memory receipt, not just an answer.' }
      ],
      evidence: [
        {
          id: 'ev_signal',
          category: 'Signal',
          title: 'Narrow agents finish more work',
          quote: 'Agents with explicit tools complete their tasks more often than broad assistants.',
          source: 'Weekly briefing · 12 Nov'
        },
        {
          id: 'ev_memory',
          category: 'Risk',
          title: 'Memory is rarely explained',
          quote: 'Most people cannot say why a preference was reused in a later answer.',
          source: 'Product review · 10 Nov'
        },
        {
          id: 'ev_receipt',
          category: 'Next',
          title: 'Receipts make memory auditable',
          quote: 'A decision with a receipt is easier to trust than the same decision without one.',
          source: 'Support digest · 9 Nov'
        }
      ],
      mail: {
        subject: 'Weekly signal report',
        from: 'Scout · Hive',
        receivedAt: 'Mon 09:12',
        body: 'Three changes worth your attention: agents are narrowing, memory is opaque, and receipts help. I kept the sources beside each claim.',
        truncated: true
      }
    };
  }

  private stopTask(laneId: string, step: string): void {
    for (const task of this.tasks) {
      if (task.laneId === laneId && taskIsOpen(task)) {
        task.status = 'stopped';
        task.step = step;
        task.updatedAt = Date.now();
        this.bumpVersion(task);
        this.record('stop', laneId, task.id, `Stopped · ${task.title}`);
      }
    }
    this.emit('task');
  }

  private touchLane(laneId: string): void {
    this.lanes = this.lanes.map(lane =>
      lane.id === laneId ? { ...lane, lastActivityAt: Date.now() } : lane
    );
    this.emit('lane');
  }

  private schedule(callback: () => void, delay: number): void {
    if (this.disposed) return;
    if (this.timingScale <= 0) {
      callback();
      return;
    }
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, Math.max(10, delay * this.timingScale));
    this.timers.add(timer);
  }

  private emit(type: HiveEvent['type']): void {
    const event: HiveEvent = { type, snapshot: this.snapshot() };
    this.persist();
    for (const listener of this.listeners) listener(event);
  }
}
