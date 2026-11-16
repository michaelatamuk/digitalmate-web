import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

/** Matches the text cap used for PDFs and plain text, so previews stay bounded. */
export const DOCX_MAX_CHARS = 200_000;

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** True for .docx by MIME type or extension; Word's legacy .doc binary is not handled. */
export function isDocx(name: string, type: string): boolean {
  return type === DOCX_MIME || name.toLowerCase().endsWith('.docx');
}

/**
 * Reads the body text of a .docx entirely in the browser. A .docx is a zip; only
 * `word/document.xml` is needed, so the archive is filtered before inflation.
 * Paragraphs become newlines, table cells become tabs and deleted text is skipped.
 */
export function docxTextFromBytes(bytes: Uint8Array, limit = DOCX_MAX_CHARS): string {
  let entry: Uint8Array | undefined;
  try {
    const files = unzipSync(bytes, { filter: file => file.name === 'word/document.xml' });
    entry = files['word/document.xml'];
  } catch {
    return '';
  }
  if (!entry) return '';
  return xmlToText(new TextDecoder().decode(entry), limit);
}

export async function extractDocxText(file: File): Promise<string> {
  return docxTextFromBytes(new Uint8Array(await file.arrayBuffer()));
}

const parser = new XMLParser({
  preserveOrder: true,
  removeNSPrefix: true,
  ignoreAttributes: true,
  trimValues: false
});

function xmlToText(xml: string, limit: number): string {
  let tree: unknown;
  try {
    tree = parser.parse(xml);
  } catch {
    return '';
  }
  const out: string[] = [];
  collect(tree, out);
  const text = out
    .join('')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.slice(0, limit);
}

function collect(nodes: unknown, out: string[], inText = false): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    for (const [tag, value] of Object.entries(node as Record<string, unknown>)) {
      if (tag === '#text') {
        // Only `w:t` carries visible text; everything else is indentation from the XML writer.
        if (inText) out.push(typeof value === 'string' ? value : String(value ?? ''));
        continue;
      }
      if (tag === 'delText' || tag === 'instrText') continue; // deleted runs and field codes
      if (tag === 'tab') {
        out.push('\t');
        continue;
      }
      if (tag === 'br' || tag === 'cr') {
        out.push('\n');
        continue;
      }
      if (!Array.isArray(value)) continue;
      collect(value, out, inText || tag === 't');
      if (tag === 'p') out.push('\n');
      if (tag === 'tc') out.push('\t');
      if (tag === 'tr') out.push('\n');
    }
  }
}
