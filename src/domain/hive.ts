export type HiveLaneKind = 'beebou' | 'bee';
export type HiveLaneLifecycle = 'active' | 'retired' | 'archived';
export type HiveTaskStatus = 'queued' | 'running' | 'waiting_user' | 'done' | 'stopped' | 'error';
export type HiveArtifactKind = 'text' | 'report' | 'file';

export interface HiveCapabilities {
  steer: boolean;
  queue: boolean;
  preempt: boolean;
}

export interface HiveLane {
  id: string;
  kind: HiveLaneKind;
  label: string;
  avatar: string;
  color: string;
  lifecycle: HiveLaneLifecycle;
  lastActivityAt: number;
  capabilities: HiveCapabilities;
  description: string;
}

export interface HiveQuestion {
  id: string;
  taskId: string;
  interactionId: string;
  question: string;
  answerable: boolean;
  answer?: string;
}

export interface HiveArtifact {
  id: string;
  taskId: string;
  title: string;
  kind: HiveArtifactKind;
  content: string;
  createdAt: number;
  erasedAt?: number;
}

export interface HiveReportSection {
  label: string;
  value: string;
}

export interface HiveReport {
  title: string;
  summary: string;
  sections: HiveReportSection[];
}

export interface HiveTask {
  id: string;
  laneId: string;
  title: string;
  prompt: string;
  status: HiveTaskStatus;
  step: string;
  output: string;
  steering: string[];
  attachments: string[];
  createdAt: number;
  updatedAt: number;
  question?: HiveQuestion;
  artifacts: HiveArtifact[];
  report?: HiveReport;
}

export interface HiveMessage {
  id: string;
  laneId: string;
  role: 'user' | 'beebou' | 'bee';
  text: string;
  createdAt: number;
}

export type HiveActivityKind =
  | 'task_created'
  | 'task_status'
  | 'question'
  | 'answer'
  | 'steer'
  | 'artifact'
  | 'report'
  | 'stop';

/**
 * One line in a lane's activity feed. Cursor history is kept as a bounded log: when older entries
 * are dropped the feed reports a gap instead of pretending the log starts at the beginning.
 */
export interface HiveActivity {
  id: string;
  laneId: string;
  taskId: string;
  kind: HiveActivityKind;
  text: string;
  at: number;
}

export interface HiveSnapshot {
  lanes: HiveLane[];
  tasks: HiveTask[];
  messages: HiveMessage[];
  activity: HiveActivity[];
  /** Per-lane timestamp up to which the reader has seen the feed. */
  activityReadAt: Record<string, number>;
  /** True when the bounded log dropped earlier entries, so the feed is not continuous. */
  activityTrimmed: boolean;
  selectedLaneId: string;
  selectedTaskId: string;
}

export interface HiveSendInput {
  laneId: string;
  text: string;
  attachments?: string[];
}

export interface HiveEvent {
  type: 'snapshot' | 'task' | 'message' | 'lane';
  snapshot: HiveSnapshot;
}

/** Bumped whenever the persisted shape changes; the store migrates older payloads forward. */
export const HIVE_STORE_VERSION = 2;

export interface HiveBackup {
  kind: 'digitalmate.hive.backup';
  version: number;
  savedAt: number;
  snapshot: HiveSnapshot;
}

export function emptyHiveSnapshot(): HiveSnapshot {
  return {
    lanes: [],
    tasks: [],
    messages: [],
    activity: [],
    activityReadAt: {},
    activityTrimmed: false,
    selectedLaneId: 'beebou',
    selectedTaskId: ''
  };
}

/**
 * Accepts a persisted or imported payload. Only the shape the UI relies on is required; fields
 * added by later versions fall back to their empty values so an old backup still opens.
 */
export function readHiveSnapshot(value: unknown): HiveSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<HiveSnapshot>;
  if (!Array.isArray(candidate.lanes) || !Array.isArray(candidate.tasks) || !Array.isArray(candidate.messages)) {
    return null;
  }
  const base = emptyHiveSnapshot();
  return {
    lanes: candidate.lanes,
    tasks: candidate.tasks,
    messages: candidate.messages,
    activity: Array.isArray(candidate.activity) ? candidate.activity : base.activity,
    activityReadAt: candidate.activityReadAt && typeof candidate.activityReadAt === 'object'
      ? (candidate.activityReadAt as Record<string, number>)
      : base.activityReadAt,
    activityTrimmed: candidate.activityTrimmed === true,
    selectedLaneId: typeof candidate.selectedLaneId === 'string' ? candidate.selectedLaneId : base.selectedLaneId,
    selectedTaskId: typeof candidate.selectedTaskId === 'string' ? candidate.selectedTaskId : ''
  };
}

