import { describe, expect, it } from 'vitest';
import { artifactFilename, artifactFromText, findDuplicateArtifact } from '../src/lib/artifacts';

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
});
