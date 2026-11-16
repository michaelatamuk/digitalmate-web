#!/usr/bin/env node
/**
 * Minimal Hive bridge for the web client.
 *
 * It implements the contract in `docs/hive-bridge-contract.md` with an in-memory simulator, so the
 * web app can be exercised against a real HTTP + SSE server instead of the local mock.
 *
 * What it is NOT: a model. Task results are canned the same way the mock's are. The point is to
 * prove the transport, the event stream, idempotency and the error taxonomy end to end.
 *
 *   node services/hive-bridge/server.mjs            # http://127.0.0.1:8787
 *   HIVE_BRIDGE_TOKEN=secret node services/hive-bridge/server.mjs
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export const HIVE_BRIDGE_VERSION = 1;

const LANES = [
  {
    id: 'beebou', kind: 'beebou', label: 'Beebou', avatar: '✦', color: '#a06b58', lifecycle: 'active',
    lastActivityAt: 0, capabilities: { steer: false, queue: false, preempt: false },
    description: 'The host. Routes work to the right Bee.'
  },
  {
    id: 'scout', kind: 'bee', label: 'Scout', avatar: '⌕', color: '#5b7fa8', lifecycle: 'active',
    lastActivityAt: 0, capabilities: { steer: true, queue: true, preempt: true },
    description: 'Research, sources and summaries.'
  },
  {
    id: 'forge', kind: 'bee', label: 'Forge', avatar: '◈', color: '#6b6fa8', lifecycle: 'active',
    lastActivityAt: 0, capabilities: { steer: true, queue: true, preempt: true },
    description: 'Builds artifacts, drafts and structured output.'
  },
  {
    id: 'ledger', kind: 'bee', label: 'Ledger', avatar: '▤', color: '#5d7f73', lifecycle: 'active',
    lastActivityAt: 0, capabilities: { steer: true, queue: true, preempt: true },
    description: 'Reports, mail and numbers.'
  }
];

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * In-memory Hive state. Every mutation bumps `seq`, which is also the SSE event id the client can
 * send back as `?since=` after a reconnect.
 */
export class HiveBridgeState {
  constructor(options = {}) {
    this.stepDelayMs = options.stepDelayMs ?? 350;
    this.now = options.now ?? (() => Date.now());
    this.seq = 0;
    this.lanes = LANES.map(lane => ({ ...lane, lastActivityAt: this.now() }));
    this.tasks = [];
    this.messages = [];
    this.activity = [];
    this.activityReadAt = {};
    this.activityTrimmed = false;
    this.memory = [];
    this.memoryCutoffAt = {};
    this.selectedLaneId = 'scout';
    this.selectedTaskId = '';
    this.operations = new Map();
    this.listeners = new Set();
    this.timers = new Set();
  }

  snapshot() {
    return {
      lanes: this.lanes,
      tasks: this.tasks,
      messages: this.messages,
      activity: this.activity,
      activityReadAt: this.activityReadAt,
      activityTrimmed: this.activityTrimmed,
      memory: this.memory,
      memoryCutoffAt: this.memoryCutoffAt,
      selectedLaneId: this.selectedLaneId,
      selectedTaskId: this.selectedTaskId
    };
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.seq += 1;
    const payload = JSON.stringify({ type: 'snapshot', snapshot: this.snapshot() });
    for (const listener of this.listeners) listener(this.seq, payload);
    return this.seq;
  }

  activityEntry(laneId, taskId, kind, text) {
    this.activity.push({ id: id('act'), laneId, taskId, kind, text, at: this.now() });
    if (this.activity.length > 60) {
      this.activity = this.activity.slice(-60);
      this.activityTrimmed = true;
    }
  }

  memoryEntry(laneId, taskId, kind, text) {
    this.memory.push({ id: id('mem'), laneId, taskId, kind, text: text.slice(0, 200), at: this.now() });
  }

  touchLane(laneId) {
    this.lanes = this.lanes.map(lane => (lane.id === laneId ? { ...lane, lastActivityAt: this.now() } : lane));
  }

  createTask(laneId, text, operationId) {
    const task = {
      id: id('task'),
      laneId,
      title: text.length > 58 ? `${text.slice(0, 55)}…` : text,
      prompt: text,
      status: 'running',
      step: 'Reading the request',
      output: '',
      steering: [],
      attachments: [],
      operationId,
      createdAt: this.now(),
      updatedAt: this.now(),
      artifacts: []
    };
    this.tasks.push(task);
    this.operations.set(operationId, task.id);
    this.touchLane(laneId);
    this.activityEntry(laneId, task.id, 'task_created', `Started · ${task.title}`);
    this.selectedTaskId = task.id;
    this.advance(task.id);
    return task;
  }

