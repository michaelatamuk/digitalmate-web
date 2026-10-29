import type { MemoryProfile } from '../types';

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseMemoryProfile(raw: string): MemoryProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Profile is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Profile must be a JSON object');
  }
  const value = parsed as Record<string, unknown>;
  const name = text(value.name);
  if (!name) throw new Error('Profile needs a name');

  const sections = Array.isArray(value.sections)
    ? value.sections
        .filter(
          (section): section is Record<string, unknown> =>
            section !== null && typeof section === 'object' && !Array.isArray(section)
        )
        .slice(0, 12)
        .map(section => ({
          title: text(section.title, 'Untitled'),
          body: text(section.body),
          ...(text(section.evidence) ? { evidence: text(section.evidence) } : {})
        }))
        .filter(section => section.title || section.body)
    : [];

  return {
    name: name.slice(0, 80),
    headline: text(value.headline, 'Imported profile').slice(0, 160),
    summary: text(value.summary).slice(0, 800),
    tags: tags(value.tags),
    mbti: text(value.mbti, '—').slice(0, 32),
    sections
  };
}
