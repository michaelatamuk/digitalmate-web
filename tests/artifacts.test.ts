import { describe, expect, it } from 'vitest';
import { artifactDownloadContent, artifactFilename, artifactFromText, artifactSlides, findDuplicateArtifact } from '../src/lib/artifacts';
import type { A2uiSurface } from '../src/types';

describe('local artifacts', () => {
  it('creates a markdown artifact with a readable title', () => {
    const artifact = artifactFromText(
      '# Travel options\n\nG21 is the most reliable choice.\n\n- Source: 12306',
      1000
    );
    expect(artifact).toMatchObject({
      title: 'Travel options',
      kind: 'markdown',
      createdAt: 1000
    });
    expect(artifact?.content).toContain('G21');
    expect(artifact?.id).toMatch(/^artifact_/);
  });

  it('returns null for empty text', () => {
    expect(artifactFromText('   ')).toBeNull();
  });

  it('builds safe download filenames', () => {
    const artifact = artifactFromText('# Hello / World!')!;
    expect(artifactFilename(artifact)).toBe('hello-world.md');
  });

  it('detects duplicate content', () => {
    const artifact = artifactFromText('Same reply')!;
    expect(findDuplicateArtifact([artifact], 'Same reply\n')).toBe(artifact);
    expect(findDuplicateArtifact([artifact], 'Different reply')).toBeUndefined();
  });

  it('stores an A2UI surface as a rich artifact', () => {
    const surface: A2uiSurface = {
      id: 'surface_artifact',
      root: 'root',
      title: 'Coffee nearby',
      status: 'ready',
      components: {
        root: { id: 'root', component: 'Text', text: 'Hello' }
      },
      data: {}
    };
    const artifact = artifactFromText('Here are coffee shops', 1000, surface)!;
    expect(artifact.kind).toBe('surface');
    expect(artifact.surface).toBe(surface);
    expect(artifactFilename(artifact)).toBe('here-are-coffee-shops.json');
    const download = JSON.parse(artifactDownloadContent(artifact)) as Record<string, unknown>;
    expect(download.title).toBe('Here are coffee shops');
    expect((download.surface as A2uiSurface).id).toBe('surface_artifact');
  });

  it('can create a surface-only artifact', () => {
    const surface: A2uiSurface = {
      id: 'surface_only',
      root: 'root',
      title: 'Travel options',
      components: { root: { id: 'root', component: 'Text', text: 'Hi' } },
      data: {}
    };
    const artifact = artifactFromText('', 1, surface)!;
    expect(artifact.title).toBe('Travel options');
    expect(artifact.kind).toBe('surface');
  });

  it('builds slides from separators or level-2 headings', () => {
    const fromSeparators = artifactSlides('Slide one\nBody one\n---\nSlide two\nBody two');
    expect(fromSeparators).toHaveLength(2);
    expect(fromSeparators[1]).toMatchObject({ title: 'Slide 2', body: 'Slide two\nBody two' });

    const fromHeadings = artifactSlides('# Deck\n\n## First\nBody\n\n## Second\nMore');
    expect(fromHeadings).toHaveLength(3);
    expect(fromHeadings.find(slide => slide.title === 'First')).toMatchObject({ body: 'Body' });
  });
});
