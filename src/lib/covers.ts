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

export function coverForCard(card: Pick<FeedCard, 'topic' | 'source' | 'image'>): string {
  if (card.image) return card.image;
  const source = card.source.toLowerCase();
  const name = SOURCE_COVERS[source] ?? TOPIC_COVERS[card.topic] ?? 'ai';
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/covers/${name}.svg`;
}
