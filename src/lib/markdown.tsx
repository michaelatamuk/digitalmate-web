import type { ReactNode } from 'react';

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a key={key} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderMarkdown(source: string): ReactNode {
  if (!source.trim()) return null;

  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${key++}`} className="md-code">
          <code>{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2], `h-${key}`);
      if (level === 1) blocks.push(<h2 key={`h-${key++}`}>{content}</h2>);
      else if (level === 2) blocks.push(<h3 key={`h-${key++}`}>{content}</h3>);
      else blocks.push(<h4 key={`h-${key++}`}>{content}</h4>);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        const item = lines[index].replace(/^[-*]\s+/, '');
        items.push(<li key={`li-${key}-${items.length}`}>{inline(item, `li-${key}-${items.length}`)}</li>);
        index += 1;
      }
      blocks.push(<ul key={`ul-${key++}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\d+\.\s+/, '');
        items.push(<li key={`oli-${key}-${items.length}`}>{inline(item, `oli-${key}-${items.length}`)}</li>);
        index += 1;
      }
      blocks.push(<ol key={`ol-${key++}`}>{items}</ol>);
      continue;
    }

    if (line.trim().startsWith('>')) {
      const content: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        content.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(
        <blockquote key={`q-${key++}`}>{inline(content.join(' '), `q-${key}`)}</blockquote>
      );
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !lines[index].trim().startsWith('>') &&
      !lines[index].trim().startsWith('```')
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`p-${key++}`}>{inline(paragraph.join(' '), `p-${key}`)}</p>);
  }

  return <>{blocks}</>;
}
