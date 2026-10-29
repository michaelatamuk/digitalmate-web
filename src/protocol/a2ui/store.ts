import type { A2uiSurface } from '../../types';
import { componentMap, parseA2uiJsonl, setDataPath } from './parser';
import type { A2uiEnvelope, A2uiParseError } from './types';

interface StoredSurface {
  id: string;
  root: string;
  title?: string;
  subtitle?: string;
  status?: 'thinking' | 'ready' | 'error';
  components: Record<string, import('../../types').A2uiComponent>;
  data: Record<string, unknown>;
}

function asStatus(value: string | undefined): 'thinking' | 'ready' | 'error' | undefined {
  return value === 'thinking' || value === 'error' || value === 'ready' ? value : undefined;
}

export class A2uiSurfaceStore {
  private surfaces = new Map<string, StoredSurface>();
  private errors: A2uiParseError[] = [];

  static fromJsonl(text: string): A2uiSurfaceStore {
    const store = new A2uiSurfaceStore();
    const parsed = parseA2uiJsonl(text);
    store.errors = parsed.errors;
    for (const envelope of parsed.envelopes) store.apply(envelope);
    return store;
  }

  apply(envelope: A2uiEnvelope): void {
    if (envelope.createSurface) {
      const source = envelope.createSurface;
      this.surfaces.set(source.surfaceId, {
        id: source.surfaceId,
        root: source.root,
        title: source.title,
        subtitle: source.subtitle,
        status: asStatus(source.status) ?? 'ready',
        components: {},
        data: {}
      });
      return;
    }

    if (envelope.updateComponents) {
      const target = this.surfaces.get(envelope.updateComponents.surfaceId);
      if (!target) return;
      target.components = { ...target.components, ...componentMap(envelope.updateComponents.components) };
      return;
    }

    if (envelope.updateDataModel) {
      const target = this.surfaces.get(envelope.updateDataModel.surfaceId);
      if (!target) return;
      target.data = setDataPath(target.data, envelope.updateDataModel.path, envelope.updateDataModel.value);
      return;
    }

    if (envelope.deleteSurface) {
      this.surfaces.delete(envelope.deleteSurface.surfaceId);
    }
  }

  get(surfaceId: string): A2uiSurface | undefined {
    const surface = this.surfaces.get(surfaceId);
    if (!surface) return undefined;
    return {
      id: surface.id,
      root: surface.root,
      title: surface.title,
      subtitle: surface.subtitle,
      status: surface.status,
      components: surface.components,
      data: surface.data
    };
  }

  list(): A2uiSurface[] {
    return Array.from(this.surfaces.values()).map(surface => ({
      id: surface.id,
      root: surface.root,
      title: surface.title,
      subtitle: surface.subtitle,
      status: surface.status,
      components: surface.components,
      data: surface.data
    }));
  }

  getErrors(): A2uiParseError[] {
    return [...this.errors];
  }
}
