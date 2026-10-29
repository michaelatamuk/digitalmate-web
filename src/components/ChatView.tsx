import { useEffect, useRef } from 'react';
import type { A2uiAction, Message } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { MessageBubble } from './MessageBubble';

export function ChatView({
  messages,
  showThinking,
  onAction,
  onFollowUp
}: {
  messages: Message[];
  showThinking: boolean;
  onAction: (action: A2uiAction) => void;
  onFollowUp: (prompt: string) => void;
}) {
  const { tr } = useI18n();
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  useEffect(() => {
    if (!last) return;
    if (last.surface) {
      const message = document.querySelector(
        `[data-message-id="${last.id}"]`
      ) as HTMLElement | null;
      if (message) {
        message.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }
    endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages.length, last?.id, last?.text, last?.surface]);

  return (
    <div className="chat-view">
      <div className="chat-date">{tr('Today', '今天')}</div>
      {messages.map(message => (
        <MessageBubble
          key={message.id}
          message={message}
          showThinking={showThinking}
          onAction={onAction}
          onFollowUp={onFollowUp}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
