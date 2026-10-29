export type ThinkingStatus = 'pending' | 'active' | 'done';

export type Language = 'en' | 'zh';

export interface ThinkingStep {
  label: string;
  status: ThinkingStatus;
}

export interface A2uiAction {
  id: string;
  label: string;
  prompt?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  kind?: string;
}

export interface A2uiMetric {
  label: string;
  value: string;
  tone?: string;
}

export interface A2uiComponent {
  id: string;
  component: string;
  child?: string;
  children?: string[];
  title?: string;
  text?: string;
  body?: string;
  status?: string;
  dataPath?: string;
  actions?: A2uiAction[];
  metrics?: A2uiMetric[];
  [key: string]: unknown;
}

export interface A2uiSurface {
  id: string;
  title?: string;
  subtitle?: string;
  status?: 'thinking' | 'ready' | 'error';
  root: string;
  components: Record<string, A2uiComponent>;
  data: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  surface?: A2uiSurface;
  thinking?: {
    title: string;
    steps: ThinkingStep[];
    done: boolean;
  };
  streaming?: boolean;
  followUps?: string[];
}

export interface FeedCard {
  id: string;
  source: string;
  sourceLabel: string;
  topic: string;
  title: string;
  summary: string;
  glyph: string;
  cover: string;
  readingTime: string;
  published: string;
  url: string;
  body: string[];
  tags: string[];
  metric: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  author: string;
  installed: boolean;
  enabled: boolean;
  builtin?: boolean;
}

export type Reaction = 'like' | 'dislike' | 'save' | undefined;

export interface Settings {
  cloudBackend: 'orbit' | 'local';
  notifications: boolean;
  reducedMotion: boolean;
  showThinking: boolean;
}

export interface ItemDetail {
  kind: 'train' | 'flight' | 'food';
  item: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  meta: string;
  tone?: string;
}

export interface MemoryProfile {
  name: string;
  headline: string;
  summary: string;
  tags: string[];
  mbti: string;
  sections: { title: string; body: string }[];
}
