import { useState } from 'react';
import { Icon } from './Icons';
import { useI18n } from '../i18n/I18nContext';

const STEPS = [
  {
    icon: 'spark' as const,
    en: {
      title: 'Start with a real task',
      body: 'Add a file, choose a companion and follow the execution trace. Everything stays on this device unless you connect the optional bridge.'
    },
    zh: {
      title: '从一个真实任务开始',
      body: '添加文件、选择分身并查看执行轨迹。除非你主动连接可选桥接，所有内容都留在这台设备上。'
    }
  },
  {
    icon: 'compass' as const,
    en: {
      title: 'Tune your discovery feed',
      body: 'Pick topics, adjust sources and say “more robotics and open source”. Likes and saves re-rank the local inventory.'
    },
    zh: {
      title: '调整你的发现流',
      body: '选择主题、管理来源，也可以说“多点机器人和开源项目”。喜欢与收藏会重新排列本地内容。'
    }
  },
  {
    icon: 'shield' as const,
    en: {
      title: 'Account-free by design',
      body: 'No login. Local chats, calendar, memory, backups and diagnostics stay in your browser. Export or clear them any time.'
    },
    zh: {
      title: '默认免账号',
      body: '无需登录。对话、日历、记忆、备份和诊断都保存在浏览器中，可随时导出或清除。'
    }
  }
];

export function WelcomeDeck({ onDone }: { onDone: () => void }) {
  const { lang, tr } = useI18n();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const copy = lang === 'zh' ? step.zh : step.en;
  const last = index === STEPS.length - 1;

  return (
    <div className="welcome-layer" role="dialog" aria-modal="true" aria-label={tr('Welcome', '欢迎')}>
      <div className="welcome-card">
        <div className="welcome-mark">
          <Icon name={step.icon} size={26} />
        </div>
        <span className="welcome-step">
          {index + 1} / {STEPS.length}
        </span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="welcome-dots" aria-hidden="true">
          {STEPS.map((_, dot) => (
            <span key={dot} className={dot === index ? 'is-active' : ''} />
          ))}
        </div>
        <div className="welcome-actions">
          <button type="button" className="ghost-action" onClick={onDone}>
            {tr('Skip', '跳过')}
          </button>
          <div>
            {index > 0 ? (
              <button type="button" className="secondary-action" onClick={() => setIndex(value => value - 1)}>
                {tr('Back', '上一步')}
              </button>
            ) : null}
            <button
              type="button"
              className="primary-action"
              onClick={() => (last ? onDone() : setIndex(value => value + 1))}
            >
              {last ? tr('Start using DigitalMate', '开始使用') : tr('Next', '下一步')}
              <Icon name={last ? 'check' : 'chevronRight'} size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
