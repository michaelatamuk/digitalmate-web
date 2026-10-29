import { describe, expect, it } from 'vitest';
import { parseMemoryProfile } from '../src/lib/memoryProfile';

describe('public memory profile import', () => {
  it('parses a valid local profile', () => {
    const profile = parseMemoryProfile(
      JSON.stringify({
        name: 'Ada',
        headline: 'Local-first designer',
        summary: 'Likes evidence.',
        tags: ['design', ' offline ', ''],
        mbti: 'INTJ',
        sections: [
          { title: 'Work', body: 'Design systems', evidence: 'Imported file' },
          { title: '', body: '', evidence: '' }
        ]
      })
    );
    expect(profile.name).toBe('Ada');
    expect(profile.tags).toEqual(['design', 'offline']);
    expect(profile.sections).toEqual([
      { title: 'Work', body: 'Design systems', evidence: 'Imported file' }
    ]);
  });

  it('rejects invalid or unnamed profiles', () => {
    expect(() => parseMemoryProfile('nope')).toThrow(/valid JSON/);
    expect(() => parseMemoryProfile('[]')).toThrow(/JSON object/);
    expect(() => parseMemoryProfile(JSON.stringify({ headline: 'No name' }))).toThrow(/name/);
  });
});