/** Reads either a bare snapshot (v1) or a versioned backup envelope. */
export function readHiveBackup(value: unknown): HiveBackup | null {
  if (!value || typeof value !== 'object') return null;
  const envelope = value as Partial<HiveBackup>;
  if (envelope.kind === 'digitalmate.hive.backup' && envelope.snapshot) {
    const snapshot = readHiveSnapshot(envelope.snapshot);
    if (!snapshot) return null;
    return {
      kind: 'digitalmate.hive.backup',
      version: typeof envelope.version === 'number' ? envelope.version : HIVE_STORE_VERSION,
      savedAt: typeof envelope.savedAt === 'number' ? envelope.savedAt : Date.now(),
      snapshot
    };
  }
  // Legacy v1 payloads were a bare snapshot.
  const snapshot = readHiveSnapshot(value);
  return snapshot ? { kind: 'digitalmate.hive.backup', version: 1, savedAt: Date.now(), snapshot } : null;
}

export function taskIsOpen(task: HiveTask): boolean {
  return task.status === 'queued' || task.status === 'running' || task.status === 'waiting_user';
}

export function taskStatusLabel(status: HiveTaskStatus, tr: (en: string, zh: string) => string): string {
  switch (status) {
    case 'queued':
      return tr('Queued', '排队中');
    case 'running':
      return tr('Working', '执行中');
    case 'waiting_user':
      return tr('Needs you', '需要你');
    case 'done':
      return tr('Done', '已完成');
    case 'stopped':
      return tr('Stopped', '已停止');
    default:
      return tr('Failed', '失败');
  }
}

/** Short, stable reference shown wherever a task is mentioned. */
export function taskRef(task: HiveTask): string {
  const tail = task.id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
  return `T-${tail}`;
}

/** Latest moment a lane did anything: its own pulse or any task in it. */
export function laneLastActivity(lanes: HiveLane[], tasks: HiveTask[], laneId: string): number {
  const lane = lanes.find(item => item.id === laneId);
  const taskAt = tasks
    .filter(task => task.laneId === laneId)
    .reduce((max, task) => Math.max(max, task.updatedAt), 0);
  return Math.max(lane?.lastActivityAt ?? 0, taskAt);
}

/** Compact relative stamp for lane chips and Bee cards. */
export function relativeTime(at: number, now: number, tr: (en: string, zh: string) => string): string {
  if (!at) return '';
  const delta = Math.max(0, now - at);
  if (delta < 60_000) return tr('just now', '刚刚');
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return tr(`${minutes}m ago`, `${minutes} 分钟前`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr(`${hours}h ago`, `${hours} 小时前`);
  return tr(`${Math.floor(hours / 24)}d ago`, `${Math.floor(hours / 24)} 天前`);
}

export function currentTask(tasks: HiveTask[], laneId: string): HiveTask | undefined {
  return [...tasks]
    .filter(task => task.laneId === laneId && taskIsOpen(task))
    .sort((left, right) => right.createdAt - left.createdAt)[0];
}

export function latestTask(tasks: HiveTask[], laneId: string): HiveTask | undefined {
  return [...tasks]
    .filter(task => task.laneId === laneId)
    .sort((left, right) => right.createdAt - left.createdAt)[0];
}

/** Newest first, as the feed renders it. */
export function laneActivity(snapshot: HiveSnapshot, laneId: string): HiveActivity[] {
  return [...snapshot.activity]
    .filter(item => item.laneId === laneId)
    .sort((left, right) => right.at - left.at);
}

export function laneUnreadCount(snapshot: HiveSnapshot, laneId: string): number {
  const readAt = snapshot.activityReadAt[laneId] ?? 0;
  return snapshot.activity.filter(item => item.laneId === laneId && item.at > readAt).length;
}

/** True when this lane's feed may have lost older entries, so the UI must say so. */
export function laneHasActivityGap(snapshot: HiveSnapshot, laneId: string): boolean {
  if (!snapshot.activityTrimmed) return false;
  const items = laneActivity(snapshot, laneId);
  return items.length > 0;
}
