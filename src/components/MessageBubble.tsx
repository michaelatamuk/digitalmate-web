import { useEffect, useState } from 'react';
import type { ItemDetail, Message, ThinkingStep } from '../types';
import { renderMarkdown } from '../lib/markdown';
import { A2uiSurfaceView } from './a2ui/A2uiSurfaceView';
import { Icon } from './Icons';
import { BeeBou } from './BeeBou';
import type { A2uiAction } from '../types';
import { useI18n } from '../i18n/I18nContext';

function stepLabel(status: ThinkingStep['status'], tr: (en: string, zh: string) => string): string {
  if (status === 'done') return tr('Done', '完成');
  if (status === 'active') return tr('In progress', '进行中');
  return tr('Waiting', '等待');
}

export function ThinkingCard({
  title,
  steps,
  done,
  defaultOpen = true
}: {
  title: string;
  steps: ThinkingStep[];
  done: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { tr } = useI18n();

  useEffect(() => {
    if (done) setOpen(false);
  }, [done]);

  if (done && !open) {
    return (
      <button type="button" className="thinking-collapsed" onClick={() => setOpen(true)}>
        <span className="thinking-check">
          <Icon name="check" size={12} />
        </span>
        <span>{tr(`Completed ${steps.length} steps`, `已完成 ${steps.length} 个步骤`)}</span>
        <span className="thinking-collapsed-time">{tr('View trace', '查看执行轨迹')}</span>
        <Icon name="chevronDown" size={14} />
      </button>
    );
  }

  return (
    <div className={`thinking-card ${done ? 'is-done' : ''}`}>
      <div className="thinking-head">
        <span className={`thinking-orb ${done ? 'is-done' : ''}`}>
          {done ? <Icon name="check" size={13} /> : <BeeBou working size={22} still className="is-thinking" decorative />}
        </span>
        <strong>{done ? tr('Finished', '已完成') : title}</strong>
        {!done ? (
          <span className="thinking-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <button type="button" className="thinking-toggle" onClick={() => setOpen(false)}>
            {tr('Collapse', '收起')}
            <Icon name="chevronDown" size={13} />
          </button>
        )}
      </div>
      <div className="thinking-steps">
        {steps.map((step, index) => (
          <div className={`thinking-step is-${step.status}`} key={`${step.label}-${index}`}>
            <span className="step-marker">
              {step.status === 'done' ? (
                <Icon name="check" size={11} />
              ) : step.status === 'active' ? (
                <span className="step-pulse" />
              ) : (
                <span className="step-idle" />
              )}
            </span>
            <span className="step-text">{step.label}</span>
            <em>{stepLabel(step.status, tr)}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  showThinking: boolean;
  isLast: boolean;
  onAction: (action: A2uiAction) => void;
  onDetails: (detail: ItemDetail) => void;
  onFollowUp: (prompt: string) => void;
  onRetry: (id: string) => void;
  onClear: (id: string) => void;
  onCopy: (text: string) => void;
}

export function MessageBubble({
  message,
  showThinking,
  isLast,
  onAction,
  onDetails,
  onFollowUp,
  onRetry,
  onClear,
  onCopy
}: MessageBubbleProps) {
  const { tr, locale } = useI18n();
  if (message.role === 'user') {
    return (
      <div className="message message-user">
        <div className="user-bubble">{message.text}</div>
        <time>{new Date(message.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</time>
      </div>
    );
  }

  return (
    <div className="message message-assistant" data-message-id={message.id}>
      <BeeBou working={Boolean(message.streaming)} size={30} still className="is-avatar" decorative />
      <div className="assistant-main">
        <div className="assistant-meta">
          <strong>DigitalMate</strong>
          <span>{tr('Local demo · A2UI', '本地演示 · A2UI')}</span>
        </div>
        {message.thinking && showThinking ? (
          <ThinkingCard
            title={message.thinking.title}
            steps={message.thinking.steps}
            done={message.thinking.done}
            defaultOpen={!message.thinking.done}
          />
        ) : null}
        {message.text ? (
          <div className="assistant-text">
            {renderMarkdown(message.text)}
            {message.streaming ? <span className="streaming-cursor" /> : null}
          </div>
        ) : null}
        {message.surface ? (
          <A2uiSurfaceView surface={message.surface} onAction={onAction} onDetails={onDetails} />
        ) : null}
        {message.followUps?.length && !message.streaming ? (
          <div className="follow-ups">
            {message.followUps.map(prompt => (
              <button type="button" key={prompt} className="follow-chip" onClick={() => onFollowUp(prompt)}>
                {prompt}
                <Icon name="chevronRight" size={12} />
              </button>
            ))}
          </div>
        ) : null}
        {!message.streaming ? (
          <div className="message-actions">
            {message.text ? (
              <button type="button" onClick={() => onCopy(message.text)}>
                <Icon name="copy" size={12} />
                {tr('Copy', '复制')}
              </button>
            ) : null}
            {isLast ? (
              <button type="button" onClick={() => onRetry(message.id)}>
                <Icon name="refresh" size={12} />
                {tr('Retry', '重试')}
              </button>
            ) : null}
            <button type="button" onClick={() => onClear(message.id)}>
              <Icon name="trash" size={12} />
              {tr('Clear', '清除')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
