import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { docxTextFromBytes, isDocx } from '../src/lib/docx';

const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Quarterly review </w:t></w:r><w:r><w:t>draft</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>First point</w:t></w:r>
      <w:r><w:tab/><w:t>aligned</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:delText>removed</w:delText><w:t>kept</w:t></w:r></w:p>
  </w:body>
</w:document>`;

function docxBytes(xml = DOCUMENT_XML): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types/>'),
    'word/document.xml': strToU8(xml)
  });
}

describe('docx text extraction', () => {
  it('reads paragraphs, tabs and table cells', () => {
    const text = docxTextFromBytes(docxBytes());
    expect(text).toContain('Quarterly review draft');
    expect(text).toContain('First point\taligned');
    expect(text).toContain('Cell A');
    expect(text).toContain('Cell B');
    expect(text).toContain('kept');
  });

  it('skips deleted runs', () => {
    expect(docxTextFromBytes(docxBytes())).not.toContain('removed');
  });

  it('keeps paragraph breaks', () => {
    const text = docxTextFromBytes(docxBytes());
    expect(text.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(3);
  });

  it('returns an empty string for files that are not docx archives', () => {
    expect(docxTextFromBytes(strToU8('not a zip'))).toBe('');
    // A zip without word/document.xml is a different archive type.
    expect(docxTextFromBytes(zipSync({ 'readme.txt': strToU8('hi') }))).toBe('');
    // Malformed XML inside the right entry should not throw either.
    expect(docxTextFromBytes(docxBytes('<w:document><w:body><w:p>'))).toBe('');
  });

  it('honours the character limit', () => {
    const long = DOCUMENT_XML.replace('Quarterly review', 'Review '.repeat(200));
    expect(docxTextFromBytes(docxBytes(long), 40)).toHaveLength(40);
  });

  it('detects the format by extension and MIME type', () => {
    expect(isDocx('report.docx', '')).toBe(true);
    expect(isDocx('REPORT.DOCX', '')).toBe(true);
    expect(
      isDocx('report.bin', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe(true);
    expect(isDocx('report.doc', 'application/msword')).toBe(false);
    expect(isDocx('report.pdf', 'application/pdf')).toBe(false);
  });
});
