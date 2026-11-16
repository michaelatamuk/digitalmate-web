export type AnnouncementPoliteness = 'polite' | 'assertive';

export interface Announcement {
  message: string;
  politeness: AnnouncementPoliteness;
}

type Listener = (announcement: Announcement) => void;

const listeners = new Set<Listener>();

/**
 * Sends a short message to the live regions, so state changes that are only visible on screen are
 * also spoken. Empty messages are ignored; the same text can be sent twice and is still spoken.
 */
export function announce(message: string, politeness: AnnouncementPoliteness = 'polite'): void {
  const text = message.trim();
  if (!text) return;
  for (const listener of listeners) listener({ message: text, politeness });
}

/** Returns an unsubscribe function. */
export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
