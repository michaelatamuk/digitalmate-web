import type { CalendarEvent } from '../types';
import { replyFor } from '../lib/mockEngine';
import type { ChatTransport, ChatTurnEvent, ChatTurnRequest } from './types';

function wait(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      resolve(false);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Local transport: same prompt engine as before, but shaped as transport events so the Orbit
 * transport can replace it without changing the chat view.
 */
export class MockChatTransport implements ChatTransport {
  readonly id = 'mock' as const;

  constructor(
    private readonly calendarEvents: CalendarEvent[] = [],
    private readonly timingScale = 1
  ) {}

  async send(
    request: ChatTurnRequest,
    onEvent: (event: ChatTurnEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    const reply = replyFor(request.text, request.lang, this.calendarEvents);

    if (this.timingScale <= 0) {
      if (signal.aborted) return;
      reply.thinking.forEach((step, index) => {
        onEvent({
          type: 'thinking',
          step,
          steps: reply.thinking,
          index,
          total: reply.thinking.length
        });
      });
      if (signal.aborted) return;
      onEvent({ type: 'text', text: reply.text });
      if (reply.surface) onEvent({ type: 'surface', surface: reply.surface });
      if (reply.followUps) onEvent({ type: 'followUps', followUps: reply.followUps });
      onEvent({ type: 'done' });
      return;
    }

    if (!(await wait(280 * this.timingScale, signal))) return;

    for (let index = 0; index < reply.thinking.length; index += 1) {
      if (signal.aborted) return;
      onEvent({
        type: 'thinking',
        step: reply.thinking[index],
        steps: reply.thinking,
        index,
        total: reply.thinking.length
      });
      if (!(await wait((340 + Math.random() * 220) * this.timingScale, signal))) return;
    }

    if (!(await wait(160 * this.timingScale, signal))) return;

    const characters = Array.from(reply.text);
    for (let index = 0; index < characters.length; index += 2) {
      if (signal.aborted) return;
      onEvent({ type: 'text', text: characters.slice(index, index + 2).join('') });
      if (!(await wait(12 * this.timingScale, signal))) return;
    }

    if (signal.aborted) return;
    if (reply.surface) onEvent({ type: 'surface', surface: reply.surface });
    if (reply.followUps) onEvent({ type: 'followUps', followUps: reply.followUps });
    onEvent({ type: 'done' });
  }
}
