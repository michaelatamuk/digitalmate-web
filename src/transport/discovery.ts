import type { FeedCard } from '../types';

export interface DiscoveryFilters {
  source?: string;
  topics?: string[];
  query?: string;
}

export interface DiscoveryTransport {
  readonly id: string;
  load(): Promise<FeedCard[]>;
  filter(cards: FeedCard[], filters: DiscoveryFilters): FeedCard[];
}

export function rotateCards(cards: FeedCard[], offset: number): FeedCard[] {
  if (offset === 0 || cards.length === 0) return [...cards];
  const index = Math.abs(offset) % cards.length;
  return [...cards.slice(index), ...cards.slice(0, index)];
}

export function filterDiscoveryCards(cards: FeedCard[], filters: DiscoveryFilters): FeedCard[] {
  const needle = filters.query?.trim().toLowerCase() ?? '';
  return cards.filter(card => {
    if (filters.source && filters.source !== 'all' && card.source !== filters.source) return false;
    if (filters.topics && filters.topics.length > 0 && !filters.topics.includes(card.topic)) return false;
    if (!needle) return true;
    const haystack = [card.title, card.summary, card.sourceLabel, card.topic, ...card.tags]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** Account-free local discovery: seeded inventory plus RSS cards stored in the browser. */
export class LocalDiscoveryTransport implements DiscoveryTransport {
  readonly id = 'local';

  constructor(
    private readonly seedCards: FeedCard[],
    private readonly rssCards: FeedCard[] = [],
    private readonly offset = 0
  ) {}

  async load(): Promise<FeedCard[]> {
    return rotateCards([...this.rssCards, ...this.seedCards], this.offset);
  }

  filter(cards: FeedCard[], filters: DiscoveryFilters): FeedCard[] {
    return filterDiscoveryCards(cards, filters);
  }
}
