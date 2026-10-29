import { useMemo, useState } from 'react';
import type { FeedCard, Reaction, RssFeed } from '../types';
import { Icon } from './Icons';
import { seedFor } from '../data/seed';
import { fetchRssFeed } from '../lib/rss';
import { useI18n } from '../i18n/I18nContext';

interface DiscoveryProps {
  cards: FeedCard[];
  reactions: Record<string, Reaction>;
  saved: string[];
  topics: string[];
  onToggleTopic: (topic: string) => void;
  onClearTopics: () => void;
  onReact: (id: string, reaction: Reaction) => void;
  onSave: (id: string) => void;
  onOpen: (card: FeedCard) => void;
  onRefresh: () => void;
  onAddRss: (name: string, url: string, feed: RssFeed) => void;
  onNotice: (message: string) => void;
}

export function DiscoveryView({
  cards,
  reactions,
  saved,
  topics,
  onToggleTopic,
  onClearTopics,
  onReact,
  onSave,
  onOpen,
  onRefresh,
  onAddRss,
  onNotice
}: DiscoveryProps) {
  const { lang, tr } = useI18n();
  const { discoverySources, topicOptions } = seedFor(lang);
  const [activeSource, setActiveSource] = useState('all');
  const [rssOpen, setRssOpen] = useState(false);
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssBusy, setRssBusy] = useState(false);

  const visible = useMemo(() => {
    return cards.filter(card => {
      if (activeSource !== 'all' && card.source !== activeSource) return false;
      if (topics.length > 0 && !topics.includes(card.topic)) return false;
      return true;
    });
  }, [activeSource, cards, topics]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) counts.set(card.source, (counts.get(card.source) ?? 0) + 1);
    return counts;
  }, [cards]);

  const submitRss = async () => {
    const url = rssUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      onNotice(tr('Enter a valid RSS / Atom URL.', '请输入有效的 RSS / Atom URL。'));
      return;
    }
    if (rssBusy) return;
    setRssBusy(true);
    try {
      const feed = await fetchRssFeed(url);
      const name = rssName.trim() || feed.title || new URL(url).hostname.replace(/^www\./, '');
      onAddRss(name, url, feed);
      setRssName('');
      setRssUrl('');
      setRssOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onNotice(tr(`Could not import the feed: ${message}`, `无法导入订阅：${message}`));
    } finally {
      setRssBusy(false);
    }
  };

  return (
    <div className="discovery-view">
      <div className="interest-card">
        <div className="interest-head">
          <div>
            <span className="eyebrow">{tr('Tune your feed', '为你调整')}</span>
            <strong>{tr('What do you want to see more of?', '最近想多看一些什么？')}</strong>
          </div>
          <div className="interest-actions">
            <button type="button" className="ghost-action" onClick={() => setRssOpen(open => !open)}>
              <Icon name="rss" size={14} />
              RSS
            </button>
            <button type="button" className="ghost-action" onClick={onRefresh}>
              <Icon name="refresh" size={15} />
              {tr('Refresh', '换一批')}
            </button>
          </div>
        </div>
        <div className="topic-row">
          <button
            type="button"
            className={`topic-chip ${topics.length === 0 ? 'is-active' : ''}`}
            onClick={onClearTopics}
          >
            {tr('All', '全部')}
          </button>
          {topicOptions.map(topic => (
            <button
              type="button"
              key={topic}
              className={`topic-chip ${topics.includes(topic) ? 'is-active' : ''}`}
              onClick={() => onToggleTopic(topic)}
            >
              {topic}
              {topics.includes(topic) ? <Icon name="check" size={12} /> : null}
            </button>
          ))}
        </div>
        <p className="interest-note">
          {tr(
            'Tap a topic to tune recommendations. The demo filters the local inventory immediately; the real client writes feedback into interest memory and triggers refills.',
            '点击主题调整推荐。演示版会立即过滤本地库存；真实版本会把反馈写入兴趣记忆并触发补货。'
          )}
        </p>
      </div>

      <div className="source-strip" role="tablist" aria-label={tr('Content sources', '内容来源')}>
        {discoverySources.map(source => {
          const count = source.id === 'all' ? cards.length : sourceCounts.get(source.id) ?? 0;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={activeSource === source.id}
              key={source.id}
              className={`source-pill ${activeSource === source.id ? 'is-active' : ''} ${count === 0 ? 'is-empty' : ''}`}
              onClick={() => setActiveSource(source.id)}
            >
              {source.label}
              <em>{count}</em>
            </button>
          );
        })}
        <button type="button" className="source-pill is-add" onClick={() => setRssOpen(open => !open)}>
          <Icon name="plus" size={13} />
          RSS
        </button>
      </div>

      {rssOpen ? (
        <div className="rss-form">
          <div className="rss-form-head">
            <strong>{tr('Add RSS / Atom', '添加 RSS / Atom')}</strong>
            <button type="button" className="icon-button" onClick={() => setRssOpen(false)} aria-label={tr('Close', '关闭')}>
              <Icon name="close" size={16} />
            </button>
          </div>
            <input
            value={rssUrl}
            onChange={event => setRssUrl(event.target.value)}
            placeholder="https://example.com/feed.xml"
            aria-label={tr('RSS URL', 'RSS 地址')}
          />
          <div className="rss-form-row">
            <input
              value={rssName}
              onChange={event => setRssName(event.target.value)}
              placeholder={tr('Name (optional)', '名称（可选）')}
              aria-label={tr('RSS name', 'RSS 名称')}
            />
            <button type="button" className="primary-action" onClick={() => void submitRss()} disabled={rssBusy}>
              {rssBusy ? tr('Fetching…', '抓取中…') : tr('Add', '添加')}
            </button>
          </div>
          <p>{tr(
            'The feed is fetched through the local /api/rss proxy, parsed as RSS 2.0, Atom or RDF, and only admitted if it contains usable items.',
            '订阅通过本地 /api/rss 代理抓取，按 RSS 2.0、Atom 或 RDF 解析，只有包含可用条目时才会入池。'
          )}</p>
        </div>
      ) : null}

      <div className="feed-meta">
        <span>{tr(`${visible.length} items · local inventory`, `${visible.length} 条内容 · 本地库存`)}</span>
        <span>{tr(`${new Set(visible.map(card => card.source)).size} sources enabled`, `已启用 ${new Set(visible.map(card => card.source)).size} 个来源`)}</span>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-orb">
            <Icon name="compass" size={26} />
          </div>
          <strong>{tr('No content for this combination', '这个组合还没有内容')}</strong>
          <p>{tr('Try another source or clear the topic filters.', '换一个来源，或者清除主题过滤。')}</p>
          <button type="button" className="primary-action" onClick={() => { setActiveSource('all'); onClearTopics(); }}>
            {tr('View all', '查看全部')}
          </button>
        </div>
      ) : (
        <div className="feed-grid">
          {visible.map((card, index) => {
            const reaction = reactions[card.id];
            const isSaved = saved.includes(card.id);
            return (
              <article
                className="feed-card"
                key={card.id}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                onClick={() => onOpen(card)}
                tabIndex={0}
                role="button"
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') onOpen(card);
                }}
              >
                <div className="feed-cover" style={{ background: card.cover }}>
                  <span className="feed-glyph" aria-hidden="true">
                    {card.glyph}
                  </span>
                  <span className="feed-source-badge">{card.sourceLabel}</span>
                  <span className="feed-metric-badge">{card.metric}</span>
                </div>
                <div className="feed-body">
                  <div className="feed-kicker">
                    <span>{card.topic}</span>
                    <span>·</span>
                    <span>{card.readingTime}</span>
                  </div>
                  <h2>{card.title}</h2>
                  <p>{card.summary}</p>
                  <div className="tag-row">
                    {card.tags.map(tag => (
                      <span className="mini-tag" key={`${card.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="feed-footer">
                    <span>{card.published}</span>
                    <div className="reaction-row" onClick={event => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`reaction-button ${reaction === 'like' ? 'is-like' : ''}`}
                        aria-label={tr('Like', '喜欢')}
                        onClick={() => onReact(card.id, reaction === 'like' ? undefined : 'like')}
                      >
                        <Icon name="thumbUp" size={15} filled={reaction === 'like'} />
                      </button>
                      <button
                        type="button"
                        className={`reaction-button ${reaction === 'dislike' ? 'is-dislike' : ''}`}
                        aria-label={tr('Not interested', '不感兴趣')}
                        onClick={() => onReact(card.id, reaction === 'dislike' ? undefined : 'dislike')}
                      >
                        <Icon name="thumbDown" size={15} filled={reaction === 'dislike'} />
                      </button>
                      <button
                        type="button"
                        className={`reaction-button ${isSaved ? 'is-saved' : ''}`}
                        aria-label={tr('Save', '收藏')}
                        onClick={() => onSave(card.id)}
                      >
                        <Icon name="bookmark" size={15} filled={isSaved} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="feed-end">
        <span className="live-dot" />
        {tr('Stock healthy · keep scrolling to refill', '库存充足 · 继续下滑会触发补货')}
      </div>
    </div>
  );
}
