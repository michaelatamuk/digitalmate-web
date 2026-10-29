import type { A2uiComponent, A2uiSurface } from '../types';
import { A2uiSurfaceStore } from '../protocol/a2ui/store';

let surfaceSeq = 0;

/**
 * Build a surface through the same JSONL path used by the Orbit bridge.
 * Fixtures stay declarative, but every shipped scenario now exercises the parser and store.
 */
export function makeSurface(
  title: string,
  components: A2uiComponent[],
  data: Record<string, unknown> = {},
  subtitle?: string
): A2uiSurface {
  surfaceSeq += 1;
  const surfaceId = `surface_${surfaceSeq}_${Date.now().toString(36)}`;
  const root = components[0]?.id ?? 'root';

  const lines = [
    {
      version: 'v0.9.1',
      createSurface: {
        surfaceId,
        root,
        title,
        subtitle,
        status: 'ready'
      }
    },
    {
      version: 'v0.9.1',
      updateComponents: { surfaceId, components }
    },
    {
      version: 'v0.9.1',
      updateDataModel: { surfaceId, path: '/', value: data }
    }
  ];

  const surface = A2uiSurfaceStore.fromJsonl(lines.map(line => JSON.stringify(line)).join('\n')).get(
    surfaceId
  );
  if (!surface) throw new Error(`Could not build A2UI surface: ${title}`);
  return surface;
}