  advance(taskId) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status !== 'running') return;
    const needsQuestion = /email|send|publish/i.test(task.prompt);
    if (needsQuestion) {
      this.schedule(() => this.ask(task.id), this.stepDelayMs);
      return;
    }
    task.step = 'Writing the result';
    this.emit();
    this.schedule(() => this.finish(task.id), this.stepDelayMs);
  }

  ask(taskId) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status !== 'running') return;
    task.question = {
      id: id('question'),
      taskId: task.id,
      interactionId: `hive-bee-question.${task.id}`,
      question: /email|send|publish/i.test(task.prompt)
        ? 'Should I send the draft, or keep it as a draft?'
        : 'Should I continue with the proposed option?',
      answerable: true
    };
    task.status = 'waiting_user';
    task.step = 'Waiting for your decision';
    task.updatedAt = this.now();
    this.activityEntry(task.laneId, task.id, 'question', `Needs you · ${task.question.question}`);
    this.emit();
  }

  finish(taskId) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || task.status === 'stopped') return;
    task.status = 'done';
    task.step = 'Done';
    task.updatedAt = this.now();
    task.output = `Bridge finished: ${task.title}`;
    const cutoff = this.memoryCutoffAt[task.laneId] ?? 0;
    const reused = this.memory.filter(entry => entry.laneId === task.laneId && entry.at > cutoff).length;
    if (reused > 0) task.output += ` (reused ${reused} memory entr${reused === 1 ? 'y' : 'ies'})`;
    task.artifacts = [{
      id: id('artifact'),
      taskId: task.id,
      title: task.title,
      kind: 'text',
      content: task.output,
      createdAt: this.now()
    }];
    this.memoryEntry(task.laneId, task.id, 'task_summary', `${task.title} — ${task.output}`);
    this.activityEntry(task.laneId, task.id, 'task_status', `Done · ${task.title}`);
    this.messages.push({ id: id('msg'), laneId: task.laneId, role: 'bee', text: task.output, createdAt: this.now() });
    this.touchLane(task.laneId);
    this.emit();
  }

  send({ laneId, text, operationId }) {
    const existing = this.operations.get(operationId);
    if (existing) return { taskId: existing, duplicated: true };
    const task = this.createTask(laneId, text, operationId);
    this.emit();
    return { taskId: task.id, duplicated: false };
  }

  control({ taskId, action, text }) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return { missing: true };
    if (action === 'steer') {
      task.steering.push(text);
      task.step = 'Applying your steer';
      task.updatedAt = this.now();
      this.activityEntry(task.laneId, task.id, 'steer', `Steer · ${text}`);
      this.emit();
      return { ok: true };
    }
    if (action === 'queue') {
      this.createTask(task.laneId, text, `queue-${randomUUID()}`);
      this.emit();
      return { ok: true };
    }
    // preempt
    task.status = 'stopped';
    task.step = 'Stopped to make room for your new request.';
    this.activityEntry(task.laneId, task.id, 'stop', `Stopped · ${task.title}`);
    this.createTask(task.laneId, text, `preempt-${randomUUID()}`);
    this.emit();
    return { ok: true };
  }

  answer({ taskId, questionId, text }) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task || !task.question || task.question.id !== questionId) return { missing: true };
    if (task.question.answer) return { conflict: true };
    task.question.answer = text;
    task.status = 'running';
    task.step = 'Using your answer';
    task.updatedAt = this.now();
    this.activityEntry(task.laneId, task.id, 'answer', `Answered · ${text}`);
    this.memoryEntry(task.laneId, task.id, 'decision', `User decided: ${text}`);
    this.emit();
    this.schedule(() => this.finish(task.id), this.stepDelayMs);
    return { ok: true };
  }

  stop({ taskId }) {
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return { missing: true };
    task.status = 'stopped';
    task.step = 'Stopped by you.';
    task.updatedAt = this.now();
    this.activityEntry(task.laneId, task.id, 'stop', `Stopped · ${task.title}`);
    this.emit();
    return { ok: true, status: 'STOPPED', taskRef: task.id };
  }

  eraseArtifact({ artifactId }) {
    for (const task of this.tasks) {
      const artifact = task.artifacts.find(item => item.id === artifactId);
      if (artifact) {
        artifact.erasedAt = this.now();
        this.activityEntry(task.laneId, task.id, 'artifact', `Erased · ${artifact.title}`);
        this.emit();
        return { ok: true };
      }
    }
    return { missing: true };
  }

  cutOffMemory({ laneId, before }) {
    if (!laneId) return { missing: true };
    if (before > 0) this.memoryCutoffAt[laneId] = before;
    else delete this.memoryCutoffAt[laneId];
    this.activityEntry(laneId, '', 'task_status', before > 0 ? 'Memory cut-off moved' : 'Memory cut-off cleared');
    this.emit();
    return { ok: true };
  }

  reset() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.tasks = [];
    this.messages = [];
    this.activity = [];
    this.memory = [];
    this.memoryCutoffAt = {};
    this.activityReadAt = {};
    this.activityTrimmed = false;
    this.selectedTaskId = '';
    this.operations.clear();
    this.emit();
    return { ok: true };
  }

  schedule(callback, delay) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, Math.max(10, delay));
    this.timers.add(timer);
  }

  dispose() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.listeners.clear();
  }
}

