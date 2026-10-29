import { useEffect, useState } from 'react';
import type { Message } from '../types';
import { Icon, type IconName } from './Icons';
import { useI18n } from '../i18n/I18nContext';
import { BeeBou } from './BeeBou';

function greetingFor(hour: number, tr: (en: string, zh: string) => string): string {
  if (hour < 6) return tr('Late night', '夜深了');
  if (hour < 12) return tr('Good morning', '早上好');
  if (hour < 18) return tr('Good afternoon', '下午好');
  return tr('Good evening', '晚上好');
}

export function HomeView({
  messages,
  reducedMotion,
  onSuggestion,
  onContinue,
  onOpenSkills
}: {
  messages: Message[];
  reducedMotion: boolean;
  onSuggestion: (prompt: string) => void;
  onContinue: () => void;
  onOpenSkills: () => void;
}) {
  const { lang, tr, locale } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const suggestions: { icon: IconName; title: string; subtitle: string; prompt: string }[] = [
    {
      icon: 'train',
      title: tr('Travel options', '出行方案'),
      subtitle: tr('Trains · flights mixed', '高铁 · 航班混合排序'),
      prompt: tr('Find trains from Beijing to Shanghai tomorrow', '帮我查明天北京到上海的高铁')
    },
    {
      icon: 'coffee',
      title: tr('Coffee nearby', '附近门店'),
      subtitle: tr('Multi-source dedupe and ranking', '多来源去重与排序'),
      prompt: tr('Find coffee shops near the Bantian Huawei campus in Shenzhen', '帮我搜索深圳坂田华为基地附近的咖啡店')
    },
    {
      icon: 'chat',
      title: tr('Today’s messages', '今日消息'),
      subtitle: tr('X · Slack · WeCom', 'X · Slack · 企业微信'),
      prompt: tr('Show today’s social messages', '帮我查看今天的社交聚合消息')
    },
    {
      icon: 'grid',
      title: tr('Document summary', '文档摘要'),
      subtitle: tr('Key questions and next steps', '关键问题与下一步'),
      prompt: tr('Summarize this requirements document and list key questions and next steps', '帮我总结这份需求文档，整理关键问题和下一步')
    }
  ];

  const clock = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = now.getDate();
  const month = now.toLocaleDateString(locale, { month: lang === 'zh' ? 'numeric' : 'short' });
  const weekday = now.toLocaleDateString(locale, { weekday: 'long' });
  const dateText = lang === 'zh' ? `${month}${day}日` : `${weekday} ${month} ${day}`;
  const lastUser = [...messages].reverse().find(message => message.role === 'user');

  return (
    <div className="home-view">
      <BeeBou className="is-home" size={72} still={reducedMotion} />
      <div className="clock-block">
        <div className="clock">{clock}</div>
        <div className="clock-date">
          {lang === 'zh' ? <>{dateText} <span>{weekday}</span></> : <>{weekday} <span>{month} {day}</span></>}
        </div>
      </div>

      <div className="greeting-block">
        <h1>{greetingFor(now.getHours(), tr)}</h1>
        <p>{tr('What’s on your mind today?', '今天有什么安排吗？')}</p>
      </div>

      {lastUser ? (
        <button type="button" className="continue-card" onClick={onContinue}>
          <span className="continue-icon">
            <Icon name="clock" size={18} />
          </span>
          <span className="continue-copy">
            <em>{tr('Continue last chat', '继续上次对话')}</em>
            <strong>{lastUser.text}</strong>
          </span>
          <Icon name="chevronRight" size={18} />
        </button>
      ) : null}

      <div className="home-suggestions">
        <div className="section-label">
          <span>{tr('Try one of these', '可以试试')}</span>
          <button type="button" onClick={onOpenSkills}>
            {tr('Choose a skill', '选择技能')}
            <Icon name="chevronRight" size={12} />
          </button>
        </div>
        <div className="suggestion-grid">
          {suggestions.map(suggestion => (
            <button
              type="button"
              className="suggestion-card"
              key={suggestion.title}
              onClick={() => onSuggestion(suggestion.prompt)}
            >
              <span className="suggestion-icon">
                <Icon name={suggestion.icon} size={18} />
              </span>
              <span>
                <strong>{suggestion.title}</strong>
                <em>{suggestion.subtitle}</em>
              </span>
              <Icon name="arrowUpRight" size={15} />
            </button>
          ))}
        </div>
      </div>

      <div className="home-footnote">
        <span className="live-dot" />
        <span>{tr('Local demo · data and actions stay in your browser', '本地演示模式 · 数据与动作不会离开浏览器')}</span>
      </div>
    </div>
  );
}
