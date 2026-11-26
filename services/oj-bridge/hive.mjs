/**
 * Hive over OpenJiuwen.
 *
 * The app's Hive contract (snapshot + events + commands) is served here, but the work is real: every
 * task is an OpenJiuwen turn on its own session, and each Bee lane maps to an agent reported by
 * JiuwenSwarm. This is intentionally a small translation layer, not a second runtime: status, output
 * and errors come from OJ events.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseOjFrames } from './server.mjs';

const HOST_LANE = {
  id: 'beebou',
  kind: 'beebou',
  label: 'Beebou',
  avatar: '✦',
  color: '#a06b58',
  lifecycle: 'active',
  lastActivityAt: 0,
  capabilities: { steer: false, queue: false, preempt: false },
  description: 'The host. Routes work to the right Bee.'
};

const BEE_COLORS = ['#5b7fa8', '#6b6fa8', '#5d7f73', '#a06b58', '#8f6f4a'];
const MAX_ACTIVITY = 60;
const MAX_EVENTS = 200;

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Turns OJ event payloads into the small vocabulary the task card needs. */
export function mapHiveFrame(frame) {
  const payload = frame?.payload && typeof frame.payload === 'object' ? frame.payload : frame;
  const eventType = typeof payload?.event_type === 'string' ? payload.event_type : '';
  const content = typeof payload?.content === 'string' ? payload.content : '';
  switch (eventType) {
    case 'chat.delta':
      return content ? { kind: 'text', text: content } : null;
    case 'chat.final':
      return content ? { kind: 'final', text: content } : { kind: 'final', text: '' };
    case 'chat.reasoning': {
      const step = content.trim().slice(0, 100);
      return step ? { kind: 'step', step } : null;
    }
    case 'chat.tool_call': {
      const name = typeof payload?.name === 'string' ? payload.name : 'tool';
      return { kind: 'step', step: `Using ${name}` };
    }
    case 'chat.error':
      return {
        kind: 'error',
        message:
          typeof payload?.error === 'string' && payload.error
            ? payload.error
            : typeof payload?.message === 'string' && payload.message
              ? payload.message
              : 'The agent reported an error.'
      };
    case 'chat.ask_user_question': {
      const questions = Array.isArray(payload?.questions) ? payload.questions : [];
      const first = questions[0] && typeof questions[0] === 'object' ? questions[0] : {};
      const text =
        (typeof first.question === 'string' && first.question) ||
        (typeof payload?.query === 'string' && payload.query) ||
        'The agent needs an answer.';
      const options = Array.isArray(first.options)
        ? first.options
            .map(option =>
              typeof option === 'string'
                ? option
                : option && typeof option === 'object' && typeof option.label === 'string'
                  ? option.label
                  : ''
            )
            .filter(Boolean)
        : [];
      return {
        kind: 'question',
        requestId: String(payload?.request_id ?? ''),
        questionId: String(first.id ?? payload?.request_id ?? ''),
        interruptId: String(payload?.interrupt_id ?? ''),
        question: text,
        options
      };
    }
    default:
      return null;
  }
}

export class HiveOverOj {
  constructor({ ojBase, fetchImpl, now = () => Date.now(), token = '', statePath = '' }) {
    this.ojBase = ojBase.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    this.now = now;
    this.token = token;
    this.statePath = statePath;
    this.lanes = [{ ...HOST_LANE, lastActivityAt: this.now() }];
    this.tasks = [];
    this.messages = [];
    this.activity = [];
    this.activityReadAt = {};
    this.activityTrimmed = false;
    this.memory = [];
    this.memoryCutoffAt = {};
    this.selectedLaneId = 'beebou';
    this.selectedTaskId = '';
    this.operations = new Map();
    this.listeners = new Set();
    this.buffers = new Map();
    this.seq = 0;
    this.events = [];
    this.agentsLoaded = false;
    this.controllers = new Map();
    this.loadState();
  }

