import { describe, expect, it } from 'vitest';
import { coverForCard } from '../src/lib/covers';

describe('discovery covers', () => {
  it('maps topics and sources to local cover assets', () => {
    expect(coverForCard({ topic: 'AI & Tech', source: 'hackernews' })).toContain('/covers/open-source.svg');
    expect(coverForCard({ topic: 'AI 科技', source: 'seed' })).toContain('/covers/ai.svg');
    expect(coverForCard({ topic: '城市生活', source: 'seed' })).toContain('/covers/city.svg');
    expect(coverForCard({ topic: 'Anything', source: 'youtube' })).toContain('/covers/video.svg');
    expect(coverForCard({ topic: 'Anything', source: 'rss' })).toContain('/covers/rss.svg');
  });

  it('prefers a feed-provided image', () => {
    expect(
      coverForCard({ topic: 'AI', source: 'rss', image: 'https://example.com/photo.jpg' })
    ).toBe('https://example.com/photo.jpg');
  });
});
