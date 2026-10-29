import type { FeedCard } from '../types';

const TOPIC_COVERS: Record<string, string> = {
  'AI & Tech': 'ai',
  'AI 科技': 'ai',
  Robotics: 'robotics',
  机器人: 'robotics',
  'Open Source': 'open-source',
  开源项目: 'open-source',
  HarmonyOS: 'harmony',
  鸿蒙开发: 'harmony',
  'Product Design': 'design',
  产品设计: 'design',
  'City Life': 'city',
  城市生活: 'city'
};

const SOURCE_COVERS: Record<string, string> = {
  youtube: 'video',
  bilibili: 'video',
  x: 'social',
  reddit: 'social',
  rss: 'rss',
  hackernews: 'open-source'
};

const PHOTO_NAMES = new Set([
  'ai',
  'robotics',
  'open-source',
  'harmony',
  'design',
  'city',
  'video',
  'social'
]);

function basePath(): string {
  return import.meta.env.BASE_URL || '/';
}

function coverName(card: Pick<FeedCard, 'topic' | 'source'>): string {
  return TOPIC_COVERS[card.topic] ?? SOURCE_COVERS[card.source.toLowerCase()] ?? 'ai';
}

/** Article image when the feed provides one, otherwise a local stock photo. */
export function coverForCard(card: Pick<FeedCard, 'topic' | 'source' | 'image'>): string {
  if (card.image) return card.image;
  const name = coverName(card);
  const base = basePath().replace(/\/$/, '');
  if (PHOTO_NAMES.has(name)) return `${base}/covers/photos/${name}.jpg`;
  return `${base}/covers/${name}.svg`;
}

/** Illustrated fallback used when a photo or remote article image fails to load. */
export function fallbackCoverForCard(card: Pick<FeedCard, 'topic' | 'source'>): string {
  const base = basePath().replace(/\/$/, '');
  return `${base}/covers/${coverName(card)}.svg`;
}
