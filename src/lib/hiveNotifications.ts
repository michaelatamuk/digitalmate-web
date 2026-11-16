import type { HiveSnapshot, HiveTask } from '../domain/hive';
import type { HiveTransport } from '../transport/hive';

export interface HiveNotificationInput {
  title: string;
  body: string;
  onOpen: () => void;
}

export interface HiveNotifierOptions {
  transport: HiveTransport;
  /** Notifications are only raised while the Hive sheet is closed. */
  isSheetOpen: () => boolean;
  onOpen: (taskId: string, laneId: string) => void;
  /** Overridable for tests; the default uses the browser Notification API. */
  notify?: (input: HiveNotificationInput) => void;
}

function browserNotify(input: HiveNotificationInput): void {
  const api = (globalThis as { Notification?: typeof Notification }).Notification;
  if (!api || api.permission !== 'granted') return;
  try {
    const notification = new api(input.title, { body: input.body, tag: 'digitalmate-hive' });
    notification.onclick = (): void => {
      try {
        window.focus();
      } catch {
        // Focus is best-effort; the app still opens the task.
      }
      notification.close();
      input.onOpen();
    };
  } catch {
    // A blocked notification must never break the task flow.
  }
}

/**
 * Watches the Hive transport and raises one notification per task transition into `done` or
 * `waiting_user`, but only while the sheet is closed. The first snapshot only primes the state, so
 * opening the app never replays notifications for old work.
 */
export function installHiveNotifications(options: HiveNotifierOptions): () => void {
  const send = options.notify ?? browserNotify;
  const statuses = new Map<string, HiveTask['status']>();
  const notified = new Set<string>();
  let primed = false;

  const handle = (snapshot: HiveSnapshot): void => {
    const changed: HiveTask[] = [];
    for (const task of snapshot.tasks) {
      const previous = statuses.get(task.id);
      statuses.set(task.id, task.status);
      if (!primed) continue;
      if (previous !== task.status && (task.status === 'done' || task.status === 'waiting_user')) {
        changed.push(task);
      }
    }
    primed = true;
    if (!changed.length || options.isSheetOpen()) return;

    for (const task of changed) {
      const key = `${task.id}:${task.status}`;
      if (notified.has(key)) continue;
      notified.add(key);
      const lane = snapshot.lanes.find(item => item.id === task.laneId);
      const bee = lane?.label ?? 'Bee';
      send({
        title: task.status === 'done' ? `${bee} finished` : `${bee} needs you`,
        body: task.title,
        onOpen: () => options.onOpen(task.id, task.laneId)
      });
    }
  };

  return options.transport.subscribe(event => handle(event.snapshot));
}

/** Asks for notification permission once, on a user gesture (the first Hive send). */
export function requestHiveNotificationPermission(): void {
  const api = (globalThis as { Notification?: typeof Notification }).Notification;
  if (!api || typeof api.requestPermission !== 'function') return;
  if (api.permission !== 'default') return;
  try {
    void api.requestPermission();
  } catch {
    // Permission is optional; the sheet works without it.
  }
}
