export interface ReleaseInfo {
  version: string;
  url: string;
  notes: string;
  apkUrl?: string;
}

const RELEASES_URL = 'https://api.github.com/repos/michaelatamuk/digitalmate-web/releases/latest';

function normalize(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map(part => Number.parseInt(part, 10) || 0);
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const left = normalize(candidate);
  const right = normalize(current);
  for (let index = 0; index < 3; index += 1) {
    if ((left[index] ?? 0) > (right[index] ?? 0)) return true;
    if ((left[index] ?? 0) < (right[index] ?? 0)) return false;
  }
  return false;
}

export async function checkLatestRelease(signal?: AbortSignal): Promise<ReleaseInfo | null> {
  try {
    const response = await fetch(RELEASES_URL, {
      signal: signal ?? AbortSignal.timeout(8_000),
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) return null;
    const value = (await response.json()) as {
      tag_name?: unknown;
      html_url?: unknown;
      body?: unknown;
      assets?: Array<{ name?: unknown; browser_download_url?: unknown }>;
    };
    if (typeof value.tag_name !== 'string') return null;
    const apk = (value.assets ?? []).find(
      asset => typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.apk')
    );
    return {
      version: value.tag_name.replace(/^v/i, ''),
      url: typeof value.html_url === 'string' ? value.html_url : '',
      notes: typeof value.body === 'string' ? value.body.slice(0, 600) : '',
      ...(apk && typeof apk.browser_download_url === 'string'
        ? { apkUrl: apk.browser_download_url }
        : {})
    };
  } catch {
    return null;
  }
}
