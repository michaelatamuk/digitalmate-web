import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  A2uiAction,
  CalendarEvent,
  FeedCard,
  ItemDetail,
  Language,
  Message,
  Reaction,
  Settings,
  Skill
} from './types';
import { replyFor } from './lib/mockEngine';
import { newId, readStorage, writeStorage, clearDemoStorage, STORAGE_KEYS, usePersistentState } from './lib/storage';
import { seedFor } from './data/seed';
import { surfacesFor } from './data/surfaces';
import { I18nContext } from './i18n/I18nContext';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { DiscoveryView } from './components/DiscoveryView';
import { Composer } from './components/Composer';
import { DetailsSheet } from './components/DetailsSheet';
import { CalendarEventSheet } from './components/CalendarEventSheet';
import { BrandMark, IconButton, StatusBar, TopBar } from './components/Chrome';
import { Icon } from './components/Icons';
import { BottomNav, DetailView, HistorySheet, MemorySheet, MoreSheet, SettingsSheet, SkillsSheet, Toast } from './components/Overlays';

type Tab = 'chat' | 'discover';
type SheetName = 'history' | 'more' | 'skills' | 'settings' | 'memory' | null;

const defaultSettings: Settings = {
  cloudBackend: 'orbit',
  notifications: true,
  reducedMotion: false,
  showThinking: true
};

const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

function loadMessages(): Message[] {
  const stored = readStorage<Message[]>(STORAGE_KEYS.messages, []);
  return stored.map(message => ({
    ...message,
    streaming: false,
    thinking: message.thinking
      ? {
          ...message.thinking,
          done: true,
          steps: message.thinking.steps.map(step => ({ ...step, status: 'done' }))
        }
      : undefined
  }));
}

