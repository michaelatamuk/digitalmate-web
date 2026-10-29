import type { Skill } from '../types';

export const SKILL_BUNDLE_APP = 'digitalmate-web';
export const SKILL_BUNDLE_VERSION = 1;
export const MAX_IMPORTED_SKILLS = 50;

export interface SkillBundle {
  app: typeof SKILL_BUNDLE_APP;
  kind: 'skills';
  version: number;
  exportedAt: string;
  skills: Skill[];
}

export function createSkillBundle(skills: Skill[], now = new Date()): SkillBundle {
  return {
    app: SKILL_BUNDLE_APP,
    kind: 'skills',
    version: SKILL_BUNDLE_VERSION,
    exportedAt: now.toISOString(),
    skills: skills.map(skill => ({
      ...skill,
      capabilities: skill.capabilities ? [...skill.capabilities] : undefined
    }))
  };
}

export function serializeSkillBundle(bundle: SkillBundle): string {
  return JSON.stringify(bundle, null, 2);
}

function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 20);
  return items.length ? items : undefined;
}

export function parseSkillBundle(text: string): Skill[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Skill bundle is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Skill bundle must be a JSON object');
  }
  const value = parsed as Record<string, unknown>;
  if (value.app !== SKILL_BUNDLE_APP || value.kind !== 'skills') {
    throw new Error('This is not a DigitalMate skill bundle');
  }
  if (value.version !== SKILL_BUNDLE_VERSION) {
    throw new Error('Unsupported skill bundle version');
  }
  if (!Array.isArray(value.skills) || value.skills.length === 0) {
    throw new Error('Skill bundle contains no skills');
  }

  const skills: Skill[] = [];
  for (const entry of value.skills.slice(0, MAX_IMPORTED_SKILLS)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const name = string(record.name);
    if (!name) continue;
    const rawId = string(record.id) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = rawId.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 64);
    if (!id) continue;
    skills.push({
      id,
      name: name.slice(0, 80),
      icon: string(record.icon, 'S').slice(0, 4),
      category: string(record.category, 'Imported').slice(0, 40),
      description: string(record.description).slice(0, 600),
      author: string(record.author, 'Local import').slice(0, 60),
      installed: true,
      enabled: true,
      builtin: false,
      version: string(record.version, '1.0.0').slice(0, 24),
      capabilities: optionalStringArray(record.capabilities)
    });
  }

  if (skills.length === 0) throw new Error('Skill bundle contained no usable skills');
  return skills;
}

export function mergeSkills(existing: Skill[], imported: Skill[]): Skill[] {
  const map = new Map(existing.map(skill => [skill.id, skill]));
  for (const skill of imported) {
    map.set(skill.id, { ...skill, builtin: false, installed: true, enabled: true });
  }
  return Array.from(map.values());
}