  /** Restores the last snapshot so a bridge restart does not lose tasks. */
  loadState() {
    if (!this.statePath || !existsSync(this.statePath)) return;
    try {
      const data = JSON.parse(readFileSync(this.statePath, 'utf8'));
      const revive = task => {
        const interrupted = task.status === 'running' || task.status === 'waiting_user';
        return {
          ...task,
          status: interrupted ? 'stopped' : task.status,
          step: interrupted ? 'Interrupted by restart' : task.step,
          attachments: Array.isArray(task.attachments) ? task.attachments : [],
          steering: Array.isArray(task.steering) ? task.steering : [],
          artifacts: Array.isArray(task.artifacts) ? task.artifacts : []
        };
      };
      if (Array.isArray(data.tasks)) this.tasks = data.tasks.map(revive);
      if (Array.isArray(data.messages)) this.messages = data.messages;
      if (Array.isArray(data.activity)) this.activity = data.activity;
      if (Array.isArray(data.memory)) this.memory = data.memory;
      if (data.activityReadAt) this.activityReadAt = data.activityReadAt;
      if (data.memoryCutoffAt) this.memoryCutoffAt = data.memoryCutoffAt;
      if (typeof data.selectedLaneId === 'string') this.selectedLaneId = data.selectedLaneId;
      if (typeof data.selectedTaskId === 'string') this.selectedTaskId = data.selectedTaskId;
    } catch {
      // A damaged state file must not stop the bridge from starting.
    }
  }

  saveState() {
    if (!this.statePath) return;
    try {
      mkdirSync(dirname(this.statePath), { recursive: true });
      writeFileSync(
        this.statePath,
        JSON.stringify({
          tasks: this.tasks,
          messages: this.messages,
          activity: this.activity,
          memory: this.memory,
          activityReadAt: this.activityReadAt,
          memoryCutoffAt: this.memoryCutoffAt,
          selectedLaneId: this.selectedLaneId,
          selectedTaskId: this.selectedTaskId
        })
      );
    } catch {
      // Persistence is best-effort; the live state stays authoritative.
    }
  }

