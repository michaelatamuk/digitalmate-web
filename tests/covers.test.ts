import { describe, expect, it } from 'vitest';
import { coverForCard, fallbackCoverForCard } from '../src/lib/covers';

describe('discovery covers', () => {
  it('maps topics and sources to local stock photos', () => {
    expect(coverForCard({ topic: 'AI & Tech', source: 'hackernews' })).toContain(
      '/covers/photos/open-source.jpg'
    );
    expect(coverForCard({ topic: 'AI 科技', source: 'seed' })).toContain('/covers/photos/ai.jpg');
    expect(coverForCard({ topic: '城市生活', source: 'seed' })).toContain('/covers/photos/city.jpg');
    expect(coverForCard({ topic: 'Anything', source: 'youtube' })).toContain(
      '/covers/photos/video.jpg'
    );
    expect(coverForCard({ topic: 'Anything', source: 'rss' })).toContain('/covers/rss.svg');
  });

  it('prefers a feed-provided image', () => {
    expect(
      coverForCard({ topic: 'AI', source: 'rss', image: 'https://example.com/photo.jpg' })
    ).toBe('https://example.com/photo.jpg');
  });

  it('provides an illustrated fallback for failed images', () => {
    expect(fallbackCoverForCard({ topic: 'AI 科技', source: 'seed' })).toContain('/covers/ai.svg');
    expect(fallbackCoverForCard({ topic: 'Anything', source: 'youtube' })).toContain(
      '/covers/video.svg'
    );
  });
});
