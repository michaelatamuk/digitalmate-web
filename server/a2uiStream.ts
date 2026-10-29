import { parseA2uiJsonl } from '../src/protocol/a2ui/parser';
import { A2uiUpdateQueue } from '../src/protocol/a2ui/queue';
import { A2uiSurfaceStore } from '../src/protocol/a2ui/store';
import type { A2uiEnvelope, A2uiParseError } from '../src/protocol/a2ui/types';
import type { A2uiSurface } from '../src/types';

interface ParsedBatch {
  envelopes: A2uiEnvelope[];
  errors: A2uiParseError[];
}

function asEnvelopes(value: unknown): ParsedBatch {
  if (typeof value === 'string') {
    return parseA2uiJsonl(value);
  }
  if (Array.isArray(value)) {
    return {
      envelopes: value.filter(
        (item): item is A2uiEnvelope => item !== null && typeof item === 'object'
      ),
      errors: []
    };
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (
      'createSurface' in record ||
      'updateComponents' in record ||
      'updateDataModel' in record ||
      'deleteSurface' in record
    ) {
      return { envelopes: [value as A2uiEnvelope], errors: [] };
    }
    if (Array.isArray(record.envelopes) || typeof record.jsonl === 'string') {
      return asEnvelopes(record.envelopes ?? record.jsonl);
    }
  }
  return { envelopes: [], errors: [] };
}

/** Convention for bridge payloads: `event: orbit.task.a2ui` with `envelopes` or `jsonl`. */
export function a2uiPayloadFromEvent(event: Record<string, unknown>): unknown {
  if (event.a2ui !== undefined) return event.a2ui;
  if (event.envelopes !== undefined) return event.envelopes;
  if (event.event === 'orbit.task.a2ui') return event.data ?? event;
  return undefined;
}

/**
 * Per-turn A2UI state. Incoming envelopes are coalesced through A2uiUpdateQueue before the
 * current surfaces are emitted to the browser.
 */
export class BridgeSurfaceStream {
  private readonly store = new A2uiSurfaceStore();
  private readonly queue = new A2uiUpdateQueue(this.store);
  private parseErrors: A2uiParseError[] = [];

  apply(value: unknown): A2uiSurface[] {
    const batch = asEnvelopes(value);
    this.parseErrors.push(...batch.errors);
    if (batch.envelopes.length === 0) return [];
    for (const envelope of batch.envelopes) this.queue.push(envelope);
    this.queue.flush();
    return this.store.list();
  }

  errors(): A2uiParseError[] {
    return [...this.parseErrors];
  }
}
