import { describe, expect, it } from 'vitest';
import { announce, subscribeAnnouncements, type Announcement } from '../src/lib/announce';

describe('accessibility announcements', () => {
  it('delivers a message with its politeness', () => {
    const seen: Announcement[] = [];
    const unsubscribe = subscribeAnnouncements(item => seen.push(item));

    announce('Task completed');
    announce('A Bee needs your answer', 'assertive');

    expect(seen).toEqual([
      { message: 'Task completed', politeness: 'polite' },
      { message: 'A Bee needs your answer', politeness: 'assertive' }
    ]);
    unsubscribe();
  });

  it('ignores empty messages but allows repeats', () => {
    const seen: Announcement[] = [];
    const unsubscribe = subscribeAnnouncements(item => seen.push(item));

    announce('   ');
    announce('Saved');
    announce('Saved');

    expect(seen.map(item => item.message)).toEqual(['Saved', 'Saved']);
    unsubscribe();
  });

  it('stops delivering after unsubscribe', () => {
    const seen: Announcement[] = [];
    const unsubscribe = subscribeAnnouncements(item => seen.push(item));
    unsubscribe();

    announce('Ignored');
    expect(seen).toHaveLength(0);
  });

  it('supports several listeners', () => {
    let first = 0;
    let second = 0;
    const offFirst = subscribeAnnouncements(() => {
      first += 1;
    });
    const offSecond = subscribeAnnouncements(() => {
      second += 1;
    });

    announce('Ready');
    expect(first).toBe(1);
    expect(second).toBe(1);
    offFirst();
    offSecond();
  });
});
