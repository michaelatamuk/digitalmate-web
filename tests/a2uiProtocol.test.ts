import { describe, expect, it } from 'vitest';
import { parseA2uiJsonl, parseA2uiLine, removeDataPath, setDataPath } from '../src/protocol/a2ui/parser';
import { A2uiSurfaceStore } from '../src/protocol/a2ui/store';
import { A2uiUpdateQueue, coalesceEnvelopes } from '../src/protocol/a2ui/queue';
import { protocolDemoSurface } from '../src/protocol/a2ui/demo';

const jsonl = (...values: unknown[]): string => values.map(value => JSON.stringify(value)).join('\n');

describe('A2UI JSONL parser', () => {
  it('parses a valid create → components → data stream', () => {
    const text = jsonl(
      { version: 'v0.9.1', createSurface: { surfaceId: 's1', root: 'root', title: 'Demo' } },
      {
        version: 'v0.9.1',
        updateComponents: {
          surfaceId: 's1',
          components: [
            { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Demo' },
            { id: 'body', component: 'Text', text: 'Hello' }
          ]
        }
      },
      { version: 'v0.9.1', updateDataModel: { surfaceId: 's1', path: '/items', value: [1, 2] } }
    );

    const result = parseA2uiJsonl(text);
    expect(result.errors).toEqual([]);
    expect(result.envelopes).toHaveLength(3);
  });

  it('records invalid lines without dropping valid ones', () => {
    const text = [
      JSON.stringify({ createSurface: { surfaceId: 's1', root: 'root' } }),
      '{ not json',
      JSON.stringify({ updateDataModel: { surfaceId: 's1', path: '/x' } }),
      '',
      JSON.stringify({ createSurface: { surfaceId: 's2', root: 'root' }, deleteSurface: { surfaceId: 's2' } })
    ].join('\n');

    const result = parseA2uiJsonl(text);
    expect(result.envelopes).toHaveLength(1);
    expect(result.errors.map(error => error.line)).toEqual([2, 3, 5]);
  });

  it('rejects envelopes without a surface id', () => {
    expect(() => parseA2uiLine(JSON.stringify({ createSurface: { root: 'root' } }))).toThrow(/surfaceId/);
  });
});

describe('A2UI surface store', () => {
  const base = jsonl(
    { createSurface: { surfaceId: 's1', root: 'root', title: 'Demo' } },
    {
      updateComponents: {
        surfaceId: 's1',
        components: [
          { id: 'root', component: 'SurfaceRoot', child: 'body' },
          { id: 'body', component: 'InfoRows', dataPath: '/rows' }
        ]
      }
    },
    { updateDataModel: { surfaceId: 's1', path: '/rows', value: [{ label: 'A', value: '1' }] } }
  );

  it('builds a renderable surface', () => {
    const store = A2uiSurfaceStore.fromJsonl(base);
    const surface = store.get('s1');
    expect(surface?.root).toBe('root');
    expect(surface?.components.body.component).toBe('InfoRows');
    expect(surface?.data.rows).toEqual([{ label: 'A', value: '1' }]);
    expect(store.getErrors()).toEqual([]);
  });

  it('applies nested data-model updates immutably', () => {
    const store = A2uiSurfaceStore.fromJsonl(base);
    store.apply({ updateDataModel: { surfaceId: 's1', path: '/profile/name', value: 'Ada' } });
    const surface = store.get('s1');
    expect(surface?.data.profile).toEqual({ name: 'Ada' });
    expect(surface?.data.rows).toEqual([{ label: 'A', value: '1' }]);
  });

  it('replaces components and removes a surface on delete', () => {
    const store = A2uiSurfaceStore.fromJsonl(base);
    store.apply({
      updateComponents: {
        surfaceId: 's1',
        components: [{ id: 'body', component: 'Text', text: 'Replaced' }]
      }
    });
    expect(store.get('s1')?.components.body.component).toBe('Text');
    store.apply({ deleteSurface: { surfaceId: 's1' } });
    expect(store.get('s1')).toBeUndefined();
    expect(store.list()).toHaveLength(0);
  });

  it('ignores updates for unknown surfaces', () => {
    const store = A2uiSurfaceStore.fromJsonl(base);
    store.apply({ updateDataModel: { surfaceId: 'missing', path: '/x', value: 1 } });
    expect(store.list()).toHaveLength(1);
  });
});

describe('setDataPath', () => {
  it('creates intermediate objects and supports arrays', () => {
    const next = setDataPath({ list: [{ name: 'a' }] }, '/list/0/name', 'b');
    expect(next).toEqual({ list: [{ name: 'b' }] });
    expect(next).not.toBe(undefined);
  });

  it('creates arrays for numeric path segments', () => {
    expect(setDataPath({}, '/rows/0/name', 'Ada')).toEqual({ rows: [{ name: 'Ada' }] });
  });

  it('supports JSON Pointer escapes', () => {
    expect(setDataPath({}, '/a~1b/~0key', 1)).toEqual({ 'a/b': { '~key': 1 } });
  });

  it('appends to arrays with the - token', () => {
    expect(setDataPath({ items: [1] }, '/items/-', 2)).toEqual({ items: [1, 2] });
  });

  it('rejects paths that are not JSON Pointers', () => {
    expect(() => setDataPath({}, 'items/0', 1)).toThrow(/must start with/);
  });
});

describe('removeDataPath', () => {
  it('removes object keys and array entries immutably', () => {
    const source = { profile: { name: 'Ada', city: 'Shenzhen' }, rows: [1, 2, 3] };
    const withoutName = removeDataPath(source, '/profile/name');
    const withoutRow = removeDataPath(source, '/rows/1');
    expect(withoutName).toEqual({ profile: { city: 'Shenzhen' }, rows: [1, 2, 3] });
    expect(withoutRow).toEqual({ profile: { name: 'Ada', city: 'Shenzhen' }, rows: [1, 3] });
    expect(source).toEqual({ profile: { name: 'Ada', city: 'Shenzhen' }, rows: [1, 2, 3] });
  });

  it('handles escaped keys and missing paths', () => {
    expect(removeDataPath({ 'a/b': 1 }, '/a~1b')).toEqual({});
    expect(removeDataPath({ a: 1 }, '/missing/child')).toEqual({ a: 1 });
  });
});

describe('A2UI update coalescing', () => {
  it('keeps the latest value for the same data path', () => {
    const merged = coalesceEnvelopes([
      { updateDataModel: { surfaceId: 's1', path: '/rows', value: [1] } },
      { updateDataModel: { surfaceId: 's1', path: '/rows', value: [1, 2] } },
      { updateDataModel: { surfaceId: 's1', path: '/other', value: true } }
    ]);
    expect(merged).toEqual([
      { updateDataModel: { surfaceId: 's1', path: '/rows', value: [1, 2] } },
      { updateDataModel: { surfaceId: 's1', path: '/other', value: true } }
    ]);
  });

  it('merges component batches by id', () => {
    const merged = coalesceEnvelopes([
      {
        updateComponents: {
          surfaceId: 's1',
          components: [
            { id: 'root', component: 'SurfaceRoot', title: 'Old' },
            { id: 'body', component: 'Text', text: 'Hello' }
          ]
        }
      },
      {
        updateComponents: {
          surfaceId: 's1',
          components: [{ id: 'root', component: 'SurfaceRoot', title: 'New' }]
        }
      }
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].updateComponents?.components).toHaveLength(2);
    expect(merged[0].updateComponents?.components[0]).toMatchObject({ id: 'root', title: 'New' });
  });

  it('throttles pushes and applies the coalesced batch on flush', () => {
    const store = A2uiSurfaceStore.fromJsonl(
      jsonl(
        { createSurface: { surfaceId: 's1', root: 'root' } },
        {
          updateComponents: {
            surfaceId: 's1',
            components: [{ id: 'root', component: 'SurfaceRoot', child: 'body' }, { id: 'body', component: 'Text' }]
          }
        }
      )
    );
    let flushCount = 0;
    let scheduled: (() => void) | null = null;
    const queue = new A2uiUpdateQueue(
      store,
      () => {
        flushCount += 1;
      },
      32,
      {
        set: callback => {
          scheduled = callback;
          return 1;
        },
        clear: () => {
          scheduled = null;
        }
      }
    );

    queue.push({ updateDataModel: { surfaceId: 's1', path: '/x', value: 1 } });
    queue.push({ updateDataModel: { surfaceId: 's1', path: '/x', value: 2 } });
    expect(queue.pendingCount).toBe(2);
    expect(store.get('s1')?.data.x).toBeUndefined();

    scheduled?.();
    expect(queue.pendingCount).toBe(0);
    expect(store.get('s1')?.data.x).toBe(2);
    expect(flushCount).toBe(1);
  });
});

describe('protocol demo surface', () => {
  it('renders the extended catalog for both languages', () => {
    const english = protocolDemoSurface('en');
    const chinese = protocolDemoSurface('zh');
    expect(english?.title).toBe('A2UI protocol demo');
    expect(chinese?.title).toBe('A2UI 协议演示');
    expect(english?.components.flights.component).toBe('FlightBoard');
    expect(english?.data.flights).toHaveLength(2);
    expect(english?.components.hero.component).toBe('HeroBanner');
    expect(english?.components.thinking.component).toBe('ThinkingCard');
    expect(english?.components.receiving.component).toBe('StripeReceivingAccountCard');
    expect((english?.data.thinking as Record<string, unknown>).done).toBe(true);
    expect((english?.data.receiving as Record<string, unknown>).maskedAccount).toBe('•••• 4242');
  });
});
