import { describe, expect, it } from 'vitest';
import {
  attachmentKind,
  formatFileSize,
  readAttachment,
  summarizeAttachment,
  validateAttachment,
  MAX_ATTACHMENT_BYTES
} from '../src/lib/attachments';

describe('local attachments', () => {
  it('detects preview kinds', () => {
    expect(attachmentKind('notes.txt', 'text/plain')).toBe('text');
    expect(attachmentKind('data.json', 'application/json')).toBe('text');
    expect(attachmentKind('photo.png', 'image/png')).toBe('image');
    expect(attachmentKind('report.pdf', 'application/pdf')).toBe('pdf');
    expect(attachmentKind('report.PDF', '')).toBe('pdf');
    expect(attachmentKind('archive.zip', 'application/zip')).toBe('other');
  });

  it('rejects files over 5 MB', () => {
    const small = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(validateAttachment(small)).toBeNull();
    const big = new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], 'big.bin', {
      type: 'application/octet-stream'
    });
    expect(validateAttachment(big)).toContain('larger than 5 MB');
  });

  it('reads text files locally and summarizes without content', async () => {
    const file = new File(['Hello attachment'], 'notes.txt', { type: 'text/plain' });
    const attachment = await readAttachment(file);
    expect(attachment.kind).toBe('text');
    expect(attachment.text).toBe('Hello attachment');
    expect(attachment.url).toBeUndefined();
    expect(summarizeAttachment(attachment)).toEqual({
      name: 'notes.txt',
      size: file.size,
      type: 'text/plain',
      kind: 'text'
    });
  });

  it('formats sizes', () => {
    expect(formatFileSize(200)).toBe('200 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
