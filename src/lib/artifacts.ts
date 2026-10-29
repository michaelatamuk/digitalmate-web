import type { Artifact } from '../types';
import { newId } from './storage';

const MARKDOWN_STRIP = /^#+\s*/;

export function artifactFromText(text: string, createdAt = Date.now()): Artifact | null {
  const content = text.trim();
  if (!content) return null;
  const firstLine =
    content
      .split('\n')
      .map(line => line.trim())
      .find(line => line.length > 0) ?? '';
  const title =
    firstLine
      .replace(MARKDOWN_STRIP, '')
      .replace(/[*_`>#-]/g, '')
      .trim()
      .slice(0, 64) || 'Artifact';

  return {
    id: newId('artifact'),
    title,
    kind: 'markdown',
    content,
    createdAt
  };
}

export function artifactFilename(artifact: Artifact): string {
  const slug =
    artifact.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'artifact';
  const extension = artifact.kind === 'json' ? 'json' : artifact.kind === 'text' ? 'txt' : 'md';
  return `${slug}.${extension}`;
}

export function findDuplicateArtifact(artifacts: Artifact[], content: string): Artifact | undefined {
  const normalized = content.trim();
  return artifacts.find(artifact => artifact.content === normalized);
}
