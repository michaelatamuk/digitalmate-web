import { useEffect, useMemo, useRef, useState } from 'react';
import type { FeedCard, Reaction, RssFeed } from '../types';
import type { DiscoveryFilters } from '../transport/discovery';
import { Icon } from './Icons';
import { seedFor } from '../data/seed';
import { fetchRssFeed } from '../lib/rss';
import { coverForCard, fallbackCoverForCard } from '../lib/covers';
import { cardKind, parseTopicIntent, rankCards } from '../lib/discoveryExperience';
import { isVoiceRecognitionSupported, startVoiceRecognition } from '../lib/voice';
import type { VoiceSession } from '../lib/voice';
import { useI18n } from '../i18n/I18nContext';

interface DiscoveryProps {
  cards: FeedCard[];
  reactions: Record<string, Reaction>;
  saved: string[];
  topics: string[];
  topicOrder: string[];
  hiddenTopics: string[];
  readCards: string[];
  enabledSources: string[];
  onToggleTopic: (topic: string) => void;
  onClearTopics: () => void;
  onApplyTopics: (topics: string[]) => void;
  onMoveTopic: (topic: string, direction: -1 | 1) => void;
  onToggleTopicVisibility: (topic: string) => void;
  onResetTopicOrder: () => void;
  onToggleSource: (source: string) => void;
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
  topicOrder,
  hiddenTopics,
  readCards,
  enabledSources,
  onToggleTopic,
  onClearTopics,
  onApplyTopics,
  onMoveTopic,
  onToggleTopicVisibility,
  onResetTopicOrder,
  onToggleSource,
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
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [listening, setListening] = useState(false);
  const voiceRef = useRef<VoiceSession | null>(null);
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssBusy, setRssBusy] = useState(false);

  useEffect(
    () => () => {
      voiceRef.current?.abort();
      voiceRef.current = null;
    },
    []
  );

  const enabled = useMemo(
    () => cards.filter(card => enabledSources.length === 0 || enabledSources.includes(card.source)),
    [cards, enabledSources]
  );

  const visible = useMemo(() => {
    const filtered = filterCards(enabled, { source: activeSource, topics, query });
    return rankCards(filtered, reactions, saved);
  }, [activeSource, enabled, filterCards, query, reactions, saved, topics]);

  const shown = visible.slice(0, visibleCount);
  const orderedTopics = useMemo(() => {
    const order = new Map(topicOrder.map((topic, index) => [topic, index]));
    return topicOptions
      .filter(topic => !hiddenTopics.includes(topic))
      .sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
  }, [hiddenTopics, topicOptions, topicOrder]);
  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of enabled) counts.set(card.source, (counts.get(card.source) ?? 0) + 1);
    return counts;
  }, [enabled]);

  const applyNaturalLanguage = (text: string) => {
    const matched = parseTopicIntent(text, topicOptions, lang);
    if (matched) {
      onApplyTopics(matched);
      setQuery('');
      onNotice(
        tr(
          `Topics updated to ${matched.join(' · ')}.`,
          `主题已调整为 ${matched.join(' · ')}。`
        )
      );
      return;
    }
    setQuery(text);
  };

  const toggleListening = () => {
    if (listening) {
      voiceRef.current?.stop();
      voiceRef.current = null;
      setListening(false);
      return;
    }
    if (!isVoiceRecognitionSupported()) {
      onNotice(
        tr('Voice input is not available in this browser.', '当前浏览器不支持语音输入。')
      );
      return;
    }
    let transcript = '';
    const session = startVoiceRecognition({
      lang,
      onTranscript: (text, final) => {
        transcript = text;
        if (final) setQuery(text);
      },
      onEnd: () => {
        setListening(false);
        voiceRef.current = null;
        if (transcript.trim()) applyNaturalLanguage(transcript.trim());
      },
      onError: () => {
        setListening(false);
        voiceRef.current = null;
      }
    });
    if (session) {
      voiceRef.current = session;
      setListening(true);
    }
  };

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
          {orderedTopics.map(topic => (
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
          <button
            type="button"
            className="topic-chip is-add"
            aria-expanded={topicsOpen}
            onClick={() => setTopicsOpen(open => !open)}
          >
            <Icon name="filter" size={12} />
            {tr('Edit', '编辑')}
          </button>
        </div>

        {topicsOpen ? (
          <div className="topic-manage">
            {topicOptions.map(topic => {
              const hidden = hiddenTopics.includes(topic);
              const visibleIndex = orderedTopics.indexOf(topic);
              return (
                <div className={`topic-manage-row ${hidden ? 'is-hidden' : ''}`} key={topic}>
                  <span>{topic}</span>
                  <div>
                    <button
                      type="button"
                      aria-label={tr(`Move ${topic} earlier`, `前移 ${topic}`)}
                      disabled={hidden || visibleIndex <= 0}
                      onClick={() => onMoveTopic(topic, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={tr(`Move ${topic} later`, `后移 ${topic}`)}
                      disabled={hidden || visibleIndex < 0 || visibleIndex >= orderedTopics.length - 1}
                      onClick={() => onMoveTopic(topic, 1)}
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => onToggleTopicVisibility(topic)}>
                      {hidden ? tr('Show', '显示') : tr('Hide', '隐藏')}
                    </button>
                  </div>
                </div>
              );
            })}
            <button type="button" className="secondary-action" onClick={onResetTopicOrder}>
              <Icon name="refresh" size={13} />
              {tr('Reset topic order', '重置主题顺序')}
            </button>
          </div>
        ) : null}
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
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyNaturalLanguage(query.trim());
              }
            }}
            placeholder={tr(
              'Search, or say “more robotics and open source”',
              '搜索，或说“多点机器人和开源项目”'
            )}
            aria-label={tr('Search feed', '搜索发现流')}
          />
          <button
            type="button"
            className={`icon-button ${listening ? 'is-listening' : ''}`}
            aria-label={listening ? tr('Stop voice input', '停止语音输入') : tr('Voice topic edit', '语音调整主题')}
            aria-pressed={listening}
            onClick={toggleListening}
          >
            <Icon name="mic" size={15} />
          </button>
          {query ? (
            <button type="button" className="icon-button" aria-label={tr('Clear search', '清除搜索')} onClick={() => setQuery('')}>
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="source-strip" role="group" aria-label={tr('Content sources', '内容来源')}>
        {discoverySources.map(source => {
          const count = source.id === 'all' ? enabled.length : sourceCounts.get(source.id) ?? 0;
          const isEnabled = source.id === 'all' || enabledSources.length === 0 || enabledSources.includes(source.id);
          return (
            <button
              type="button"
              aria-pressed={activeSource === source.id}
              key={source.id}
              className={`source-pill ${activeSource === source.id ? 'is-active' : ''} ${count === 0 ? 'is-empty' : ''} ${isEnabled ? '' : 'is-disabled'}`}
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
        <button
          type="button"
          className="source-pill is-add"
          aria-expanded={sourcesOpen}
          onClick={() => setSourcesOpen(open => !open)}
        >
          <Icon name="filter" size={13} />
          {tr('Sources', '来源')}
        </button>
      </div>

      {sourcesOpen ? (
        <div className="source-manage">
          <p className="settings-note">
            {tr(
              'Sources enabled for this device. Disabled sources are hidden until you re-enable them.',
              '此设备启用的来源。关闭后，该来源的内容会被隐藏。'
            )}
          </p>
          <div className="source-manage-grid">
            {discoverySources
              .filter(source => source.id !== 'all')
              .map(source => {
                const isEnabled = enabledSources.length === 0 || enabledSources.includes(source.id);
                return (
                  <button
                    type="button"
                    key={source.id}
                    className={`source-toggle ${isEnabled ? 'is-active' : ''}`}
                    aria-pressed={isEnabled}
                    onClick={() => onToggleSource(source.id)}
                  >
                    <span className="check-box">{isEnabled ? <Icon name="check" size={12} /> : null}</span>
                    {source.label}
                  </button>
                );
              })}
          </div>
        </div>
      ) : null}

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
          {shown.map((card, index) => {
            const reaction = reactions[card.id];
            const isSaved = saved.includes(card.id);
            const isRead = readCards.includes(card.id);
            const kind = cardKind(card);
            const cover = coverForCard(card);
            const kindLabel =
              kind === 'video'
                ? tr('Video', '视频')
                : kind === 'audio'
                  ? tr('Audio', '音频')
                  : kind === 'discussion'
                    ? tr('Discussion', '讨论')
                    : tr('Article', '文章');
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
                      <img
                        className="feed-cover-image"
                        src={cover}
                        alt=""
                        loading="lazy"
                        onError={event => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = fallbackCoverForCard(card);
                        }}
                      />
                    </div>
                  </button>
                  <span className="feed-source-badge">{card.sourceLabel}</span>
                  <span className="feed-kind-badge">
                    {kind === 'video' || kind === 'audio' ? <Icon name="play" size={10} /> : null}
                    {kindLabel}
                  </span>
                  {isRead ? <span className="feed-read-badge">{tr('Read', '已读')}</span> : null}
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

      {visible.length > shown.length ? (
        <button
          type="button"
          className="secondary-action load-more"
          onClick={() => setVisibleCount(count => count + 8)}
        >
          <Icon name="chevronDown" size={14} />
          {tr(`Load more (${visible.length - shown.length})`, `加载更多（${visible.length - shown.length}）`)}
        </button>
      ) : null}

      <div className="feed-end">
        <span className="live-dot" />
        {tr('Stock healthy · keep scrolling to refill', '库存充足 · 继续下滑会触发补货')}
      </div>
    </div>
  );
}
