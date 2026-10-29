import { useEffect, useMemo, useRef, useState } from 'react';
import type { FeedCard, Language, MemoryProfile, Message, Reaction, Settings, Skill } from '../types';
import { Icon } from './Icons';
import { BeeBou } from './BeeBou';
import { renderMarkdown } from '../lib/markdown';
import { useI18n } from '../i18n/I18nContext';

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  wide
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { tr } = useI18n();
  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label={tr('Close', '关闭')} />
      <section className={`sheet-panel ${wide ? 'is-wide' : ''}`}>
        <div className="sheet-grabber" />
        <header className="sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={tr('Close', '关闭')}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="sheet-content">{children}</div>
      </section>
    </div>
  );
}

export function BottomNav({ tab, onTab }: { tab: 'chat' | 'discover'; onTab: (tab: 'chat' | 'discover') => void }) {
  const { tr } = useI18n();
  return (
    <nav className={`bottom-nav ${tab === 'discover' ? 'is-glass' : ''}`} aria-label={tr('Main navigation', '主导航')}>
      <button
        type="button"
        className={`nav-item ${tab === 'chat' ? 'is-active' : ''}`}
        onClick={() => onTab('chat')}
        aria-current={tab === 'chat' ? 'page' : undefined}
      >
        <Icon name="chat" size={22} />
        <span>{tr('Chat', '对话')}</span>
      </button>
      <button
        type="button"
        className={`nav-item ${tab === 'discover' ? 'is-active' : ''}`}
        onClick={() => onTab('discover')}
        aria-current={tab === 'discover' ? 'page' : undefined}
      >
        <Icon name="compass" size={22} />
        <span>{tr('Discover', '发现')}</span>
      </button>
    </nav>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <span className="toast-dot" />
      {message}
    </div>
  );
}

