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

describe('extended scenarios', () => {
  it('returns hotel options with refundable tags', () => {
    const reply = replyFor('Find a hotel in Shenzhen for two nights', 'en');
    expect(reply.surface?.title).toBe('Hotel options');
    const hotels = reply.surface?.data.hotels as Array<Record<string, unknown>>;
    expect(hotels.length).toBeGreaterThan(0);
    expect(hotels.some(hotel => (hotel.tags as string[]).includes('Free cancellation'))).toBe(true);
    expect(reply.surface?.components.hotels.component).toBe('HotelOptions');
  });

  it('returns ride estimates without placing a ride', () => {
    const reply = replyFor('Book a taxi to Shenzhen airport', 'en');
    expect(reply.surface?.title).toBe('Ride options');
    const rides = reply.surface?.data.rides as Array<Record<string, string>>;
    expect(rides.map(ride => ride.provider)).toContain('DiDi Express');
    expect(reply.text.toLowerCase()).toContain('estimates');
  });

  it('returns a payment review that has not charged anything', () => {
    const reply = replyFor('Check the payment for my order', 'en');
    expect(reply.surface?.title).toBe('Payment check');
    expect(reply.surface?.components.payment.component).toBe('PaymentCard');
    expect(reply.surface?.data.payment).toMatchObject({ amount: '¥26.00', status: 'Awaiting confirmation' });
  });

  it('localizes the new scenarios for Chinese prompts', () => {
    const hotel = replyFor('帮我订深圳的酒店', 'zh');
    const ride = replyFor('帮我叫车去机场', 'zh');
    const payment = replyFor('查看订单支付', 'zh');
    const media = replyFor('推荐一些播客', 'zh');
    expect(hotel.surface?.title).toBe('酒店方案');
    expect(ride.surface?.title).toBe('打车方案');
    expect(payment.surface?.title).toBe('支付确认');
    expect(media.surface?.title).toBe('媒体精选');
  });

  it('returns a media slider surface', () => {
    const reply = replyFor('Recommend a podcast for my commute', 'en');
    expect(reply.surface?.title).toBe('Media highlights');
    expect(reply.surface?.components.media.component).toBe('MediaSlider');
    expect(reply.surface?.data.media).toHaveLength(4);
  });

  it('returns a weekly insights surface with charts', () => {
    const reply = replyFor('Show my weekly insights report', 'en');
    expect(reply.surface?.title).toBe('Weekly insights');
    expect(reply.surface?.components.mix.component).toBe('SegmentedRingChart');
    expect(reply.surface?.components.activity.component).toBe('MultiSeriesLineChart');
    expect(reply.surface?.components.focus.component).toBe('MatrixHeatmap');
    expect(reply.surface?.data.taskMix).toHaveLength(4);
    expect((reply.surface?.data.focus as Record<string, unknown>).values).toHaveLength(5);
  });

  it('localizes the weekly insights scenario', () => {
    const reply = replyFor('看看每周洞察', 'zh');
    expect(reply.surface?.title).toBe('每周洞察');
    expect(reply.surface?.components.mix.title).toBe('任务构成');
  });

  it('returns a daily brief with schedule and priorities', () => {
    const reply = replyFor('Show my daily brief', 'en');
    expect(reply.surface?.title).toBe('Daily brief');
    expect(reply.surface?.components.hero.component).toBe('HeroBanner');
    expect(reply.surface?.components.priorities.component).toBe('List');
    expect(reply.surface?.data.priorities).toHaveLength(3);
    expect(reply.surface?.data.schedule).toHaveLength(3);
  });

  it('localizes the daily brief', () => {
    const reply = replyFor('看看今日简报', 'zh');
    expect(reply.surface?.title).toBe('每日简报');
    expect(reply.surface?.components.priorities.title).toBe('优先事项');
  });

  it('returns a local shopping checklist', () => {
    const reply = replyFor('Make a grocery shopping list', 'en');
    expect(reply.surface?.title).toBe('Shopping list');
    expect(reply.surface?.components.checklist.component).toBe('Checklist');
    expect(reply.surface?.data.items).toHaveLength(5);
  });

  it('localizes the shopping list', () => {
    const reply = replyFor('帮我做个购物清单', 'zh');
    expect(reply.surface?.title).toBe('购物清单');
    expect(reply.surface?.components.checklist.title).toBe('待购买');
  });

  it('returns an approval and quota surface', () => {
    const reply = replyFor('Show the approval and connection quota', 'en');
    expect(reply.surface?.title).toBe('Approval & connection');
    expect(reply.surface?.components.approval.component).toBe('ApprovalCard');
    expect(reply.surface?.components.quota.component).toBe('ConnectionQuotaCard');
  });

  it('returns an explicit failure state with no side effects', () => {
    const reply = replyFor('The train is sold out', 'en');
    expect(reply.surface?.title).toBe('Action unavailable');
    expect(reply.surface?.components.error.component).toBe('ErrorNotice');
    expect(reply.text.toLowerCase()).toContain('nothing was reserved');
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
