import { describe, expect, it } from 'vitest';
import { buildCalendarIcs, escapeText, icsFilename } from '../src/lib/calendarIcs';

const START = new Date(2026, 10, 16, 15, 0, 0); // 16 Nov 2026, 15:00 local

describe('calendar .ics export', () => {
  it('writes a floating local event with an end time', () => {
    const ics = buildCalendarIcs(
      { title: 'Review', start: START, durationMinutes: 45 },
      new Date(Date.UTC(2026, 10, 16, 7, 0, 0))
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261116T150000');
    expect(ics).toContain('DTEND:20261116T154500');
    expect(ics).toContain('DTSTAMP:20261116T070000Z');
    expect(ics).toContain('SUMMARY:Review');
    expect(ics.endsWith('\r\n')).toBe(true);
    // CRLF everywhere, as the spec requires.
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('escapes reserved characters in text values', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
    const ics = buildCalendarIcs({ title: 'A, B; C', start: START, durationMinutes: 30 });
    expect(ics).toContain('SUMMARY:A\\, B\\; C');
  });

  it('folds lines longer than 75 octets', () => {
    const title = 'Long '.repeat(30).trim();
    const ics = buildCalendarIcs({ title, start: START, durationMinutes: 30 });
    const lines = ics.split('\r\n');
    const startIndex = lines.findIndex(line => line.startsWith('SUMMARY:'));
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(lines[startIndex].length).toBeLessThanOrEqual(75);
    expect(lines[startIndex + 1]?.startsWith(' ')).toBe(true);
    // Unfolding restores the original value.
    let unfolded = lines[startIndex];
    let index = startIndex + 1;
    while (lines[index]?.startsWith(' ')) {
      unfolded += lines[index].slice(1);
      index += 1;
    }
    expect(unfolded).toBe(`SUMMARY:${title}`);
  });

  it('falls back to a 30 minute event for nonsense durations', () => {
    const ics = buildCalendarIcs({ title: 'Short', start: START, durationMinutes: 0 });
    expect(ics).toContain('DTEND:20261116T153000');
  });

  it('builds a recognisable filename', () => {
    expect(icsFilename('Quarterly review', START)).toBe('quarterly-review-20261116.ics');
    expect(icsFilename('   ', START)).toBe('digitalmate-20261116.ics');
    expect(icsFilename('评审会议', START)).toBe('评审会议-20261116.ics');
  });
});
