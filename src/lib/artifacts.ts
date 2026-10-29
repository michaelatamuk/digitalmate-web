import type { A2uiSurface, Artifact } from '../types';
import { newId } from './storage';

const MARKDOWN_STRIP = /^#+\s*/;

export function artifactFromText(
  text: string,
  createdAt = Date.now(),
  surface?: A2uiSurface
): Artifact | null {
  const content = text.trim();
  if (!content && !surface) return null;
  const firstLine =
    content
      .split('\n')
      .map(line => line.trim())
      .find(line => line.length > 0) ?? surface?.title ?? '';
  const title =
    firstLine
      .replace(MARKDOWN_STRIP, '')
      .replace(/[*_`>#-]/g, '')
      .trim()
      .slice(0, 64) || surface?.title || 'Artifact';

  return {
    id: newId('artifact'),
    title,
    kind: surface ? 'surface' : 'markdown',
    content,
    ...(surface ? { surface } : {}),
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
  const extension =
    artifact.kind === 'json' || artifact.kind === 'surface'
      ? 'json'
      : artifact.kind === 'text'
        ? 'txt'
        : 'md';
  return `${slug}.${extension}`;
}

export function artifactDownloadContent(artifact: Artifact): string {
  if (artifact.surface) {
    return JSON.stringify(
      {
        title: artifact.title,
        text: artifact.content,
        surface: artifact.surface
      },
      null,
      2
    );
  }
  return artifact.content;
}

export function findDuplicateArtifact(artifacts: Artifact[], content: string): Artifact | undefined {
  const normalized = content.trim();
  return artifacts.find(artifact => artifact.content === normalized);
}

export interface ArtifactSlide {
  title: string;
  body: string;
}

/** Split Markdown into simple slides with `---` or level-2 headings. */
export function artifactSlides(content: string): ArtifactSlide[] {
  const text = content.trim();
  if (!text) return [];
  const sections = text.includes('\n---')
    ? text.split(/\n-{3,}\n/)
    : text.split(/\n(?=##\s)/);

  const slides = sections
    .map((section, index) => {
      const lines = section.trim().split('\n');
      const heading = lines[0]?.startsWith('#')
        ? lines[0].replace(/^#+\s*/, '').trim()
        : `Slide ${index + 1}`;
      const body = lines[0]?.startsWith('#') ? lines.slice(1).join('\n').trim() : section.trim();
      return { title: heading, body };
    })
    .filter(slide => slide.title || slide.body);

  return slides.length > 1 ? slides : [];
}
