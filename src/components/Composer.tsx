import { useEffect, useRef } from 'react';
import { Icon } from './Icons';
import { useI18n } from '../i18n/I18nContext';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  attachments?: string[];
  onAttach?: () => void;
  onRemoveAttachment?: (index: number) => void;
  onNotice?: (message: string) => void;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  placeholder = 'Ask DigitalMate anything',
  attachments = [],
  onAttach,
  onRemoveAttachment,
  onNotice
}: ComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { tr } = useI18n();
  const canSend = value.trim().length > 0 && !busy;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }, [value]);

  return (
    <div className="composer-wrap">
      {attachments.length > 0 ? (
        <div className="attachment-row">
          {attachments.map((file, index) => (
            <span className="attachment-chip" key={`${file}-${index}`}>
              <Icon name="grid" size={14} />
              {file}
              <button
                type="button"
                aria-label={tr(`Remove ${file}`, `移除 ${file}`)}
                onClick={() => onRemoveAttachment?.(index)}
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className={`composer ${busy ? 'is-busy' : ''}`}>
        <button type="button" className="composer-plus" onClick={onAttach} aria-label={tr('Add attachment', '添加附件')}>
          <Icon name="plus" size={22} />
        </button>
        <textarea
          ref={inputRef}
          value={value}
          rows={1}
          placeholder={placeholder === 'Ask DigitalMate anything' ? tr('Ask DigitalMate anything', '告诉 DigitalMate 你想完成什么') : placeholder}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
          aria-label={tr('Message', '输入消息')}
        />
        {busy ? (
          <button type="button" className="composer-send is-stop" onClick={onStop} aria-label={tr('Stop generating', '停止生成')}>
            <span className="stop-square" />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="composer-mic"
              onClick={() => onNotice?.(tr('Voice input is not enabled in the web demo.', '语音输入在网页演示中未启用。'))}
              aria-label={tr('Voice input', '语音输入')}
            >
              <Icon name="mic" size={20} />
            </button>
            <button
              type="button"
              className={`composer-send ${canSend ? 'is-ready' : ''}`}
              onClick={onSend}
              disabled={!canSend}
              aria-label={tr('Send', '发送')}
            >
              <Icon name="send" size={20} />
            </button>
          </>
        )}
      </div>
      <div className="composer-hint">{tr('Enter to send · Shift + Enter for a new line', 'Enter 发送 · Shift+Enter 换行')}</div>
    </div>
  );
}
