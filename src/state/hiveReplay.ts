import type { HiveEvent } from '../domain/hive';
import type { HiveTransport } from '../transport/hive';

export interface HiveRecorder {
  /** Stops recording and returns the events seen so far, including the initial snapshot. */
  stop: () => HiveEvent[];
}

/**
 * Records everything a transport emits. Used by tests and available for debugging a session: the
 * recording is just the event stream, so replaying it needs no special transport.
 */
export function recordHiveEvents(transport: HiveTransport): HiveRecorder {
  const events: HiveEvent[] = [];
  const unsubscribe = transport.subscribe(event => {
    events.push({ type: event.type, snapshot: event.snapshot });
  });
  return {
    stop: (): HiveEvent[] => {
      unsubscribe();
      return events;
    }
  };
}

/**
 * Replays a recording into a listener. With `intervalMs` 0 it runs synchronously, which is what
 * tests want; a positive interval lets a UI step through the events instead.
 */
export async function replayHiveEvents(
  events: HiveEvent[],
  onEvent: (event: HiveEvent) => void,
  options: { intervalMs?: number } = {}
): Promise<void> {
  const interval = Math.max(0, options.intervalMs ?? 0);
  for (const event of events) {
    onEvent(event);
    if (interval > 0) await new Promise<void>(resolve => setTimeout(resolve, interval));
  }
}