export function HistorySheet({
  messages,
  onClose,
  onSelect,
  onNewChat
}: {
  messages: Message[];
  onClose: () => void;
  onSelect: () => void;
  onNewChat: () => void;
}) {
  const { tr, locale } = useI18n();
  const turns = useMemo(() => {
    const result: { id: string; prompt: string; reply: string; time: number }[] = [];
    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      if (message.role !== 'user') continue;
      const next = messages[index + 1];
      result.push({
        id: message.id,
        prompt: message.text,
        reply: next?.text?.slice(0, 80) ?? tr('Task submitted', '任务已提交'),
        time: message.createdAt
      });
    }
    return result.reverse();
  }, [messages]);

  return (
    <Sheet title={tr('History', '历史记录')} subtitle={tr(`${turns.length} tasks · saved locally`, `${turns.length} 个任务 · 本地保存`)} onClose={onClose}>
      <button type="button" className="primary-action full" onClick={onNewChat}>
        <Icon name="plus" size={16} />
        {tr('Start a new chat', '开始新对话')}
      </button>
      {turns.length === 0 ? (
        <div className="empty-state compact">
          <div className="empty-orb">
            <Icon name="clock" size={22} />
          </div>
          <strong>{tr('No history yet', '还没有历史任务')}</strong>
          <p>{tr('Tasks you start from the home screen will appear here.', '从首页发起一个任务后，会出现在这里。')}</p>
        </div>
      ) : (
        <div className="history-list">
          {turns.map(turn => (
            <button type="button" className="history-row" key={turn.id} onClick={onSelect}>
              <span className="history-icon">
                <Icon name="chat" size={16} />
              </span>
              <span className="history-copy">
                <strong>{turn.prompt}</strong>
                <em>{turn.reply}</em>
                <time>
                  {new Date(turn.time).toLocaleString(locale, {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </span>
              <Icon name="chevronRight" size={16} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function MoreSheet({
  onClose,
  onSkills,
  onMemory,
  onHistory,
  onSettings,
  onNewChat,
  onDemo,
  onProtocol
}: {
  onClose: () => void;
  onSkills: () => void;
  onMemory: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onNewChat: () => void;
  onDemo: () => void;
  onProtocol: () => void;
}) {
  const { tr } = useI18n();
  const items = [
    { icon: 'play' as const, title: tr('Guided demo', '引导演示'), subtitle: tr('Run the 2-minute walkthrough automatically', '自动播放两分钟演示流程'), onClick: onDemo },
    { icon: 'grid' as const, title: tr('A2UI protocol demo', 'A2UI 协议演示'), subtitle: tr('Render a surface parsed from JSONL envelopes', '渲染由 JSONL 信封解析出的界面'), onClick: onProtocol },
    { icon: 'spark' as const, title: tr('Skill center', '技能中心'), subtitle: tr('Install, enable and manage skills', '安装、启用和管理技能'), onClick: onSkills },
    { icon: 'heart' as const, title: tr('About you', '关于你'), subtitle: tr('Long-term memory and public profile', '长期记忆与公开画像'), onClick: onMemory },
    { icon: 'clock' as const, title: tr('History', '历史记录'), subtitle: tr('Return to a previous task', '回到之前完成的任务'), onClick: onHistory },
    { icon: 'settings' as const, title: tr('Settings', '设置'), subtitle: tr('Connections, notifications and demo options', '连接、通知和演示选项'), onClick: onSettings },
    { icon: 'plus' as const, title: tr('Start a new chat', '开始新对话'), subtitle: tr('Clear the current thread, keep history', '清空当前消息，保留历史记录'), onClick: onNewChat }
  ];

  return (
    <Sheet title={tr('More', '更多')} subtitle={tr('DigitalMate Web · local demo', 'DigitalMate Web · 本地演示')} onClose={onClose}>
      <div className="menu-list">
        {items.map(item => (
          <button type="button" className="menu-row" key={item.title} onClick={item.onClick}>
            <span className="menu-icon">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="menu-copy">
              <strong>{item.title}</strong>
              <em>{item.subtitle}</em>
            </span>
            <Icon name="chevronRight" size={16} />
          </button>
        ))}
      </div>
      <div className="sheet-footnote">
        <Icon name="info" size={14} />
        {tr(
          'A web re-creation of the DigitalMate HarmonyOS client. It is not connected to a real Orbit service.',
          '这是对 DigitalMate 鸿蒙客户端的 Web 交互复刻，不连接真实 Orbit 服务。'
        )}
      </div>
    </Sheet>
  );
}

function skillActionLabel(skill: Skill, tr: (en: string, zh: string) => string): string {
  if (!skill.installed) return tr('Install', '安装');
  return skill.enabled ? tr('Enabled', '已启用') : tr('Disabled', '已停用');
}

export function SkillsSheet({
  skills,
  onClose,
  onToggle,
  onUninstall,
  onNotice
}: {
  skills: Skill[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onUninstall: (id: string) => void;
  onNotice: (message: string) => void;
}) {
  const { tr } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(skills.map(skill => skill.category)))];
  const installedCount = skills.filter(skill => skill.installed).length;

  const visible = skills.filter(skill => {
    if (category !== 'All' && skill.category !== category) return false;
    if (query.trim() && !`${skill.name}${skill.description}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <Sheet title={tr('Skill center', '技能中心')} subtitle={tr(`${installedCount} installed · ${skills.length} available`, `${installedCount} 个已安装 · ${skills.length} 个可用`)} onClose={onClose} wide>
      <div className="search-field">
        <Icon name="search" size={17} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr('Search skills or capabilities', '搜索技能或能力')} />
      </div>
      <div className="filter-row">
        {categories.map(item => (
          <button
            type="button"
            key={item}
            className={`filter-chip ${category === item ? 'is-active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item === 'All' ? tr('All', '全部') : item}
          </button>
        ))}
      </div>
      <div className="skill-list">
        {visible.map(skill => (
          <article className={`skill-card ${skill.installed ? 'is-installed' : ''}`} key={skill.id}>
            <span className="skill-icon">{skill.icon}</span>
            <div className="skill-copy">
              <div className="skill-title-row">
                <strong>{skill.name}</strong>
                {skill.builtin ? <span className="builtin-tag">{tr('Built-in', '内置')}</span> : null}
                <span className="skill-category">{skill.category}</span>
              </div>
              <p>{skill.description}</p>
              <span className="skill-author">{tr(`by ${skill.author}`, `作者 ${skill.author}`)}</span>
            </div>
            <div className="skill-actions">
              <button
                type="button"
                className={`skill-toggle ${skill.installed && skill.enabled ? 'is-on' : ''}`}
                onClick={() => {
                  onToggle(skill.id);
                  onNotice(skill.installed ? (skill.enabled ? tr(`Disabled ${skill.name}`, `已停用 ${skill.name}`) : tr(`Enabled ${skill.name}`, `已启用 ${skill.name}`)) : tr(`Installed ${skill.name}`, `已安装 ${skill.name}`));
                }}
              >
                {skillActionLabel(skill, tr)}
              </button>
              {skill.installed && !skill.builtin ? (
                <button type="button" className="skill-remove" onClick={() => onUninstall(skill.id)}>
                  {tr('Uninstall', '卸载')}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 ? <p className="muted-note">{tr('No matching skills.', '没有匹配的技能。')}</p> : null}
      <div className="sheet-footnote">
        <Icon name="shield" size={14} />
        {tr(
          'In the real client, install state and permissions come from the cloud skill service; this is a local demo.',
          '真实版本的技能安装状态与权限由云端技能服务返回；这里只做本地演示。'
        )}
      </div>
    </Sheet>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export function SettingsSheet({
  settings,
  onChange,
  onClose,
  onReset,
  onNotice,
  onLanguageChange,
  savedCount,
  messageCount
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  onReset: () => void;
  onNotice: (message: string) => void;
  onLanguageChange: (language: Language) => void;
  savedCount: number;
  messageCount: number;
}) {
  const { tr, lang } = useI18n();
  return (
    <Sheet title={tr('Settings', '设置')} subtitle={tr('Local demo · nothing is uploaded', '本地演示 · 不会上传任何数据')} onClose={onClose} wide>
      <div className="account-card">
        <span className="account-avatar">{lang === 'zh' ? '林' : 'L'}</span>
        <div>
          <strong>{tr('Lin Wei', '林未')}</strong>
          <span>{tr('Local demo account · Shenzhen', '本地演示账号 · 深圳')}</span>
        </div>
        <span className="connection-pill is-demo">
          <span className="connection-dot" />
          {tr('Local demo', '本地演示')}
        </span>
      </div>

      <div className="settings-group">
        <span className="settings-label">{tr('Language', '语言')}</span>
        <div className="segmented">
          <button
            type="button"
            className={lang === 'en' ? 'is-active' : ''}
            onClick={() => onLanguageChange('en')}
          >
            English
          </button>
          <button
            type="button"
            className={lang === 'zh' ? 'is-active' : ''}
            onClick={() => onLanguageChange('zh')}
          >
            中文
          </button>
        </div>
        <p className="settings-note">
          {tr('Switching language resets the current conversation and discovery feed so everything uses the selected language.', '切换语言会重置当前对话和发现流，确保所有内容使用所选语言。')}
        </p>
      </div>

      <div className="settings-group">
        <span className="settings-label">{tr('Cloud connection', '云端连接')}</span>
        <div className="segmented">
          <button
            type="button"
            className={settings.cloudBackend === 'orbit' ? 'is-active' : ''}
            onClick={() => {
              onChange({ ...settings, cloudBackend: 'orbit' });
              onNotice(tr('The demo does not open a real Orbit connection.', '演示版不会发起真实 Orbit 连接。'));
            }}
          >
            {tr('Orbit cloud', 'Orbit 云端')}
          </button>
          <button
            type="button"
            className={settings.cloudBackend === 'local' ? 'is-active' : ''}
            onClick={() => onChange({ ...settings, cloudBackend: 'local' })}
          >
            {tr('Local mode', '本地模式')}
          </button>
        </div>
        <p className="settings-note">
          {tr('The real client uses an Orbit WebSocket by default; this demo stays local so it can run on any computer.', '真实客户端默认使用 Orbit WebSocket；这里保持本地数据，方便在任何电脑上运行。')}
        </p>
      </div>

      <div className="settings-group">
        <span className="settings-label">{tr('Experience', '体验')}</span>
        <Toggle
          label={tr('Task notifications', '任务通知')}
          description={tr('Notify when a task completes while the tab is in the background.', '任务在后台完成时发送系统通知。')}
          checked={settings.notifications}
          onChange={async value => {
            if (value && typeof Notification !== 'undefined') {
              try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                  onNotice(tr('Notification permission was not granted.', '未获得通知权限。'));
                  return;
                }
              } catch {
                onNotice(tr('Notifications are not available in this browser.', '当前浏览器不支持通知。'));
                return;
              }
            }
            onChange({ ...settings, notifications: value });
          }}
        />
        <Toggle
          label={tr('Show execution trace', '显示执行轨迹')}
          description={tr('Display planning, queries, merging and rendering steps.', '展示计划、查询、合并和渲染步骤。')}
          checked={settings.showThinking}
          onChange={value => onChange({ ...settings, showThinking: value })}
        />
        <Toggle
          label={tr('Reduce motion', '减少动效')}
          description={tr('Disable card entrance and streaming cursor animations.', '关闭卡片入场和流式光标动画。')}
          checked={settings.reducedMotion}
          onChange={value => onChange({ ...settings, reducedMotion: value })}
        />
      </div>

      <div className="settings-group">
        <span className="settings-label">{tr('Local data', '本地数据')}</span>
        <div className="data-row">
          <div>
            <strong>{tr(`${messageCount} messages`, `${messageCount} 条消息`)}</strong>
            <span>{tr(`${savedCount} saved · browser localStorage`, `${savedCount} 个收藏 · 浏览器 localStorage`)}</span>
          </div>
          <button type="button" className="danger-action" onClick={onReset}>
            <Icon name="trash" size={15} />
            {tr('Clear and reset', '清除并重置')}
          </button>
        </div>
      </div>

      <div className="about-card">
        <div className="about-head">
          <span className="about-mark"><BeeBou size={32} still className="is-mini" decorative /></span>
          <div>
            <strong>DigitalMate Web</strong>
            <span>{tr('v0.1.0 · mock-first', 'v0.1.0 · 本地演示')}</span>
          </div>
        </div>
        <p>
          {tr(
            'A web re-creation of the DigitalMate HarmonyOS client’s A2UI protocol, theme and interaction structure. Not the official client, and it contains no real Gateway credentials.',
            '基于 DigitalMate 鸿蒙客户端的 A2UI 协议、主题与交互结构复刻。不是官方客户端，也不包含真实 Gateway 凭证。'
          )}
        </p>
        <a href="https://github.com/openJiuwen-ai/DigitalMate" target="_blank" rel="noreferrer">
          {tr('View original project', '查看原始项目')}
          <Icon name="external" size={14} />
        </a>
      </div>
    </Sheet>
  );
}

export function MemorySheet({
  profile,
  onClose,
  onNotice
}: {
  profile: MemoryProfile;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const { tr, lang } = useI18n();
  return (
    <Sheet title={tr('About you', '关于你')} subtitle={tr('Long-term memory overview · local only', '长期记忆概览 · 仅本地')} onClose={onClose} wide>
      <div className="memory-head">
        <span className="memory-avatar">{lang === 'zh' ? '林' : 'L'}</span>
        <div>
          <h3>{profile.name}</h3>
          <p>{profile.headline}</p>
        </div>
        <span className="mbti-pill">{profile.mbti}</span>
      </div>
      <p className="memory-summary">{profile.summary}</p>
      <div className="tag-row">
        {profile.tags.map(tag => (
          <span className="memory-tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="memory-sections">
        {profile.sections.map(section => (
          <article className="memory-section" key={section.title}>
            <h4>{section.title}</h4>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
      <div className="memory-actions">
        <button type="button" className="secondary-action" onClick={() => onNotice(tr('Memory editing in the real client is drafted by a memory-only model.', '记忆编辑在真实版本中由 memory-only 模型生成草稿。'))}>
          {tr('Edit memory', '修正记忆')}
        </button>
        <button type="button" className="ghost-action" onClick={() => onNotice(tr('Public profile search is not enabled in the demo.', '公开画像搜索在演示版中未启用。'))}>
          {tr('Public profile', '公开账号画像')}
        </button>
      </div>
      <div className="sheet-footnote">
        <Icon name="lock" size={14} />
        {tr(
          'The demo does not read or write real memory; the real client uses a local vector store with account isolation.',
          '演示版不读写真实记忆；真实版本使用本地向量库与账号隔离。'
        )}
      </div>
    </Sheet>
  );
}

export function DetailView({
  card,
  reaction,
  saved,
  related,
  onClose,
  onReact,
  onSave,
  onOpenRelated
}: {
  card: FeedCard;
  reaction: Reaction;
  saved: boolean;
  related: FeedCard[];
  onClose: () => void;
  onReact: (reaction: Reaction) => void;
  onSave: () => void;
  onOpenRelated: (card: FeedCard) => void;
}) {
  const { tr } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [card.id]);

  return (
    <div className="detail-layer" role="dialog" aria-modal="true" aria-label={card.title}>
      <header className="detail-header">
        <button type="button" className="icon-button" onClick={onClose} aria-label={tr('Back', '返回')}>
          <Icon name="back" size={20} />
        </button>
        <span>{card.sourceLabel}</span>
        <button
          type="button"
          className={`icon-button ${saved ? 'is-active' : ''}`}
          onClick={onSave}
          aria-label={tr('Save', '收藏')}
        >
          <Icon name="bookmark" size={19} filled={saved} />
        </button>
      </header>
      <div className="detail-scroll" ref={scrollRef}>
        <div className="detail-cover" style={{ background: card.cover }}>
          <span className="detail-glyph">{card.glyph}</span>
          <span className="feed-source-badge">{card.sourceLabel}</span>
        </div>
        <div className="detail-body">
          <div className="feed-kicker">
            <span>{card.topic}</span>
            <span>·</span>
            <span>{card.readingTime}</span>
            <span>·</span>
            <span>{card.published}</span>
          </div>
          <h1>{card.title}</h1>
          <p className="detail-summary">{card.summary}</p>
          <div className="tag-row">
            {card.tags.map(tag => (
              <span className="mini-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="detail-content">
            {renderMarkdown(card.body.map(paragraph => paragraph).join('\n\n'))}
          </div>
          <div className="detail-source-note">
            <Icon name="info" size={15} />
            {tr(`Content from ${card.sourceLabel}. The demo keeps source labels and does not fetch private content behind a login.`, `内容来自 ${card.sourceLabel}。演示版保留来源标签，不抓取登录后的私密内容。`)}
          </div>
          <div className="detail-actions">
            <button
              type="button"
              className={`secondary-action ${reaction === 'like' ? 'is-on' : ''}`}
              onClick={() => onReact(reaction === 'like' ? undefined : 'like')}
            >
              <Icon name="thumbUp" size={16} filled={reaction === 'like'} />
              {tr('Like', '喜欢')}
            </button>
            <button type="button" className="secondary-action" onClick={onSave}>
              <Icon name="bookmark" size={16} filled={saved} />
              {saved ? tr('Saved', '已收藏') : tr('Save', '收藏')}
            </button>
            <a className="primary-action" href={card.url} target="_blank" rel="noreferrer">
              {tr('Open original', '打开原文')}
              <Icon name="external" size={15} />
            </a>
          </div>

          {related.length > 0 ? (
            <div className="related-block">
              <h3>{tr('Related', '相关推荐')}</h3>
              {related.map(item => (
                <button type="button" className="related-row" key={item.id} onClick={() => onOpenRelated(item)}>
                  <span className="related-cover" style={{ background: item.cover }}>
                    {item.glyph}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <em>
                      {item.sourceLabel} · {item.readingTime}
                    </em>
                  </span>
                  <Icon name="chevronRight" size={15} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
