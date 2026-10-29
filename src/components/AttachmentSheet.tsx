import type { Attachment } from '../types';
import { formatFileSize } from '../lib/attachments';
import { useI18n } from '../i18n/I18nContext';
import { Icon } from './Icons';
import { Sheet } from './Overlays';

interface AttachmentSheetProps {
  attachment: Attachment;
  onClose: () => void;
  onNotice: (message: string) => void;
}

export function AttachmentSheet({ attachment, onClose, onNotice }: AttachmentSheetProps) {
  const { tr } = useI18n();

  const copyText = async () => {
    if (!attachment.text) return;
    try {
      await navigator.clipboard.writeText(attachment.text);
      onNotice(tr('Attachment text copied.', '附件文本已复制。'));
    } catch {
      onNotice(tr('Clipboard access is not available.', '当前浏览器无法访问剪贴板。'));
    }
  };

  return (
    <Sheet
      title={attachment.name}
      subtitle={`${formatFileSize(attachment.size)} · ${attachment.type || attachment.kind}`}
      onClose={onClose}
      wide
    >
      {attachment.kind === 'image' && attachment.url ? (
        <img className="attachment-preview-image" src={attachment.url} alt={attachment.name} />
      ) : null}

      {attachment.kind === 'text' && attachment.text ? (
        <pre className="attachment-preview-text">{attachment.text}</pre>
      ) : null}

      {attachment.kind === 'pdf' && attachment.text ? (
        <>
          <pre className="attachment-preview-text">{attachment.text}</pre>
          <div className="attachment-preview-note">
            <Icon name="check" size={18} />
            <div>
              <strong>{tr('PDF text extracted locally', 'PDF 文本已在本地提取')}</strong>
              <p>
                {tr(
                  'Layout and images are not preserved. The file and extracted text never leave this browser.',
                  '版式和图片不会保留。文件与提取文本都不会离开当前浏览器。'
                )}
              </p>
            </div>
          </div>
        </>
      ) : null}

      {attachment.kind === 'pdf' && !attachment.text ? (
        <div className="attachment-preview-note">
          <Icon name="info" size={18} />
          <div>
            <strong>{tr('No selectable text found', '没有找到可提取文本')}</strong>
            <p>
              {tr(
                'This PDF may be scanned or image-only. Text extraction runs locally; the file never leaves this browser.',
                '这个 PDF 可能是扫描件或纯图片。文本提取在本地进行，文件不会离开当前浏览器。'
              )}
            </p>
          </div>
        </div>
      ) : null}

      {attachment.kind === 'other' ? (
        <div className="attachment-preview-note">
          <Icon name="info" size={18} />
          <div>
            <strong>{tr('No preview for this file type', '此文件类型暂不支持预览')}</strong>
            <p>
              {tr(
                'Only text files and images are previewed locally. Nothing is uploaded.',
                '目前仅支持在本地预览文本文件和图片，不会上传任何内容。'
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="details-actions">
        {attachment.text ? (
          <button type="button" className="secondary-action" onClick={() => void copyText()}>
            <Icon name="copy" size={14} />
            {tr('Copy text', '复制文本')}
          </button>
        ) : null}
        {attachment.url ? (
          <a className="primary-action" href={attachment.url} download={attachment.name}>
            <Icon name="download" size={14} />
            {tr('Download', '下载')}
          </a>
        ) : null}
      </div>

      <div className="sheet-footnote">
        <Icon name="lock" size={14} />
        {tr('Previewed locally · no upload or account', '本地预览 · 不上传、无需账号')}
      </div>
    </Sheet>
  );
}
