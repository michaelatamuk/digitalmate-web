import type {
  HiveArtifact,
  HiveEvent,
  HiveLane,
  HiveMessage,
  HiveQuestion,
  HiveSendInput,
  HiveSnapshot,
  HiveTask
} from '../domain/hive';
import { currentTask, taskIsOpen } from '../domain/hive';

export interface HiveTransport {
  readonly id: 'mock' | 'bridge';
  subscribe: (listener: (event: HiveEvent) => void) => () => void;
  snapshot: () => HiveSnapshot;
  selectLane: (laneId: string) => void;
  selectTask: (taskId: string) => void;
  send: (input: HiveSendInput) => Promise<string>;
  control: (taskId: string, action: 'steer' | 'queue' | 'preempt', text: string) => Promise<void>;
  answer: (taskId: string, questionId: string, text: string) => Promise<void>;
  stop: (taskId: string) => Promise<void>;
  eraseArtifact: (artifactId: string) => void;
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

const STORAGE_KEY = 'digitalmate.hive.v1';

function canPersist(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

/** Local Hive demo. It mirrors the event and control shape of a real Hive bridge. */
export class MockHiveTransport implements HiveTransport {
  readonly id = 'mock' as const;
  private lanes: HiveLane[];
  private tasks: HiveTask[] = [];
  private messages: HiveMessage[] = [];
  private selectedLaneId = 'beebou';
  private selectedTaskId = '';
  private listeners = new Set<(event: HiveEvent) => void>();
  private timers = new Set<number>();
  private disposed = false;

  constructor(private readonly timingScale = 1) {
    this.lanes = clone(LANES).map(lane => ({
      ...lane,
      lastActivityAt: Date.now() - Math.floor(Math.random() * 8_000)
    }));
    const restored = this.restore();
    if (restored) {
      this.lanes = restored.lanes.length > 0 ? restored.lanes : this.lanes;
      this.tasks = restored.tasks;
      this.messages = restored.messages;
      this.selectedLaneId = this.lanes.some(lane => lane.id === restored.selectedLaneId)
        ? restored.selectedLaneId
        : 'beebou';
      this.selectedTaskId = restored.selectedTaskId;
      this.normalizeRestored();
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

  subscribe(listener: (event: HiveEvent) => void): () => void {
    this.listeners.add(listener);
    listener({ type: 'snapshot', snapshot: this.snapshot() });
    return () => this.listeners.delete(listener);
  }

  snapshot(): HiveSnapshot {
    return {
      lanes: clone(this.lanes),
      tasks: clone(this.tasks),
      messages: clone(this.messages),
      selectedLaneId: this.selectedLaneId,
      selectedTaskId: this.selectedTaskId
    };
  }

  selectLane(laneId: string): void {
    if (!this.lanes.some(lane => lane.id === laneId)) return;
    this.selectedLaneId = laneId;
    this.selectedTaskId = '';
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
    const busy = Boolean(currentTask(this.tasks, lane.id));
    const task = this.createTask(lane.id, text, busy, input.attachments ?? []);
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
    task.status = 'running';
    task.step = 'Using your answer';
    task.steering.push(answer);
    task.updatedAt = Date.now();
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

  eraseArtifact(artifactId: string): void {
    for (const task of this.tasks) {
      const artifact = task.artifacts.find(item => item.id === artifactId);
      if (artifact) {
        artifact.erasedAt = Date.now();
        this.emit('task');
        return;
      }
    }
  }

  reset(): void {
    this.tasks = [];
    this.messages = [];
    this.selectedLaneId = 'beebou';
    this.selectedTaskId = '';
    this.seed();
    this.emit('snapshot');
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.listeners.clear();
  }

  private restore(): HiveSnapshot | null {
    if (!canPersist()) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<HiveSnapshot>;
      if (!Array.isArray(parsed.lanes) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.messages)) {
        return null;
      }
      return {
        lanes: parsed.lanes,
        tasks: parsed.tasks,
        messages: parsed.messages,
        selectedLaneId: typeof parsed.selectedLaneId === 'string' ? parsed.selectedLaneId : 'beebou',
        selectedTaskId: typeof parsed.selectedTaskId === 'string' ? parsed.selectedTaskId : ''
      };
    } catch {
      return null;
    }
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
    if (!canPersist()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
    } catch {
      // The local demo still works when storage is unavailable.
    }
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
    this.lanes = this.lanes.map(lane =>
      lane.id === 'scout' ? { ...lane, lastActivityAt: now - 9 * 60_000 } : lane
    );
  }

  private createTask(laneId: string, text: string, queued: boolean, attachments: string[]): HiveTask {
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      artifacts: []
    };
    this.tasks.push(task);
    return task;
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
    this.selectedTaskId = next.id;
    this.emit('task');
    this.schedule(() => this.advance(next.id, 0), 500);
  }

  private advance(taskId: string, index: number): void {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status !== 'running' || this.disposed) return;
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
    this.emit('task');
  }

  private finish(taskId: string): void {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status === 'stopped' || task.status === 'error') return;
    task.status = 'done';
    task.step = 'Done';
    task.updatedAt = Date.now();
    const steering = task.steering.length > 0 ? ` I also used your steer: ${task.steering.join('; ')}.` : '';
    task.output = `${this.answerFor(task)}${steering}`;
    task.artifacts = this.artifactsFor(task);
    task.report = this.reportFor(task);
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
      ]
    };
  }

  private stopTask(laneId: string, step: string): void {
    for (const task of this.tasks) {
      if (task.laneId === laneId && taskIsOpen(task)) {
        task.status = 'stopped';
        task.step = step;
        task.updatedAt = Date.now();
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
