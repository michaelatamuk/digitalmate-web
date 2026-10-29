import { XMLParser } from 'fast-xml-parser';
import type { RssFeed, RssItem } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  trimValues: true
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['#cdata', '#text', '@_href']) {
      const candidate = record[key];
      if (typeof candidate === 'string' || typeof candidate === 'number') return String(candidate).trim();
    }
  }
  return '';
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function plainSummary(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  const cleaned = decodeEntities(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 480 ? `${cleaned.slice(0, 477)}…` : cleaned;
}

function linkOf(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  for (const link of asArray<unknown>(value)) {
    if (typeof link === 'string') return link.trim();
    if (link && typeof link === 'object') {
      const record = link as Record<string, unknown>;
      const rel = typeof record['@_rel'] === 'string' ? record['@_rel'] : '';
      const href = typeof record['@_href'] === 'string' ? record['@_href'] : text(record);
      if (href && (!rel || rel === 'alternate')) return href.trim();
    }
  }
  return '';
}

function normalize(value: string, base: string): string {
  if (!value) return '';
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function looksLikeImage(url: string, type = ''): boolean {
  if (type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(url);
}

function imageFromMedia(value: unknown, base: string): string {
  for (const item of asArray<unknown>(value)) {
    if (typeof item === 'string') {
      if (looksLikeImage(item)) return normalize(item, base);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = text(record['@_url']) || text(record['@_href']);
    const type = text(record['@_type']);
    if (url && (looksLikeImage(url, type) || record['@_medium'] === 'image')) {
      return normalize(url, base);
    }
  }
  return '';
}

function imageOf(record: Record<string, unknown>, rawHtml: string, base: string): string | undefined {
  const fromMedia =
    imageFromMedia(record.enclosure, base) ||
    imageFromMedia(record['media:content'], base) ||
    imageFromMedia(record['media:thumbnail'], base) ||
    imageFromMedia(record['itunes:image'], base) ||
    imageFromMedia(record.image, base);
  if (fromMedia) return fromMedia;

  const match = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? normalize(match[1], base) : undefined;
}

function looksLikeAudio(url: string, type = ''): boolean {
  if (type.startsWith('audio/')) return true;
  return /\.(mp3|m4a|aac|ogg|opus|wav)(\?|#|$)/i.test(url);
}

function audioOf(record: Record<string, unknown>, base: string): string | undefined {
  for (const value of [record.enclosure, record['media:content'], record['media:group']]) {
    for (const item of asArray<unknown>(value)) {
      if (typeof item === 'string') {
        if (looksLikeAudio(item)) return normalize(item, base);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const media = item as Record<string, unknown>;
      const url = text(media['@_url']) || text(media['@_href']);
      const type = text(media['@_type']);
      if (url && looksLikeAudio(url, type)) return normalize(url, base);
    }
  }
  return undefined;
}

function itemOf(value: unknown, base: string): RssItem | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const title = text(record.title) || text(record['dc:title']);
  const link = normalize(linkOf(record.link) || text(record.guid) || text(record.id), base);
  const rawSummary = text(
    record.description ??
      record.summary ??
      record['content:encoded'] ??
      record.content ??
      record['media:description']
  );
  const summary = plainSummary(rawSummary);
  const image = imageOf(record, rawSummary, base);
  const audio = audioOf(record, base);
  const published =
    text(record.pubDate) ||
    text(record.published) ||
    text(record.updated) ||
    text(record['dc:date']) ||
    undefined;
  const author =
    text(record.author) ||
    text((record.author as Record<string, unknown> | undefined)?.name) ||
    text(record['dc:creator']) ||
    undefined;
  if (!title || !link) return null;
  return {
    title,
    link,
    summary,
    published,
    author,
    ...(image ? { image } : {}),
    ...(audio ? { audio } : {})
  };
}

export function parseFeedXml(xml: string, feedUrl?: string): RssFeed {
  const trimmed = xml.trim();
  if (!trimmed) throw new Error('Feed document is empty');

  let document: Record<string, unknown>;
  try {
    document = parser.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error('Feed is not valid XML');
  }

  const rss = document.rss as Record<string, unknown> | undefined;
  const atom = document.feed as Record<string, unknown> | undefined;
  const rdf = (document['rdf:RDF'] ?? document.RDF) as Record<string, unknown> | undefined;
  const base = feedUrl ? normalize(feedUrl, feedUrl) : '';

  if (rss) {
    const channel = (rss.channel ?? {}) as Record<string, unknown>;
    const items = asArray(channel.item)
      .map(item => itemOf(item, base))
      .filter((item): item is RssItem => item !== null);
    return {
      format: 'rss',
      title: text(channel.title) || 'RSS feed',
      description: plainSummary(channel.description),
      link: normalize(linkOf(channel.link), base),
      items
    };
  }

  if (atom) {
    const items = asArray(atom.entry)
      .map(item => itemOf(item, base))
      .filter((item): item is RssItem => item !== null);
    return {
      format: 'atom',
      title: text(atom.title) || 'Atom feed',
      description: plainSummary(atom.subtitle),
      link: normalize(linkOf(atom.link), base),
      items
    };
  }

  if (rdf) {
    const channel = (rdf.channel ?? {}) as Record<string, unknown>;
    const items = asArray(rdf.item)
      .map(item => itemOf(item, base))
      .filter((item): item is RssItem => item !== null);
    return {
      format: 'rdf',
      title: text(channel.title) || 'RDF feed',
      description: plainSummary(channel.description),
      link: normalize(linkOf(channel.link), base),
      items
    };
  }

  throw new Error('Unsupported feed format: expected RSS 2.0, Atom or RDF');
}
