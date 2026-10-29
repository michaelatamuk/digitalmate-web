import type { A2uiComponent } from '../../types';
import type { A2uiEnvelope, A2uiParseError, A2uiParseResult } from './types';

const ENVELOPE_KEYS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseA2uiLine(line: string): A2uiEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error('Line is not valid JSON');
  }
  if (!isObject(value)) throw new Error('Envelope must be an object');

  const present = ENVELOPE_KEYS.filter(key => value[key] !== undefined);
  if (present.length !== 1) {
    throw new Error('Envelope must contain exactly one of createSurface, updateComponents, updateDataModel or deleteSurface');
  }

  const key = present[0];
  const payload = value[key];
  if (!isObject(payload)) throw new Error(`${key} must be an object`);
  if (!nonEmptyString(payload.surfaceId)) throw new Error(`${key}.surfaceId is required`);

  if (key === 'createSurface') {
    if (!nonEmptyString(payload.root)) throw new Error('createSurface.root is required');
  } else if (key === 'updateComponents') {
    if (!Array.isArray(payload.components)) throw new Error('updateComponents.components must be an array');
    for (const component of payload.components) {
      if (!isObject(component) || !nonEmptyString(component.id) || !nonEmptyString(component.component)) {
        throw new Error('Each component needs id and component');
      }
    }
  } else if (key === 'updateDataModel') {
    if (!nonEmptyString(payload.path)) throw new Error('updateDataModel.path is required');
    if (payload.value === undefined) throw new Error('updateDataModel.value is required');
  }

  return value as A2uiEnvelope;
}

export function parseA2uiJsonl(text: string): A2uiParseResult {
  const envelopes: A2uiEnvelope[] = [];
  const errors: A2uiParseError[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      envelopes.push(parseA2uiLine(trimmed));
    } catch (error) {
      errors.push({
        line: index + 1,
        message: error instanceof Error ? error.message : 'Invalid envelope'
      });
    }
  });

  return { envelopes, errors };
}

export function componentMap(components: A2uiComponent[]): Record<string, A2uiComponent> {
  const map: Record<string, A2uiComponent> = {};
  for (const component of components) {
    if (Object.prototype.hasOwnProperty.call(map, component.id)) {
      throw new Error(`Duplicate component id: ${component.id}`);
    }
    map[component.id] = component;
  }
  return map;
}

export function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function encodePointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Parse a JSON Pointer. Our convention treats '' and '/' as the document root. */
export function parsePointer(path: string): string[] | null {
  if (path === '' || path === '/') return [];
  if (!path.startsWith('/')) return null;
  return path.slice(1).split('/').map(decodePointerSegment);
}

function assign(container: Record<string, unknown> | unknown[], key: string, value: unknown): void {
  if (Array.isArray(container)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid array index: ${key}`);
    container[index] = value;
  } else {
    container[key] = value;
  }
}

export function setDataPath(data: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = parsePointer(path);
  if (segments === null) throw new Error('JSON Pointer must start with /');
  if (segments.length === 0) {
    return { ...((value && typeof value === 'object' ? value : {}) as Record<string, unknown>) };
  }

  const root: Record<string, unknown> = { ...data };
  let current: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const next: unknown = Array.isArray(current)
      ? current[Number(segment)]
      : current[segment];
    let copy: Record<string, unknown> | unknown[];
    if (next !== null && typeof next === 'object') {
      copy = Array.isArray(next) ? [...next] : { ...(next as Record<string, unknown>) };
    } else {
      copy = /^\d+$/.test(segments[index + 1]) ? [] : {};
    }
    assign(current, segment, copy);
    current = copy;
  }

  const finalKey = segments[segments.length - 1];
  if (Array.isArray(current) && finalKey === '-') {
    current.push(value);
  } else {
    assign(current, finalKey, value);
  }
  return root;
}

export function removeDataPath(data: Record<string, unknown>, path: string): Record<string, unknown> {
  const segments = parsePointer(path);
  if (segments === null) throw new Error('JSON Pointer must start with /');
  if (segments.length === 0) return {};

  const root: Record<string, unknown> = { ...data };
  let current: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const next: unknown = Array.isArray(current)
      ? current[Number(segments[index])]
      : current[segments[index]];
    if (next === null || typeof next !== 'object') return root;
    const copy: Record<string, unknown> | unknown[] = Array.isArray(next)
      ? [...next]
      : { ...(next as Record<string, unknown>) };
    assign(current, segments[index], copy);
    current = copy;
  }

  const finalKey = segments[segments.length - 1];
  if (Array.isArray(current)) {
    if (finalKey === '-') return root;
    const index = Number(finalKey);
    if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid array index: ${finalKey}`);
    current.splice(index, 1);
  } else {
    delete current[finalKey];
  }
  return root;
}
