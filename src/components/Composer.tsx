import { useEffect, useRef, useState } from 'react';
import type { Attachment } from '../types';
import { formatFileSize } from '../lib/attachments';
import { isVoiceRecognitionSupported, startVoiceRecognition } from '../lib/voice';
import type { VoiceSession } from '../lib/voice';
import { Icon } from './Icons';
import { useI18n } from '../i18n/I18nContext';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  attachments?: Attachment[];
  onAddFiles?: (files: File[]) => void;
  onPreviewAttachment?: (attachment: Attachment) => void;
  onRemoveAttachment?: (index: number) => void;
  onMoveAttachment?: (from: number, direction: -1 | 1) => void;
  onNotice?: (message: string) => void;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  placeholder = 'Ask anything',
  attachments = [],
  onAddFiles,
  onPreviewAttachment,
  onRemoveAttachment,
  onMoveAttachment,
  onNotice
}: ComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const voiceBase = useRef('');
  const [listening, setListening] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const { lang, tr } = useI18n();
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !busy;

  useEffect(
    () => () => {
      voiceRef.current?.abort();
      voiceRef.current = null;
    },
    []
  );

  const stopVoice = () => {
    voiceRef.current?.stop();
    voiceRef.current = null;
    setListening(false);
  };

  const toggleVoice = () => {
    if (listening) {
      stopVoice();
      return;
    }
    if (!isVoiceRecognitionSupported()) {
      onNotice?.(
        tr(
          'Voice input is not available in this browser. Use the keyboard, or the native build.',
          '当前浏览器不支持语音输入。请使用键盘，或使用原生构建。'
        )
      );
      return;
    }
    voiceBase.current = value.trim() ? `${value.trim()} ` : '';
    const session = startVoiceRecognition({
      lang,
      onTranscript: (text, final) => {
        onChange(`${voiceBase.current}${text}`.trim());
        if (final) {
          voiceBase.current = `${voiceBase.current}${text} `;
        }
      },
      onError: error => {
        if (error !== 'aborted' && error !== 'no-speech') {
          onNotice?.(tr(`Voice input failed: ${error}`, `语音输入失败：${error}`));
        }
      },
      onEnd: () => {
        setListening(false);
        voiceRef.current = null;
      }
    });
    if (!session) {
      onNotice?.(tr('Could not start voice input.', '无法启动语音输入。'));
      return;
    }
    voiceRef.current = session;
    setListening(true);
  };


  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = '0px';
    const next = value.trim() ? Math.min(input.scrollHeight, 132) : 42;
    input.style.height = `${next}px`;
  }, [value]);

  return (
    <div className="composer-wrap">
      {attachments.length > 0 ? (
        <div className="attachment-row">
          {attachments.map((file, index) => (
            <span className="attachment-chip" key={file.id}>
              <button
                type="button"
                className="attachment-open"
                onClick={() => onPreviewAttachment?.(file)}
                aria-label={tr(`Preview ${file.name}`, `预览 ${file.name}`)}
              >
                <Icon name={file.kind === 'image' ? 'eye' : file.kind === 'pdf' ? 'download' : 'grid'} size={13} />
                <span>{file.name}</span>
                <em>{formatFileSize(file.size)}</em>
              </button>
              <button
                type="button"
                className="attachment-move"
                aria-label={tr(`Move ${file.name} earlier`, `前移 ${file.name}`)}
                disabled={index === 0}
                onClick={() => onMoveAttachment?.(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="attachment-move"
                aria-label={tr(`Move ${file.name} later`, `后移 ${file.name}`)}
                disabled={index === attachments.length - 1}
                onClick={() => onMoveAttachment?.(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="attachment-remove"
                aria-label={tr(`Remove ${file.name}`, `移除 ${file.name}`)}
                onClick={() => onRemoveAttachment?.(index)}
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden-file-input"
        accept=".txt,.md,.markdown,.json,.csv,.log,.yaml,.yml,.xml,.html,.htm,.css,.js,.ts,.tsx,image/*,.pdf"
        onChange={event => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = '';
          if (files.length > 0) onAddFiles?.(files);
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden-file-input"
        onChange={event => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = '';
          if (files.length > 0) onAddFiles?.(files);
        }}
      />

      <div className={`composer ${busy ? 'is-busy' : ''}`}>
        {attachMenuOpen ? (
          <div className="attach-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAttachMenuOpen(false);
                fileRef.current?.click();
              }}
            >
              <Icon name="grid" size={15} />
              {tr('Files', '文件')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAttachMenuOpen(false);
                cameraRef.current?.click();
              }}
            >
              <Icon name="camera" size={15} />
              {tr('Camera', '拍照')}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="composer-plus"
          onClick={() => setAttachMenuOpen(open => !open)}
          aria-label={tr('Add attachment', '添加附件')}
          aria-expanded={attachMenuOpen}
        >
          <Icon name="plus" size={22} />
        </button>
        <textarea
          ref={inputRef}
          value={value}
          rows={1}
          placeholder={placeholder === 'Ask anything' ? tr('Ask anything', '问点什么') : placeholder}
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
              className={`composer-mic ${listening ? 'is-listening' : ''}`}
              onClick={toggleVoice}
              aria-label={listening ? tr('Stop voice input', '停止语音输入') : tr('Voice input', '语音输入')}
              aria-pressed={listening}
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
