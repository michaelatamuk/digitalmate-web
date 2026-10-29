import type { A2uiSurfaceStore } from './store';
import type { A2uiEnvelope } from './types';

interface Scheduler {
  set: (callback: () => void, delay: number) => unknown;
  clear: (handle: unknown) => void;
}

const defaultScheduler: Scheduler = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
};

/**
 * Merge adjacent updates so a fast stream does not apply every data delta separately.
 * - updateDataModel: same surface + path keeps the latest value.
 * - updateComponents: same surface merges by component id, latest definition wins.
 */
export function coalesceEnvelopes(envelopes: A2uiEnvelope[]): A2uiEnvelope[] {
  const result: A2uiEnvelope[] = [];

  for (const envelope of envelopes) {
    const previous = result[result.length - 1];

    if (envelope.updateDataModel && previous?.updateDataModel) {
      if (
        previous.updateDataModel.surfaceId === envelope.updateDataModel.surfaceId &&
        previous.updateDataModel.path === envelope.updateDataModel.path
      ) {
        result[result.length - 1] = envelope;
        continue;
      }
    }

    if (envelope.updateComponents && previous?.updateComponents) {
      if (previous.updateComponents.surfaceId === envelope.updateComponents.surfaceId) {
        const merged = new Map(
          previous.updateComponents.components.map(component => [component.id, component])
        );
        for (const component of envelope.updateComponents.components) {
          merged.set(component.id, component);
        }
        result[result.length - 1] = {
          updateComponents: {
            surfaceId: envelope.updateComponents.surfaceId,
            components: Array.from(merged.values())
          }
        };
        continue;
      }
    }

    result.push(envelope);
  }

  return result;
}

/** Delays and coalesces surface updates without dropping the final state. */
export class A2uiUpdateQueue {
  private pending: A2uiEnvelope[] = [];
  private timer: unknown = null;

  constructor(
    private readonly store: A2uiSurfaceStore,
    private readonly onFlush?: () => void,
    private readonly delayMs = 32,
    private readonly scheduler: Scheduler = defaultScheduler
  ) {}

  push(envelope: A2uiEnvelope): void {
    this.pending.push(envelope);
    if (this.timer === null) {
      this.timer = this.scheduler.set(() => this.flush(), this.delayMs);
    }
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  flush(): void {
    if (this.timer !== null) {
      this.scheduler.clear(this.timer);
      this.timer = null;
    }
    if (this.pending.length === 0) return;
    const batch = coalesceEnvelopes(this.pending);
    this.pending = [];
    for (const envelope of batch) this.store.apply(envelope);
    this.onFlush?.();
  }

  cancel(): void {
    if (this.timer !== null) {
      this.scheduler.clear(this.timer);
      this.timer = null;
    }
    this.pending = [];
  }
}
