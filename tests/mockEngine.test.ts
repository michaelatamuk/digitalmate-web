import { describe, expect, it } from 'vitest';
import { replyFor } from '../src/lib/mockEngine';
import { seedFor } from '../src/data/seed';
import { surfacesFor } from '../src/data/surfaces';
import type { CalendarEvent } from '../src/types';

const trainPrompt = 'Find trains from Beijing to Shanghai tomorrow evening';
const chineseTrainPrompt = '帮我查明天傍晚北京到上海的高铁';

describe('mock engine', () => {
  it('returns a travel surface with train and flight sources', () => {
    const reply = replyFor(trainPrompt, 'en');
    expect(reply.surface?.title).toBe('Travel options');
    expect(reply.surface?.data.options).toHaveLength(4);
    const options = reply.surface?.data.options as Array<Record<string, string>>;
    expect(options.some(option => option.sourceTag.includes('12306'))).toBe(true);
    expect(options.some(option => option.sourceTag.includes('VariFlight'))).toBe(true);
  });

  it('returns Chinese surfaces for Chinese prompts', () => {
    const reply = replyFor(chineseTrainPrompt, 'zh');
    expect(reply.surface?.title).toBe('出行方案');
    const summary = reply.surface?.data.summary as Array<Record<string, string>>;
    expect(summary.some(row => row.value.includes('北京'))).toBe(true);
  });

  it('supports a trains-only refinement', () => {
    const reply = replyFor('Show only trains', 'en');
    expect(reply.surface?.title).toBe('Train options');
    const trains = reply.surface?.data.trains as Array<Record<string, string>>;
    expect(trains.every(train => train.sourceTag.includes('12306'))).toBe(true);
  });

  it('returns food cards with source tags', () => {
    const reply = replyFor('Find coffee shops near the Bantian Huawei campus in Shenzhen', 'en');
    expect(reply.surface?.title).toBe('Coffee nearby');
    const foods = reply.surface?.data.foods as Array<Record<string, unknown>>;
    expect(foods.length).toBeGreaterThan(0);
    expect(Array.isArray(foods[0].sourceTags)).toBe(true);
  });

  it('falls back to the demo guidance for unknown tasks', () => {
    const reply = replyFor('xyzzy', 'en');
    expect(reply.text.toLowerCase()).toContain('mock-first');
    expect(reply.surface).toBeUndefined();
  });
});

describe('calendar surfaces', () => {
  it('appends locally created events', () => {
    const event: CalendarEvent = {
      id: 'event-test',
      time: '15:00',
      title: 'Review · A2UI cards',
      meta: '30 min · Added in demo',
      tone: 'accent'
    };
    const surface = surfacesFor('en').calendarSurface([event]);
    const schedule = surface.data.schedule as Array<Record<string, string>>;
    expect(schedule.some(row => row.title === event.title)).toBe(true);
    expect(schedule).toHaveLength(4);
  });

  it('localizes the calendar for Chinese', () => {
    const surface = surfacesFor('zh').calendarSurface();
    expect(surface.title).toBe('本周日程');
  });
});

describe('localized seed data', () => {
  it('switches discovery topics and card content', () => {
    expect(seedFor('en').topicOptions[0]).toBe('AI & Tech');
    expect(seedFor('zh').topicOptions[0]).toBe('AI 科技');
    expect(seedFor('zh').seedCards[0].title).not.toBe(seedFor('en').seedCards[0].title);
  });

  it('keeps skill identifiers stable across languages', () => {
    const english = seedFor('en').seedSkills.map(skill => skill.id);
    const chinese = seedFor('zh').seedSkills.map(skill => skill.id);
    expect(chinese).toEqual(english);
  });
});
