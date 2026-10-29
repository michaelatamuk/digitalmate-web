import { describe, expect, it } from 'vitest';
import { cardKind, dedupeCards, parseTopicIntent, rankCards } from '../src/lib/discoveryExperience';
import type { FeedCard } from '../src/types';

const card = (id: string, source = 'rss', extra: Partial<FeedCard> = {}): FeedCard => ({
  id,
  source,
  sourceLabel: source,
  topic: 'AI & Tech',
  title: id,
  summary: '',
  glyph: '',
  cover: '',
  readingTime: '1 min',
  published: 'now',
  url: '',
  body: [],
  tags: [],
  metric: '',
  ...extra
});

describe('discovery experience', () => {
  it('infers card kinds from sources and audio URLs', () => {
    expect(cardKind(card('a', 'youtube'))).toBe('video');
    expect(cardKind(card('b', 'reddit'))).toBe('discussion');
    expect(cardKind(card('c', 'rss', { audioUrl: 'https://example.com/a.mp3' }))).toBe('audio');
    expect(cardKind(card('d', 'rss'))).toBe('article');
    expect(cardKind(card('e', 'rss', { kind: 'discussion' }))).toBe('discussion');
  });

  it('ranks liked and saved cards above disliked cards but stays stable otherwise', () => {
    const cards = [card('a'), card('b'), card('c'), card('d')];
    const ranked = rankCards(cards, { a: 'dislike', c: 'like', d: 'save' }, ['d']);
    expect(ranked.map(item => item.id)).toEqual(['c', 'd', 'b', 'a']);
  });

  it('deduplicates by URL or title', () => {
    const cards = [
      card('a', 'rss', { url: 'https://example.com/x' }),
      card('b', 'rss', { url: 'https://example.com/x' }),
      card('c', 'rss', { url: '', title: 'Same title' }),
      card('d', 'rss', { url: '', title: 'Same title' })
    ];
    expect(dedupeCards(cards).map(item => item.id)).toEqual(['a', 'c']);
  });

  it('parses natural-language topic edits', () => {
    const options = ['AI & Tech', 'Robotics', 'Open Source', 'HarmonyOS', 'Product Design', 'City Life'];
    expect(parseTopicIntent('show me more robotics and open-source projects', options)).toEqual([
      'Robotics',
      'Open Source'
    ]);
    expect(parseTopicIntent('我要多看点机器人和开源项目', ['AI 科技', '机器人', '开源项目'])).toEqual([
      '机器人',
      '开源项目'
    ]);
    expect(parseTopicIntent('find coffee nearby', options)).toBeNull();
    expect(parseTopicIntent('helicopter', options)).toBeNull();
  });
});
