import { describe, expect, it } from 'vitest';
import { parseFeedXml } from '../src/lib/rssParse';
import { assertFetchableUrl } from '../server/rss';

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Weekly</title>
    <link>https://example.com/</link>
    <description><![CDATA[A feed about <b>tools</b> and ideas.]]></description>
    <item>
      <title>First post</title>
      <link>https://example.com/first</link>
      <description><![CDATA[<p>Hello <strong>world</strong> &amp; friends.</p>]]></description>
      <pubDate>Tue, 27 Oct 2026 08:00:00 GMT</pubDate>
      <dc:creator>Ada</dc:creator>
    </item>
    <item>
      <title>Second post</title>
      <link>/second</link>
      <description>Plain summary</description>
    </item>
    <item>
      <title>Broken item without a link</title>
    </item>
  </channel>
</rss>`;

const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Notes</title>
  <subtitle>Short updates</subtitle>
  <link href="https://notes.example.com/" rel="alternate"/>
  <entry>
    <title>Entry one</title>
    <link rel="alternate" href="https://notes.example.com/one"/>
    <summary>An atom summary</summary>
    <published>2026-10-28T09:30:00Z</published>
    <author><name>Grace</name></author>
  </entry>
</feed>`;

describe('RSS / Atom parser', () => {
  it('parses RSS 2.0, strips HTML and skips unusable items', () => {
    const feed = parseFeedXml(rss, 'https://example.com/feed.xml');
    expect(feed.format).toBe('rss');
    expect(feed.title).toBe('Example Weekly');
    expect(feed.description).toBe('A feed about tools and ideas.');
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toMatchObject({
      title: 'First post',
      link: 'https://example.com/first',
      summary: 'Hello world & friends.',
      author: 'Ada'
    });
    expect(feed.items[1].link).toBe('https://example.com/second');
  });

  it('parses Atom entries and alternate links', () => {
    const feed = parseFeedXml(atom, 'https://notes.example.com/feed.xml');
    expect(feed.format).toBe('atom');
    expect(feed.title).toBe('Atom Notes');
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({
      title: 'Entry one',
      link: 'https://notes.example.com/one',
      summary: 'An atom summary',
      author: 'Grace'
    });
  });

  it('rejects empty, malformed and unsupported documents', () => {
    expect(() => parseFeedXml('   ')).toThrow(/empty/i);
    expect(() => parseFeedXml('<html><body>not a feed</body></html>')).toThrow(/Unsupported/);
  });

  it('extracts article images from media, enclosures and descriptions', () => {
    const feed = parseFeedXml(
      `<?xml version="1.0"?>
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
          <title>Images</title>
          <item>
            <title>Media image</title>
            <link>https://example.com/one</link>
            <media:content url="https://example.com/media.jpg" type="image/jpeg"/>
          </item>
          <item>
            <title>Enclosure image</title>
            <link>https://example.com/two</link>
            <enclosure url="https://example.com/enclosure.png" type="image/png"/>
          </item>
          <item>
            <title>HTML image</title>
            <link>https://example.com/three</link>
            <description><![CDATA[<p>Hello</p><img src="/inline.webp" alt="x"/>]]></description>
          </item>
        </channel>
      </rss>`,
      'https://example.com/feed.xml'
    );
    expect(feed.items[0].image).toBe('https://example.com/media.jpg');
    expect(feed.items[1].image).toBe('https://example.com/enclosure.png');
    expect(feed.items[2].image).toBe('https://example.com/inline.webp');
  });

  it('extracts podcast audio from enclosures', () => {
    const feed = parseFeedXml(
      `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Audio</title>
          <item>
            <title>Episode one</title>
            <link>https://example.com/episode-1</link>
            <enclosure url="https://example.com/episode.mp3" type="audio/mpeg" length="123"/>
            <description>An episode</description>
          </item>
        </channel>
      </rss>`,
      'https://example.com/feed.xml'
    );
    expect(feed.items[0].audio).toBe('https://example.com/episode.mp3');
  });
});

describe('RSS proxy URL guard', () => {
  it('accepts public http(s) URLs', () => {
    expect(assertFetchableUrl('https://example.com/feed.xml').hostname).toBe('example.com');
    expect(assertFetchableUrl('http://feeds.bbci.co.uk/news/rss.xml').protocol).toBe('http:');
  });

  it('blocks loopback, private ranges and non-http schemes', () => {
    for (const url of [
      'http://localhost/feed',
      'http://127.0.0.1/feed',
      'http://10.0.0.5/feed',
      'http://192.168.1.2/feed',
      'http://172.16.0.1/feed',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/feed',
      'file:///etc/passwd'
    ]) {
      expect(() => assertFetchableUrl(url), url).toThrow();
    }
  });
});
