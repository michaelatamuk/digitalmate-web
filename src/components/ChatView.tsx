import { useEffect, useRef } from 'react';
import type { A2uiAction, ItemDetail, Message } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { MessageBubble } from './MessageBubble';

export function ChatView({
  messages,
  showThinking,
  onAction,
  onDetails,
  onFollowUp,
  onRetry,
  onClear,
  onCopy,
  onShare,
  onSaveArtifact
}: {
  messages: Message[];
  showThinking: boolean;
  onAction: (action: A2uiAction) => void;
  onDetails: (detail: ItemDetail) => void;
  onFollowUp: (prompt: string) => void;
  onRetry: (id: string) => void;
  onClear: (id: string) => void;
  onCopy: (text: string) => void;
  onShare: (text: string) => void;
  onSaveArtifact: (id: string) => void;
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
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          showThinking={showThinking}
          isLast={index === messages.length - 1}
          onAction={onAction}
          onDetails={onDetails}
          onFollowUp={onFollowUp}
          onRetry={onRetry}
          onClear={onClear}
          onCopy={onCopy}
          onShare={onShare}
          onSaveArtifact={onSaveArtifact}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
