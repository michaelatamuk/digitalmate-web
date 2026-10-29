import { useMemo, useState } from 'react';
import type { FeedCard, Reaction, RssFeed } from '../types';
import type { DiscoveryFilters } from '../transport/discovery';
import { Icon } from './Icons';
import { seedFor } from '../data/seed';
import { fetchRssFeed } from '../lib/rss';
import { coverForCard } from '../lib/covers';
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
  filterCards: (cards: FeedCard[], filters: DiscoveryFilters) => FeedCard[];
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
  onNotice,
  filterCards
}: DiscoveryProps) {
  const { lang, tr } = useI18n();
  const { discoverySources, topicOptions } = seedFor(lang);
  const [activeSource, setActiveSource] = useState('all');
  const [query, setQuery] = useState('');
  const [rssOpen, setRssOpen] = useState(false);
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssBusy, setRssBusy] = useState(false);

  const visible = useMemo(() => {
    return filterCards(cards, { source: activeSource, topics, query });
  }, [activeSource, cards, filterCards, query, topics]);

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
        <div className="search-field">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={tr('Search titles, sources and tags', '搜索标题、来源和标签')}
            aria-label={tr('Search feed', '搜索发现流')}
          />
          {query ? (
            <button type="button" className="icon-button" aria-label={tr('Clear search', '清除搜索')} onClick={() => setQuery('')}>
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="source-strip" role="group" aria-label={tr('Content sources', '内容来源')}>
        {discoverySources.map(source => {
          const count = source.id === 'all' ? cards.length : sourceCounts.get(source.id) ?? 0;
          return (
            <button
              type="button"
              aria-pressed={activeSource === source.id}
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
        <span>
          {query.trim()
            ? tr(`${visible.length} results for “${query.trim()}”`, `“${query.trim()}” 的 ${visible.length} 条结果`)
            : tr(`${visible.length} items · local inventory`, `${visible.length} 条内容 · 本地库存`)}
        </span>
        <span>{tr(`${new Set(visible.map(card => card.source)).size} sources enabled`, `已启用 ${new Set(visible.map(card => card.source)).size} 个来源`)}</span>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-orb">
            <Icon name={query.trim() ? 'search' : 'compass'} size={26} />
          </div>
          <strong>
            {query.trim()
              ? tr('No local matches', '本地没有匹配内容')
              : tr('No content for this combination', '这个组合还没有内容')}
          </strong>
          <p>
            {query.trim()
              ? tr('Try a shorter search or clear the source and topic filters.', '试试更短的关键词，或清除来源与主题过滤。')
              : tr('Try another source or clear the topic filters.', '换一个来源，或者清除主题过滤。')}
          </p>
          <button
            type="button"
            className="primary-action"
            onClick={() => {
              if (query.trim()) {
                setQuery('');
                return;
              }
              setActiveSource('all');
              onClearTopics();
            }}
          >
            {query.trim() ? tr('Clear search', '清除搜索') : tr('View all', '查看全部')}
          </button>
        </div>
      ) : (
        <div className="feed-grid">
          {visible.map((card, index) => {
            const reaction = reactions[card.id];
            const isSaved = saved.includes(card.id);
            const cover = coverForCard(card);
            return (
              <article
                className="feed-card"
                key={card.id}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <div className="feed-cover-wrap">
                  <button
                    type="button"
                    className="feed-cover-button"
                    onClick={() => onOpen(card)}
                    aria-label={tr(`Open ${card.title}`, `打开 ${card.title}`)}
                  >
                    <div className="feed-cover" style={{ background: card.cover }}>
                      <img className="feed-cover-image" src={cover} alt="" loading="lazy" />
                    </div>
                  </button>
                  <span className="feed-source-badge">{card.sourceLabel}</span>
                  <span className="feed-metric-badge">{card.metric}</span>
                </div>
                <div className="feed-body">
                  <div className="feed-kicker">
                    <span>{card.topic}</span>
                    <span>·</span>
                    <span>{card.readingTime}</span>
                  </div>
                  <h2>
                    <button type="button" className="feed-title-button" onClick={() => onOpen(card)}>
                      {card.title}
                    </button>
                  </h2>
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