export default function App() {
  const [tab, setTab] = useState<Tab>('chat');
  const [home, setHome] = useState(true);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [archived, setArchived] = usePersistentState<Message[]>(STORAGE_KEYS.archived, []);
  const [busy, setBusy] = useState(false);
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [activeSkill, setActiveSkill] = useState('general');
  const [sheet, setSheet] = useState<SheetName>(null);
  const [detail, setDetail] = useState<FeedCard | null>(null);
  const [detailItem, setDetailItem] = useState<ItemDetail | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [feedSeed, setFeedSeed] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const demoRun = useRef(0);

  const [settings, setSettings] = usePersistentState<Settings>(STORAGE_KEYS.settings, defaultSettings);
  const [lang, setLang] = usePersistentState<Language>(STORAGE_KEYS.language, 'en');
  const tr = useCallback((english: string, chinese: string): string => (lang === 'zh' ? chinese : english), [lang]);
  const seed = seedFor(lang);
  const [reactions, setReactions] = usePersistentState<Record<string, Reaction>>(STORAGE_KEYS.reactions, {});
  const [topics, setTopics] = usePersistentState<string[]>(STORAGE_KEYS.topics, [seed.topicOptions[0], seed.topicOptions[3]]);
  const [skills, setSkills] = usePersistentState<Skill[]>(STORAGE_KEYS.skills, seed.seedSkills);
  const [saved, setSaved] = usePersistentState<string[]>(STORAGE_KEYS.savedCards, []);
  const [rssCards, setRssCards] = usePersistentState<FeedCard[]>(STORAGE_KEYS.rssCards, []);
  const [calendarEvents, setCalendarEvents] = usePersistentState<CalendarEvent[]>(STORAGE_KEYS.calendarEvents, []);

  const generation = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab, home]);

  const showToast = (message: string) => {
    if (!message) return;
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  };

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (messages.some(message => message.streaming)) return;
    const timer = window.setTimeout(() => writeStorage(STORAGE_KEYS.messages, messages), 220);
    return () => window.clearTimeout(timer);
  }, [messages]);

  const allCards = useMemo(() => {
    const base = [...rssCards, ...seed.seedCards];
    if (feedSeed === 0 || base.length === 0) return base;
    const offset = feedSeed % base.length;
    return [...base.slice(offset), ...base.slice(0, offset)];
  }, [feedSeed, rssCards, seed.seedCards]);

  const patchMessage = (id: string, patch: (message: Message) => Message) => {
    setMessages(previous => previous.map(message => (message.id === id ? patch(message) : message)));
  };

  const notifyCompletion = (body: string) => {
    if (!settings.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      new Notification(tr('DigitalMate task complete', 'DigitalMate 任务完成'), {
        body: body.slice(0, 140),
        tag: 'digitalmate-task'
      });
    } catch {
      // Notifications are optional; the in-app result is always available.
    }
  };

  const send = async (raw: string) => {
    const prompt = raw.trim();
    if (!prompt) return;
    if (busy) {
      showToast(tr('Still generating — please wait.', '正在生成，请稍候。'));
      return;
    }

    const runId = generation.current;
    setHome(false);
    setTab('chat');
    setComposer('');
    setAttachments([]);
    setBusy(true);

    const userMessage: Message = {
      id: newId('u'),
      role: 'user',
      text: prompt,
      createdAt: Date.now()
    };
    const assistantId = newId('a');
    const reply = replyFor(prompt, lang);
    const assistant: Message = {
      id: assistantId,
      role: 'assistant',
      text: '',
      createdAt: Date.now() + 1,
      streaming: true,
      thinking: {
        title: tr('Working', '处理中'),
        steps: reply.thinking.map((label, index) => ({ label, status: index === 0 ? 'active' : 'pending' })),
        done: false
      }
    };

    setMessages(previous => [...previous, userMessage, assistant]);
    setActiveSkill('general');

    await sleep(280);
    if (generation.current !== runId) return;

    for (let index = 0; index < reply.thinking.length; index += 1) {
      if (generation.current !== runId) return;
      patchMessage(assistantId, message => ({
        ...message,
        thinking: message.thinking
          ? {
              ...message.thinking,
              steps: message.thinking.steps.map((step, stepIndex) => ({
                ...step,
                status: stepIndex < index ? 'done' : stepIndex === index ? 'active' : 'pending'
              }))
            }
          : undefined
      }));
      await sleep(340 + Math.random() * 220);
    }

    if (generation.current !== runId) return;
    patchMessage(assistantId, message => ({
      ...message,
      thinking: message.thinking
        ? { ...message.thinking, done: true, steps: message.thinking.steps.map(step => ({ ...step, status: 'done' })) }
        : undefined
    }));
    await sleep(160);

    const characters = Array.from(reply.text);
    let visible = '';
    for (let index = 0; index < characters.length; index += 2) {
      if (generation.current !== runId) return;
      visible += characters.slice(index, index + 2).join('');
      patchMessage(assistantId, message => ({ ...message, text: visible }));
      await sleep(12);
    }

    if (generation.current !== runId) return;
    patchMessage(assistantId, message => ({
      ...message,
      text: reply.text,
      surface: reply.surface,
      followUps: reply.followUps,
      streaming: false
    }));
    setBusy(false);
    notifyCompletion(reply.text);
  };

  const stop = () => {
    generation.current += 1;
    setBusy(false);
    setMessages(previous =>
      previous.map(message =>
        message.streaming
          ? {
              ...message,
              streaming: false,
              thinking: message.thinking
                ? { ...message.thinking, done: true, steps: message.thinking.steps.map(step => ({ ...step, status: 'done' })) }
                : undefined
            }
          : message
      )
    );
    showToast(tr('Generation stopped.', '已停止生成。'));
  };

  const newChat = () => {
    generation.current += 1;
    setBusy(false);
    setArchived(previous => [...previous, ...messages]);
    setMessages([]);
    setComposer('');
    setAttachments([]);
    setHome(true);
    setTab('chat');
    setSheet(null);
    setDetailItem(null);
    setCalendarOpen(false);
    showToast(tr('Started a new chat.', '已开始新对话。'));
  };

  const resetDemo = () => {
    generation.current += 1;
    clearDemoStorage();
    setMessages([]);
    setArchived([]);
    setSettings(defaultSettings);
    setReactions({});
    setTopics([seed.topicOptions[0], seed.topicOptions[3]]);
    setSkills(seed.seedSkills);
    setSaved([]);
    setRssCards([]);
    setCalendarEvents([]);
    setBusy(false);
    setHome(true);
    setTab('chat');
    setSheet(null);
    setDetail(null);
    setDetailItem(null);
    setCalendarOpen(false);
    showToast(tr('Demo data cleared.', '演示数据已清除。'));
  };

  const changeLanguage = (next: Language) => {
    if (next === lang) return;
    const nextSeed = seedFor(next);
    setLang(next);
    generation.current += 1;
    setBusy(false);
    setMessages([]);
    setArchived([]);
    setRssCards([]);
    setCalendarEvents([]);
    setTopics([nextSeed.topicOptions[0], nextSeed.topicOptions[3]]);
    setSkills(previous =>
      previous.map(skill => {
        const localized = nextSeed.seedSkills.find(item => item.id === skill.id);
        return localized ? { ...localized, installed: skill.installed, enabled: skill.enabled } : skill;
      })
    );
    setActiveSkill('general');
    setHome(true);
    setTab('chat');
    setSheet(null);
    setDetail(null);
    setDetailItem(null);
    setCalendarOpen(false);
    showToast(next === 'zh' ? '已切换到中文。' : 'Switched to English.');
  };

  const addCalendarEvent = (event: CalendarEvent) => {    const next = [...calendarEvents, event];
    setCalendarEvents(next);
    setCalendarOpen(false);
    setHome(false);
    setTab('chat');
    const surface = surfacesFor(lang).calendarSurface(next);
    setMessages(previous => [
      ...previous,
      {
        id: newId('a'),
        role: 'assistant',
        text: tr(
          `Added **${event.title}** to the demo calendar. It is stored locally and is not synced to an account.`,
          `已把 **${event.title}** 添加到演示日历。日程只保存在本地，不会同步到账号。`
        ),
        createdAt: Date.now(),
        surface
      }
    ]);
    showToast(tr('Event added to the demo calendar.', '已添加到演示日历。'));
  };

  const stopDemo = () => {
    demoRun.current += 1;
    generation.current += 1;
    setDemoRunning(false);
    setBusy(false);
    setSheet(null);
    showToast(tr('Guided demo stopped.', '已停止引导演示。'));
  };

  const startDemo = async () => {
    if (demoRunning) return;
    const run = ++demoRun.current;
    setDemoRunning(true);
    setSheet(null);
    setDetail(null);
    setDetailItem(null);
    setCalendarOpen(false);
    setHome(false);
    setTab('chat');
    setBusy(false);
    setMessages([]);
    setRssCards([]);
    setCalendarEvents([]);
    showToast(tr('Guided demo started.', '引导演示开始。'));

    await sleep(350);
    if (demoRun.current !== run) return;
    await send(tr('Find trains from Beijing to Shanghai tomorrow evening', '帮我查明天傍晚北京到上海的高铁'));
    if (demoRun.current !== run) return;
    await sleep(650);

    await send(tr('Show only trains', '只看高铁'));
    if (demoRun.current !== run) return;
    await sleep(650);

    await send(tr('What’s on my calendar tomorrow?', '帮我查看明天的日程'));
    if (demoRun.current !== run) return;
    await sleep(650);

    await send(tr('Find coffee shops near the Bantian Huawei campus in Shenzhen', '帮我搜索深圳坂田华为基地附近的咖啡店'));
    if (demoRun.current !== run) return;
    await sleep(900);

    setTab('discover');
    setTopics([seed.topicOptions[0], seed.topicOptions[4] ?? seed.topicOptions[0]]);
    showToast(tr('Discovery: topics adjusted.', '发现流：已调整主题。'));
    await sleep(2400);
    if (demoRun.current !== run) return;

    setTab('chat');
    setHome(true);
    setSheet('memory');
    await sleep(2600);
    if (demoRun.current !== run) return;

    setSheet(null);
    setDemoRunning(false);
    showToast(tr('Guided demo complete.', '引导演示完成。'));
  };

  const onAction = (action: A2uiAction) => {
    if (action.id === 'create') {
      setCalendarOpen(true);
      return;
    }
    if (action.prompt) {
      void send(action.prompt);
      return;
    }
    showToast(tr(`Triggered: ${action.label}`, `已触发：${action.label}`));
  };

  const toggleTopic = (topic: string) => {
    setTopics(previous =>
      previous.includes(topic) ? previous.filter(item => item !== topic) : [...previous, topic]
    );
  };

  const react = (id: string, reaction: Reaction) => {
    setReactions(previous => {
      const next = { ...previous };
      if (reaction === undefined) delete next[id];
      else next[id] = reaction;
      return next;
    });
  };

  const toggleSave = (id: string) => {
    setSaved(previous => {
      if (previous.includes(id)) return previous.filter(item => item !== id);
      return [...previous, id];
    });
  };

  const addRss = (name: string, url: string) => {
    const card: FeedCard = {
      id: newId('rss'),
      source: 'rss',
      sourceLabel: 'RSS',
      topic: seed.topicOptions[0],
      title: tr(`${name} — latest content`, `${name} 的最新内容`),
      summary: tr(
        'This RSS feed was added in the demo. A real client would detect Atom / RSS 2.0, fetch the first cards and admit them after quality checks.',
        '这是一个由演示版添加的 RSS 订阅。真实版本会识别 Atom / RSS 2.0、抓取首批卡片，并在质量校验后入池。'
      ),
      glyph: 'R',
      cover: 'linear-gradient(135deg, #f6e6c8 0%, #e8cd96 50%, #b28b4d 100%)',
      readingTime: tr('3 min read', '3 分钟阅读'),
      published: tr('Just now', '刚刚'),
      url,
      body: tr(
        'The RSS source is saved to this browser. The demo does not make network requests, so this is placeholder subscription content.|In the real client, adding a feed first requests the subscription document, identifies RSS 2.0 or Atom from the XML root, and then lets the adapter produce the first cards.|If parsing fails, the format is unsupported, or no card passes quality checks, the source is not registered and nothing is written to disk.',
        'RSS 源已保存到本地浏览器。演示版不会发起网络请求，因此这里展示的是订阅占位内容。|在真实客户端中，添加操作会先请求订阅文档，按 XML 根节点识别 RSS 2.0 或 Atom，然后由 Adapter 生成首批卡片。|解析失败、格式不支持或没有合格卡片时，不会注册来源，也不会写入持久化文件。'
      ).split('|'),
      tags: ['RSS', tr('Subscription', '订阅'), name],
      metric: tr('Added locally', '本地添加')
    };
    setRssCards(previous => [card, ...previous]);
    showToast(tr(`Added RSS: ${name}`, `已添加 RSS：${name}`));
  };

  const installedEnabled = skills.filter(skill => skill.installed && skill.enabled);
  const activeSkillName = skills.find(skill => skill.id === activeSkill)?.name ?? tr('General assistant', '通用助手');
  const detailRelated = detail
    ? allCards.filter(card => card.id !== detail.id && (card.topic === detail.topic || card.source === detail.source)).slice(0, 2)
    : [];

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLanguage, tr, locale: lang === 'zh' ? 'zh-CN' : 'en-US' }}>
      <div className={`stage ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
      <div className="stage-glow stage-glow-a" />
      <div className="stage-glow stage-glow-b" />
      <div className="app-frame" data-lang={lang}>
        <StatusBar />
        {tab === 'chat' ? (
          home ? (
            <TopBar
              left={
                <div className="brand">
                  <BrandMark />
                  <div>
                    <strong>DigitalMate</strong>
                    <span>{tr('Web demo', '网页演示')}</span>
                  </div>
                </div>
              }
              right={
                <>
                  <IconButton icon="heart" label={tr('About you', '关于你')} onClick={() => setSheet('memory')} />
                  <IconButton icon="clock" label={tr('History', '历史记录')} onClick={() => setSheet('history')} />
                  <IconButton icon="more" label={tr('More', '更多')} onClick={() => setSheet('more')} />
                </>
              }
            />
          ) : (
            <TopBar
              left={<IconButton icon="back" label={tr('Back to home', '返回首页')} onClick={() => setHome(true)} />}
              title={tr('Chat', '对话')}
              subtitle={busy ? tr('Working on task', '正在执行任务') : tr('Local demo · A2UI', '本地演示 · A2UI')}
              right={
                <>
                  <IconButton icon="spark" label={tr('New chat', '新对话')} onClick={newChat} />
                  <IconButton icon="more" label={tr('More', '更多')} onClick={() => setSheet('more')} />
                </>
              }
            />
          )
        ) : (
          <TopBar
            left={
              <div className="brand">
                <BrandMark />
                <div>
                  <strong>{tr('Discover', '发现')}</strong>
                  <span>{tr('Multi-source feed · local ranking', '多源内容 · 本地排序')}</span>
                </div>
              </div>
            }
            right={
              <>
                <IconButton
                  icon="refresh"
                  label={tr('Refresh', '换一批')}
                  onClick={() => {
                    setFeedSeed(seed => seed + 3);
                    showToast(tr('Refreshed the local inventory.', '已从本地库存换一批内容。'));
                  }}
                />
                <IconButton icon="more" label={tr('More', '更多')} onClick={() => setSheet('more')} />
              </>
            }
          />
        )}

        <main ref={contentRef} className={`screen-content ${tab === 'chat' && home ? 'is-home' : ''} ${tab === 'discover' ? 'is-discovery' : ''}`}>
          {tab === 'chat' ? (
            home ? (
              <HomeView
                messages={messages}
                reducedMotion={settings.reducedMotion}
                onSuggestion={prompt => void send(prompt)}
                onContinue={() => setHome(false)}
                onOpenSkills={() => setSheet('skills')}
              />
            ) : (
              <ChatView
                messages={messages}
                showThinking={settings.showThinking}
                onAction={onAction}
                onDetails={setDetailItem}
                onFollowUp={prompt => void send(prompt)}
              />
            )
          ) : (
            <DiscoveryView
              cards={allCards}
              reactions={reactions}
              saved={saved}
              topics={topics}
              onToggleTopic={toggleTopic}
              onClearTopics={() => setTopics([])}
              onReact={react}
              onSave={id => {
                toggleSave(id);
                showToast(saved.includes(id) ? tr('Removed from saved.', '已取消收藏。') : tr('Saved locally.', '已收藏到本地。'));
              }}
              onOpen={setDetail}
              onRefresh={() => {
                setFeedSeed(seed => seed + 3);
                showToast(tr('Refreshed the local inventory.', '已从本地库存换一批内容。'));
              }}
              onAddRss={addRss}
              onNotice={showToast}
            />
          )}
        </main>

        {tab === 'chat' ? (
          <div className="composer-area">
            <div className="skill-dock">
              <span className="skill-dock-label">
                <Icon name="spark" size={13} />
                {tr('Skills', '技能')}
              </span>
              <div className="skill-dock-scroll">
                {installedEnabled.slice(0, 3).map(skill => (
                  <button
                    type="button"
                    key={skill.id}
                    className={`skill-pill ${activeSkill === skill.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveSkill(skill.id);
                      showToast(tr(`Using for this task: ${skill.name}`, `本次任务使用：${skill.name}`));
                    }}
                  >
                    <span>{skill.icon}</span>
                    {skill.name}
                  </button>
                ))}
                <button type="button" className="skill-pill is-add" onClick={() => setSheet('skills')}>
                  <Icon name="plus" size={12} />
                </button>
              </div>
              <span className="skill-active">{activeSkillName}</span>
            </div>
            <Composer
              value={composer}
              onChange={setComposer}
              onSend={() => void send(composer)}
              onStop={stop}
              busy={busy}
              attachments={attachments}
              onAttach={() => {
                setAttachments(previous =>
                  previous.includes('requirements-v3.pdf') ? previous : [...previous, 'requirements-v3.pdf']
                );
                showToast(tr('Attached requirements-v3.pdf (demo file)', '已附加 requirements-v3.pdf（演示文件）'));
              }}
              onRemoveAttachment={index => setAttachments(previous => previous.filter((_, itemIndex) => itemIndex !== index))}
              onNotice={showToast}
            />
          </div>
        ) : null}

        <BottomNav
          tab={tab}
          onTab={next => {
            setTab(next);
            if (next === 'chat') setHome(true);
          }}
        />

        {demoRunning ? (
          <button type="button" className="demo-pill" onClick={stopDemo}>
            <span className="demo-pill-dot" />
            {tr('Stop demo', '停止演示')}
          </button>
        ) : null}

        <Toast message={toast} />

        {sheet === 'history' ? (
          <HistorySheet
            messages={[...archived, ...messages]}
            onClose={() => setSheet(null)}
            onSelect={() => {
              if (archived.length > 0 && messages.length === 0) {
                setMessages(archived);
                setArchived([]);
              }
              setSheet(null);
              setHome(false);
            }}
            onNewChat={newChat}
          />
        ) : null}
        {sheet === 'more' ? (
          <MoreSheet
            onClose={() => setSheet(null)}
            onSkills={() => setSheet('skills')}
            onMemory={() => setSheet('memory')}
            onHistory={() => setSheet('history')}
            onSettings={() => setSheet('settings')}
            onNewChat={newChat}
            onDemo={() => void startDemo()}
          />
        ) : null}
        {sheet === 'skills' ? (
          <SkillsSheet
            skills={skills}
            onClose={() => setSheet(null)}
            onToggle={id => {
              setSkills(previous =>
                previous.map(skill => {
                  if (skill.id !== id) return skill;
                  if (!skill.installed) return { ...skill, installed: true, enabled: true };
                  return { ...skill, enabled: !skill.enabled };
                })
              );
            }}
            onUninstall={id => {
              setSkills(previous =>
                previous.map(skill => (skill.id === id ? { ...skill, installed: false, enabled: false } : skill))
              );
              showToast(tr('Skill uninstalled.', '已卸载技能。'));
            }}
            onNotice={showToast}
          />
        ) : null}
        {sheet === 'settings' ? (
          <SettingsSheet
            settings={settings}
            onChange={setSettings}
            onClose={() => setSheet(null)}
            onReset={resetDemo}
            onNotice={showToast}
            onLanguageChange={changeLanguage}
            savedCount={saved.length}
            messageCount={messages.length + archived.length}
          />
        ) : null}
        {sheet === 'memory' ? (
          <MemorySheet profile={seed.memoryProfile} onClose={() => setSheet(null)} onNotice={showToast} />
        ) : null}

        {detail ? (
          <DetailView
            card={detail}
            reaction={reactions[detail.id]}
            saved={saved.includes(detail.id)}
            related={detailRelated}
            onClose={() => setDetail(null)}
            onReact={reaction => {
              react(detail.id, reaction);
              showToast(reaction === 'like' ? tr('Noted — I’ll show more like this.', '已记录喜欢，下次会多推荐类似内容。') : tr('Like removed.', '已取消喜欢。'));
            }}
            onSave={() => {
              toggleSave(detail.id);
              showToast(saved.includes(detail.id) ? tr('Removed from saved.', '已取消收藏。') : tr('Saved locally.', '已收藏到本地。'));
            }}
            onOpenRelated={setDetail}
          />
        ) : null}

        {detailItem ? (
          <DetailsSheet detail={detailItem} onClose={() => setDetailItem(null)} onNotice={showToast} />
        ) : null}

        {calendarOpen ? (
          <CalendarEventSheet onClose={() => setCalendarOpen(false)} onAdd={addCalendarEvent} />
        ) : null}
      </div>
      <div className="stage-caption">
        <span className="stage-caption-dot" />
        {tr('DigitalMate Web · mock-first companion', 'DigitalMate Web · 本地演示版')}
      </div>
      </div>
    </I18nContext.Provider>
  );
}
