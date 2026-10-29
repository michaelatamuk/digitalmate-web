import { describe, expect, it } from 'vitest';
import {
  createSkillBundle,
  mergeSkills,
  parseSkillBundle,
  serializeSkillBundle,
  SKILL_BUNDLE_APP
} from '../src/lib/skillBundle';
import type { Skill } from '../src/types';

const skill: Skill = {
  id: 'custom',
  name: 'Custom skill',
  icon: 'C',
  category: 'Local',
  description: 'Does a local thing.',
  author: 'Tester',
  installed: true,
  enabled: true,
  builtin: false,
  version: '1.2.0',
  capabilities: ['Read text', 'Summarize']
};

describe('skill bundles', () => {
  it('round-trips a local bundle', () => {
    const bundle = createSkillBundle([skill], new Date('2026-10-29T10:00:00Z'));
    expect(bundle).toMatchObject({ app: SKILL_BUNDLE_APP, kind: 'skills', version: 1 });
    const parsed = parseSkillBundle(serializeSkillBundle(bundle));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: 'custom',
      name: 'Custom skill',
      version: '1.2.0',
      capabilities: ['Read text', 'Summarize'],
      installed: true,
      enabled: true,
      builtin: false
    });
  });

  it('sanitizes imported ids and forces install state', () => {
    const text = JSON.stringify({
      app: SKILL_BUNDLE_APP,
      kind: 'skills',
      version: 1,
      skills: [
        {
          name: '  Dangerous / name  ',
          id: 'weird id<script>',
          category: 'Local',
          builtin: true,
          installed: false,
          enabled: false
        }
      ]
    });
    const parsed = parseSkillBundle(text);
    expect(parsed[0].id).toBe('weird-id-script-');
    expect(parsed[0].name).toBe('Dangerous / name');
    expect(parsed[0].builtin).toBe(false);
    expect(parsed[0].installed).toBe(true);
    expect(parsed[0].enabled).toBe(true);
  });

  it('rejects foreign, empty and malformed bundles', () => {
    expect(() => parseSkillBundle('nope')).toThrow(/valid JSON/);
    expect(() => parseSkillBundle('{}')).toThrow(/not a DigitalMate skill bundle/);
    expect(() =>
      parseSkillBundle(JSON.stringify({ app: SKILL_BUNDLE_APP, kind: 'skills', version: 9, skills: [] }))
    ).toThrow(/version/);
    expect(() =>
      parseSkillBundle(JSON.stringify({ app: SKILL_BUNDLE_APP, kind: 'skills', version: 1, skills: [] }))
    ).toThrow(/no skills/);
  });

  it('merges by id without duplicating', () => {
    const existing: Skill[] = [skill, { ...skill, id: 'other', name: 'Other' }];
    const merged = mergeSkills(existing, [{ ...skill, name: 'Updated', installed: false, enabled: false }]);
    expect(merged).toHaveLength(2);
    expect(merged.find(item => item.id === 'custom')?.name).toBe('Updated');
    expect(merged.find(item => item.id === 'custom')?.installed).toBe(true);
  });
});
