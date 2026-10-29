import { describe, expect, it } from 'vitest';
import { a2uiPayloadFromEvent, BridgeSurfaceStream } from '../server/a2uiStream';

const create = {
  version: 'v0.9.1',
  createSurface: { surfaceId: 's1', root: 'root', title: 'Bridge surface' }
};
const components = {
  version: 'v0.9.1',
  updateComponents: {
    surfaceId: 's1',
    components: [
      { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Bridge surface' },
      { id: 'body', component: 'Text', dataPath: '/message' }
    ]
  }
};
const data = {
  version: 'v0.9.1',
  updateDataModel: { surfaceId: 's1', path: '/message', value: 'Hello' }
};

describe('bridge A2UI stream', () => {
  it('parses a JSONL batch and emits a surface', () => {
    const stream = new BridgeSurfaceStream();
    const surfaces = stream.apply([create, components, data].map(line => JSON.stringify(line)).join('\n'));
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0].title).toBe('Bridge surface');
    expect(surfaces[0].data.message).toBe('Hello');
  });

  it('keeps state across events and applies later updates', () => {
    const stream = new BridgeSurfaceStream();
    stream.apply([create, components]);
    const next = stream.apply({
      updateDataModel: { surfaceId: 's1', path: '/message', value: 'Updated' }
    });
    expect(next[0].data.message).toBe('Updated');
  });

  it('records parse errors without throwing', () => {
    const stream = new BridgeSurfaceStream();
    expect(stream.apply('{ not json')).toEqual([]);
    expect(stream.errors()[0].message).toMatch(/valid JSON/);
  });

  it('recognises the bridge event conventions', () => {
    expect(a2uiPayloadFromEvent({ a2ui: 'x' })).toBe('x');
    expect(a2uiPayloadFromEvent({ envelopes: [] })).toEqual([]);
    const event = { event: 'orbit.task.a2ui', data: { jsonl: 'line' } };
    expect(a2uiPayloadFromEvent(event)).toEqual({ jsonl: 'line' });
    expect(a2uiPayloadFromEvent({ event: 'orbit.task.text' })).toBeUndefined();
  });
});
