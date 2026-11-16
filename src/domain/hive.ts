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

export interface HiveSnapshot {
  lanes: HiveLane[];
  tasks: HiveTask[];
  messages: HiveMessage[];
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
