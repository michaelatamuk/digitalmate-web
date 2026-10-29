import { describe, expect, it } from 'vitest';
import { seedFor } from '../src/data/seed';
import { filterDiscoveryCards, LocalDiscoveryTransport, rotateCards } from '../src/transport/discovery';
import type { FeedCard } from '../src/types';

const card = (id: string, overrides: Partial<FeedCard> = {}): FeedCard => ({
  id,
  source: 'seed',
  sourceLabel: 'Seed',
  topic: 'AI',
  title: `Card ${id}`,
  summary: 'Summary',
  glyph: 'C',
  cover: '#fff',
  readingTime: '2 min',
  published: 'Today',
  url: `https://example.com/${id}`,
  body: ['Body'],
  tags: ['tag'],
  metric: 'metric',
  ...overrides
});

describe('DiscoveryTransport', () => {
  it('rotates cards without mutating the source', () => {
    const cards = [card('1'), card('2'), card('3')];
    expect(rotateCards(cards, 1).map(item => item.id)).toEqual(['2', '3', '1']);
    expect(rotateCards(cards, 0).map(item => item.id)).toEqual(['1', '2', '3']);
    expect(cards.map(item => item.id)).toEqual(['1', '2', '3']);
  });

  it('loads RSS cards before seed cards and applies rotation', async () => {
    const transport = new LocalDiscoveryTransport([card('seed')], [card('rss', { source: 'rss' })], 1);
    const cards = await transport.load();
    expect(cards.map(item => item.id)).toEqual(['seed', 'rss']);
    expect(transport.id).toBe('local');
  });

  it('filters by source, topics and query', () => {
    const cards = [
      card('1', { source: 'rss', topic: 'AI', title: 'Coffee guide', tags: ['coffee'] }),
      card('2', { source: 'seed', topic: 'Travel', title: 'Train options' })
    ];
    expect(filterDiscoveryCards(cards, { source: 'rss' }).map(item => item.id)).toEqual(['1']);
    expect(filterDiscoveryCards(cards, { topics: ['Travel'] }).map(item => item.id)).toEqual(['2']);
    expect(filterDiscoveryCards(cards, { query: 'coffee' }).map(item => item.id)).toEqual(['1']);
    expect(filterDiscoveryCards(cards, { source: 'all', query: 'TRAIN' }).map(item => item.id)).toEqual([
      '2'
    ]);
  });

  it('works with the real localized seed inventory', async () => {
    const transport = new LocalDiscoveryTransport(seedFor('en').seedCards);
    const cards = await transport.load();
    expect(cards.length).toBeGreaterThan(0);
    expect(transport.filter(cards, { source: cards[0].source }).length).toBeGreaterThan(0);
  });
});