  /** Loads lanes from the runtime's agent list; keeps Beebou as the host. */
  async ensureAgents() {
    if (this.agentsLoaded) return;
    const response = await this.fetchImpl(`${this.ojBase}/api/v1/agents/list`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
      },
      body: '{}'
    });
    if (!response.ok) throw new Error(`agents/list returned HTTP ${response.status}`);
    const payload = await response.json().catch(() => ({}));
    const agents = Array.isArray(payload?.payload?.agents) ? payload.payload.agents : [];
    const usable = agents.filter(
      agent =>
        agent &&
        typeof agent.name === 'string' &&
        agent.name &&
        // Utility agents that exist to configure the runtime are not Bees.
        !/statusline|tui-?setup|agent-?setup/i.test(agent.name)
    );
    this.lanes = [
      { ...HOST_LANE, lastActivityAt: this.now() },
      ...usable.slice(0, 5).map((agent, index) => ({
        id: slug(agent.name) || `bee-${index + 1}`,
        kind: 'bee',
        label: agent.name,
        avatar: agent.name.slice(0, 1).toUpperCase(),
        color: BEE_COLORS[index % BEE_COLORS.length],
        lifecycle: 'active',
        lastActivityAt: this.now(),
        capabilities: { steer: true, queue: true, preempt: true },
        description: typeof agent.description === 'string' ? agent.description.slice(0, 120) : ''
      }))
    ];
    this.agentsLoaded = true;
    this.emit('lane');
  }

  snapshot() {
    return {
      lanes: this.lanes.map(lane => ({ ...lane })),
      tasks: this.tasks.map(task => ({
        ...task,
        steering: [...task.steering],
        attachments: [...task.attachments],
        artifacts: task.artifacts.map(artifact => ({ ...artifact })),
        question: task.question ? { ...task.question } : undefined
      })),
      messages: this.messages.map(message => ({ ...message })),
      activity: this.activity.map(entry => ({ ...entry })),
      activityReadAt: { ...this.activityReadAt },
      activityTrimmed: this.activityTrimmed,
      memory: this.memory.map(entry => ({ ...entry })),
      memoryCutoffAt: { ...this.memoryCutoffAt },
      selectedLaneId: this.selectedLaneId,
      selectedTaskId: this.selectedTaskId
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type) {
    const event = { type, snapshot: this.snapshot(), id: ++this.seq };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
    this.saveState();
    for (const listener of this.listeners) listener(event);
  }

  eventsSince(since) {
    return this.events.filter(event => event.id > since);
  }

  selectLane(laneId) {
    if (!this.lanes.some(lane => lane.id === laneId)) return;
    this.selectedLaneId = laneId;
    this.emit('lane');
  }

  selectTask(taskId) {
    this.selectedTaskId = taskId;
    this.emit('lane');
  }

  laneOf(laneId) {
    return this.lanes.find(lane => lane.id === laneId);
  }

  activeIn(laneId) {
    return this.tasks.find(
      task => task.laneId === laneId && (task.status === 'running' || task.status === 'waiting_user')
    );
  }

  activityEntry(kind, laneId, taskId, text) {
    this.activity.push({ id: id('act'), laneId, taskId, kind, text, at: this.now() });
    if (this.activity.length > MAX_ACTIVITY) {
      this.activity.splice(0, this.activity.length - MAX_ACTIVITY);
      this.activityTrimmed = true;
    }
  }

  touchLane(laneId) {
    this.lanes = this.lanes.map(lane =>
      lane.id === laneId ? { ...lane, lastActivityAt: this.now() } : lane
    );
  }

  recordMemory(kind, laneId, taskId, text) {
    this.memory.push({
      id: id('mem'),
      laneId,
      taskId,
      kind,
      text: text.slice(0, 200),
      at: this.now()
    });
  }

  async send({ laneId, text, attachments = [], operationId }) {
    await this.ensureAgents();
    const lane = this.laneOf(laneId);
    const prompt = String(text || '').trim();
    if (!lane || !prompt) throw new Error('A Bee and a request are required.');
    const opId = operationId || randomUUID();
    const existing = this.tasks.find(task => task.laneId === laneId && task.operationId === opId);
    if (existing) return existing.id;

    const busy = Boolean(this.activeIn(laneId));
    const task = this.createTask(lane, prompt, busy, attachments, opId);
    this.messages.push({
      id: id('msg'),
      laneId,
      role: 'user',
      text: prompt,
      createdAt: this.now()
    });
    this.touchLane(laneId);
    this.emit('task');
    this.pump(laneId);
    return task.id;
  }

  createTask(lane, prompt, queued, attachments, operationId) {
    const task = {
      id: id('task'),
      laneId: lane.id,
      title: prompt.length > 58 ? `${prompt.slice(0, 55)}…` : prompt,
      prompt,
      status: queued ? 'queued' : 'running',
      step: queued ? 'Waiting for the current task' : 'Asking OpenJiuwen',
      output: '',
      steering: [],
      attachments: attachments.slice(0, 5).map(item => ({
        name: String(item?.name ?? 'attachment'),
        size: Number(item?.size ?? 0),
        type: String(item?.type ?? ''),
        id: item?.id
      })),
      runId: `oj_${randomUUID().slice(0, 8)}`,
      version: 1,
      operationId,
      question: undefined,
      createdAt: this.now(),
      updatedAt: this.now(),
      artifacts: []
    };
    this.tasks.push(task);
    this.selectedTaskId = task.id;
    this.activityEntry('task_created', lane.id, task.id, `Sent · ${task.title}`);
    return task;
  }

  bump(task) {
    task.version = (task.version ?? 0) + 1;
    task.updatedAt = this.now();
  }

  pump(laneId) {
    const active = this.activeIn(laneId);
    // A running task with a controller is executing; a waiting task is paused for an answer.
    if (active && (this.controllers.get(active.id) || active.status === 'waiting_user')) return;
    const next =
      active ?? this.tasks.find(task => task.laneId === laneId && task.status === 'queued');
    if (!next) return;
    if (next.status === 'queued') {
      next.status = 'running';
      next.step = 'Asking OpenJiuwen';
      this.bump(next);
      this.emit('task');
    }
    void this.run(next);
  }

  async run(task) {
    const controller = new AbortController();
    this.controllers.set(task.id, controller);
    // A follow-up turn (steer/answer) continues the same OJ session.
    const sessionId = task.sessionId || randomUUID();
    task.sessionId = sessionId;
    const request = {
      request_id: randomUUID(),
      channel_id: 'web',
      session_id: sessionId,
      req_method: 'chat.send',
      is_stream: true,
      timestamp: this.now() / 1000,
      params: { query: task.prompt }
    };
    try {
      const response = await this.fetchImpl(`${this.ojBase}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new Error(`OpenJiuwen returned HTTP ${response.status}`);
      }
      await this.consume(task, response, task.output || '');
    } catch (error) {
      if (controller.signal.aborted) return;
      this.fail(task, String(error?.message ?? error));
    } finally {
      this.controllers.delete(task.id);
      this.pump(task.laneId);
    }
  }

  /** Sends the answer as `chat.answer` and keeps consuming the same conversation. */
  async runAnswer(task, question, text) {
    const controller = new AbortController();
    this.controllers.set(task.id, controller);
    const request = {
      request_id: randomUUID(),
      channel_id: 'web',
      session_id: task.sessionId,
      req_method: 'chat.send',
      is_stream: true,
      timestamp: this.now() / 1000,
      params: {
        // OJ resumes a paused ask_user turn through chat.send with the question's source.
        query: '',
        source: 'ask_user_interrupt',
        request_id: question.requestId,
        ...(question.interruptId ? { interrupt_id: question.interruptId } : {}),
        answers: [
          { question: question.question, selected_options: [], custom_input: text }
        ]
      }
    };
    try {
      const response = await this.fetchImpl(`${this.ojBase}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new Error(`OpenJiuwen returned HTTP ${response.status}`);
      }
      await this.consume(task, response, task.output || '');
    } catch (error) {
      if (controller.signal.aborted) return;
      this.fail(task, String(error?.message ?? error));
    } finally {
      this.controllers.delete(task.id);
      this.pump(task.laneId);
    }
  }

  async consume(task, response, start) {
    let emitted = start;
    const decoder = new TextDecoder();
    let buffer = '';
    let failed = false;
    for await (const part of response.body) {
      buffer += decoder.decode(part, { stream: true });
      const { frames, rest } = parseOjFrames(buffer);
      buffer = rest;
      for (const frame of frames) {
        const payload = frame?.payload && typeof frame.payload === 'object' ? frame.payload : frame;
        if (frame?.ok === false && payload?.error) {
          failed = true;
          this.fail(task, String(payload.error));
          continue;
        }
        const mapped = mapHiveFrame(frame);
        if (!mapped) continue;
        if (mapped.kind === 'step') {
          if (task.status === 'running') {
            task.step = mapped.step;
            this.bump(task);
            this.emit('task');
          }
        } else if (mapped.kind === 'text') {
          if (task.status === 'running') {
            emitted += mapped.text;
            task.output = emitted;
            this.emit('task');
          }
        } else if (mapped.kind === 'final') {
          if (mapped.text && !emitted.startsWith(mapped.text)) {
            emitted = mapped.text;
            task.output = emitted;
          }
        } else if (mapped.kind === 'question') {
          const repeated =
            task.question &&
            task.question.answer &&
            (task.question.requestId === mapped.requestId ||
              task.question.question === mapped.question);
          if (repeated) {
            // The runtime asked the same thing again: the answer was not accepted.
            this.fail(task, 'OpenJiuwen did not accept that answer; the question was asked again.');
            failed = true;
            continue;
          }
          task.question = {
            id: mapped.requestId || mapped.questionId || id('question'),
            requestId: mapped.requestId,
            questionId: mapped.questionId,
            interruptId: mapped.interruptId,
            interactionId: mapped.requestId,
            question: mapped.question,
            answerable: true,
            options: mapped.options
          };
          task.status = 'waiting_user';
          task.step = 'Waiting for your decision';
          this.bump(task);
          this.activityEntry('question', task.laneId, task.id, `Needs you · ${mapped.question}`);
          this.emit('task');
        } else if (mapped.kind === 'error') {
          failed = true;
          this.fail(task, mapped.message);
        }
      }
      if (failed) break;
    }
    if (task.status === 'running') this.finish(task);
  }

  finish(task) {
    task.status = 'done';
    task.step = 'Done';
    this.bump(task);
    if (task.output.trim()) {
      task.artifacts.push({
        id: id('art'),
        kind: /report|week|summary|email|draft|build/i.test(task.prompt) ? 'report' : 'text',
        title: task.title,
        content: task.output,
        createdAt: this.now()
      });
    }
    this.activityEntry('task_status', task.laneId, task.id, `Done · ${task.title}`);
    this.recordMemory('task_summary', task.laneId, task.id, task.title);
    this.touchLane(task.laneId);
    this.emit('task');
    this.emit('lane');
  }

  fail(task, reason) {
    if (task.status === 'error' || task.status === 'stopped') return;
    task.status = 'error';
    task.step = 'Failed';
    task.output = reason;
    this.bump(task);
    this.activityEntry('task_status', task.laneId, task.id, `Failed · ${task.title}`);
    this.messages.push({
      id: id('msg'),
      laneId: task.laneId,
      role: 'bee',
      text: reason,
      createdAt: this.now()
    });
    this.touchLane(task.laneId);
    this.emit('task');
  }

  stop(taskId) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return;
    this.controllers.get(task.id)?.abort();
    for (const item of this.tasks) {
      if (item.laneId === task.laneId && (item.status === 'running' || item.status === 'queued')) {
        item.status = item.id === taskId ? 'stopped' : item.status;
        if (item.id === taskId) {
          item.status = 'stopped';
          item.step = 'Stopped by you.';
          this.bump(item);
          this.activityEntry('stop', item.laneId, item.id, `Stopped · ${item.title}`);
        }
      }
    }
    this.emit('task');
    this.pump(task.laneId);
  }

  control(taskId, action, text) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return;
    const value = String(text || '').trim();
    if (action === 'steer') {
      if (!value) return;
      task.steering.push(value);
      this.bump(task);
      this.activityEntry('steer', task.laneId, task.id, `Steer · ${value}`);
      this.emit('task');
      return;
    }
    if (action === 'queue') {
      if (!value) return;
      const lane = this.laneOf(task.laneId);
      if (lane) {
        const next = this.createTask(lane, value, Boolean(this.activeIn(lane.id)), [], randomUUID());
        this.emit('task');
        this.pump(lane.id);
        void next;
      }
      return;
    }
    if (action === 'preempt') {
      if (!value) return;
      this.stop(task.id);
      const lane = this.laneOf(task.laneId);
      if (lane) {
        this.createTask(lane, value, false, [], randomUUID());
        this.emit('task');
        this.pump(lane.id);
      }
    }
  }

  answer(taskId, text) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return;
    const question = task.question;
    const value = String(text || '').trim();
    if (!question || !value) return;
    task.question = { ...question, answer: value, draft: undefined };
    task.status = 'running';
    task.step = 'Using your answer';
    this.bump(task);
    this.activityEntry('answer', task.laneId, task.id, `Answered · ${value}`);
    this.emit('task');
    void this.runAnswer(task, question, value);
  }

  cutOff(laneId, at) {
    this.memoryCutoffAt = { ...this.memoryCutoffAt, [laneId]: Number(at) || 0 };
    this.emit('lane');
  }

  restoreMemory(laneId) {
    const next = { ...this.memoryCutoffAt };
    delete next[laneId];
    this.memoryCutoffAt = next;
    this.emit('lane');
  }

  erase(artifactId) {
    for (const task of this.tasks) {
      const artifact = task.artifacts.find(item => item.id === artifactId);
      if (artifact) {
        artifact.erasedAt = this.now();
        this.emit('task');
        return;
      }
    }
  }

  reset() {
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
    this.tasks = [];
    this.messages = [];
    this.activity = [];
    this.activityReadAt = {};
    this.activityTrimmed = false;
    this.memory = [];
    this.memoryCutoffAt = {};
    this.selectedTaskId = '';
    this.selectedLaneId = 'beebou';
    this.operations.clear();
    try {
      if (this.statePath && existsSync(this.statePath)) rmSync(this.statePath);
    } catch {
      // Nothing to clean up.
    }
    this.emit('snapshot');
  }
}