function json(response, status, body, cors) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...cors
  });
  response.end(payload);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => {
      raw += chunk;
      if (raw.length > 2_000_000) reject(new Error('body too large'));
    });
    request.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

export function createHiveBridge(options = {}) {
  const state = options.state ?? new HiveBridgeState(options);
  const token = (options.token ?? '').trim();
  const cors = {
    'access-control-allow-origin': options.allowOrigin ?? '*',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  };

  const authorized = request => {
    if (!token) return true;
    const header = request.headers.authorization ?? '';
    if (header === `Bearer ${token}`) return true;
    const url = new URL(request.url ?? '/', 'http://localhost');
    return url.searchParams.get('access_token') === token;
  };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'OPTIONS') {
      response.writeHead(204, cors);
      response.end();
      return;
    }
    if (!url.pathname.startsWith('/api/hive/')) {
      json(response, 404, { error: { code: 'UNKNOWN_METHOD' } }, cors);
      return;
    }
    if (!authorized(request)) {
      json(response, 401, { error: { code: 'UNAUTHORIZED' } }, cors);
      return;
    }
    try {
      if (url.pathname === '/api/hive/health' && request.method === 'GET') {
        json(response, 200, { ok: true, version: HIVE_BRIDGE_VERSION, tasks: state.tasks.length, seq: state.seq }, cors);
        return;
      }
      if (url.pathname === '/api/hive/capabilities' && request.method === 'GET') {
        json(response, 200, {
          version: HIVE_BRIDGE_VERSION,
          capabilities: { steer: true, queue: true, preempt: true, artifacts: true, memoryCutoff: true }
        }, cors);
        return;
      }
      if (url.pathname === '/api/hive/snapshot' && request.method === 'GET') {
        json(response, 200, state.snapshot(), cors);
        return;
      }
      if (url.pathname === '/api/hive/events' && request.method === 'GET') {
        response.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
          ...cors
        });
        const write = (seq, payload) => response.write(`id: ${seq}\ndata: ${payload}\n\n`);
        write(state.seq, JSON.stringify({ type: 'snapshot', snapshot: state.snapshot() }));
        const stop = state.onChange(write);
        const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 15_000);
        request.on('close', () => {
          clearInterval(keepAlive);
          stop();
        });
        return;
      }

      if (request.method !== 'POST') {
        json(response, 405, { error: { code: 'UNKNOWN_METHOD' } }, cors);
        return;
      }

      const body = await readBody(request);
      switch (url.pathname) {
        case '/api/hive/send': {
          if (!body.laneId || !body.text) {
            json(response, 400, { error: { code: 'BAD_PARAMS' } }, cors);
            return;
          }
          const result = state.send({
            laneId: body.laneId,
            text: body.text,
            operationId: body.operationId || randomUUID()
          });
          json(response, 200, { taskId: result.taskId, snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/control': {
          const result = state.control(body);
          if (result.missing) return json(response, 410, { error: { code: 'TARGET_STALE' } }, cors);
          json(response, 200, { snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/answer': {
          const result = state.answer(body);
          if (result.missing) return json(response, 410, { error: { code: 'TARGET_STALE' } }, cors);
          if (result.conflict) return json(response, 409, { error: { code: 'CONFLICT' } }, cors);
          json(response, 200, { snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/stop': {
          const result = state.stop(body);
          if (result.missing) return json(response, 410, { error: { code: 'TARGET_STALE' } }, cors);
          json(response, 200, { status: result.status, taskRef: result.taskRef, snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/artifact/erase': {
          const result = state.eraseArtifact(body);
          if (result.missing) return json(response, 410, { error: { code: 'TARGET_STALE' } }, cors);
          json(response, 200, { snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/memory/cutoff': {
          const result = state.cutOffMemory(body);
          if (result.missing) return json(response, 400, { error: { code: 'BAD_PARAMS' } }, cors);
          json(response, 200, { snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/answer/draft': {
          json(response, 200, { snapshot: state.snapshot() }, cors);
          return;
        }
        case '/api/hive/reset': {
          state.reset();
          json(response, 200, { snapshot: state.snapshot() }, cors);
          return;
        }
        default:
          json(response, 404, { error: { code: 'UNKNOWN_METHOD' } }, cors);
      }
    } catch (error) {
      json(response, 500, { error: { code: 'INTERNAL', message: String(error?.message ?? error) } }, cors);
    }
  });

  server.on('close', () => state.dispose());
  return { server, state };
}

export function startHiveBridge(options = {}) {
  const { server, state } = createHiveBridge(options);
  const port = options.port ?? Number(process.env.HIVE_BRIDGE_PORT ?? 8787);
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, state, port: typeof address === 'object' && address ? address.port : port });
    });
  });
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('server.mjs');
if (isDirectRun) {
  startHiveBridge({ token: process.env.HIVE_BRIDGE_TOKEN })
    .then(({ port }) => {
      console.log(`Hive bridge listening on http://127.0.0.1:${port}/api/hive`);
      console.log('Point the web app at it with VITE_HIVE_BRIDGE_URL=http://127.0.0.1:' + port);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
