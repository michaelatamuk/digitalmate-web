import type { FeedCard, Language, Reaction } from '../types';

export type CardKind = 'article' | 'video' | 'discussion' | 'audio';

const VIDEO_SOURCES = new Set(['youtube', 'bilibili', 'twitch']);
const DISCUSSION_SOURCES = new Set(['x', 'reddit', 'zhihu', 'hackernews']);
const AUDIO_SOURCES = new Set(['applepodcasts', 'podcast']);

export function cardKind(card: Pick<FeedCard, 'kind' | 'source' | 'audioUrl'>): CardKind {
  if (card.kind) return card.kind;
  if (card.audioUrl) return 'audio';
  const source = card.source.toLowerCase();
  if (VIDEO_SOURCES.has(source)) return 'video';
  if (DISCUSSION_SOURCES.has(source)) return 'discussion';
  if (AUDIO_SOURCES.has(source)) return 'audio';
  return 'article';
}

export function dedupeCards(cards: FeedCard[]): FeedCard[] {
  const seen = new Set<string>();
  const output: FeedCard[] = [];
  for (const card of cards) {
    const url = card.url.trim().toLowerCase();
    const specificUrl = url && !/^https?:\/\/[^/]+\/?$/.test(url) && !/^https?:\/\/[^/]+\/?\?/.test(url);
    const key = specificUrl ? `url:${url}` : `title:${card.title.trim().toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(card);
  }
  return output;
}

export function rankCards(
  cards: FeedCard[],
  reactions: Record<string, Reaction>,
  saved: string[] = []
): FeedCard[] {
  return cards
    .map((card, index) => {
      const reaction = reactions[card.id];
      let score = 0;
      if (reaction === 'like') score += 3;
      if (reaction === 'dislike') score -= 3;
      if (reaction === 'save' || saved.includes(card.id)) score += 1;
      return { card, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(entry => entry.card);
}

const TOPIC_ALIASES: Record<string, string[]> = {
  'AI & Tech': ['ai', 'artificial intelligence', 'tech', 'technology', 'technology news'],
  'AI 科技': ['ai', '人工智能', '科技', '科技数码'],
  Robotics: ['robot', 'robotics', 'humanoid', '机器人', '具身智能'],
  'Open Source': ['open source', 'oss', 'github', '开源'],
  开源项目: ['open source', 'oss', 'github', '开源'],
  HarmonyOS: ['harmony', 'harmonyos', 'arkts', '鸿蒙'],
  鸿蒙开发: ['harmony', 'harmonyos', 'arkts', '鸿蒙'],
  'Product Design': ['design', 'product design', 'ux', '设计', '产品设计'],
  产品设计: ['design', 'product design', 'ux', '设计', '产品设计'],
  'City Life': ['city', 'urban', 'life', '城市', '城市生活'],
  城市生活: ['city', 'urban', 'life', '城市', '城市生活']
};

/**
 * Recognise a natural-language topic request such as
 * "show me more robotics and open-source projects".
 * Returns matching topic options, or null when the text is a normal search.
 */
export function parseTopicIntent(
  text: string,
  options: string[],
  _lang: Language = 'en'
): string[] | null {
  const normalized = text.toLowerCase().trim().replace(/[-_]+/g, ' ');
  if (!normalized) return null;
  const editIntent =
    /^(more|less|show|hide|follow|unfollow|add|remove|tune|调整|多|少|关注|取消|增加|减少)/.test(
      normalized
    ) ||
    /(more|less|show me|don't show|hide|follow|unfollow|多点|多看点|少点|不要|关注|取消关注)/.test(
      normalized
    );
  if (!editIntent) return null;

  const matches: string[] = [];
  for (const option of options) {
    const aliases = TOPIC_ALIASES[option] ?? [option];
    if (aliases.some(alias => normalized.includes(alias.toLowerCase()))) matches.push(option);
  }
  return matches.length > 0 ? Array.from(new Set(matches)) : null;
}
