import type { A2uiSurface, Language } from '../types';

export interface ChatTurnRequest {
  text: string;
  lang: Language;
  roomId?: string;
  submissionId: string;
}

export type ChatTurnEvent =
  | { type: 'thinking'; step: string; steps: string[]; index: number; total: number }
  | { type: 'text'; text: string }
  | { type: 'surface'; surface: A2uiSurface }
  | { type: 'followUps'; followUps: string[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface ChatTransport {
  readonly id: 'mock' | 'orbit';
  send(
    request: ChatTurnRequest,
    onEvent: (event: ChatTurnEvent) => void,
    signal: AbortSignal
  ): Promise<void>;
}
