import { useState } from 'react';
import type { CalendarEvent } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { Sheet } from './Overlays';
import { Icon } from './Icons';

interface CalendarEventSheetProps {
  onClose: () => void;
  onAdd: (event: CalendarEvent) => void;
}

export function CalendarEventSheet({ onClose, onAdd }: CalendarEventSheetProps) {
  const { tr } = useI18n();
  const [title, setTitle] = useState(tr('Review · A2UI cards', '评审 · A2UI 卡片'));
  const [time, setTime] = useState('15:00');
  const [duration, setDuration] = useState('30');

  const submit = () => {
    const trimmed = title.trim() || tr('Untitled event', '未命名日程');
    onAdd({
      id: `event_${Date.now().toString(36)}`,
      time: /^\d{2}:\d{2}$/.test(time) ? time : '15:00',
      title: trimmed,
      meta: `${duration || '30'} ${tr('min', '分钟')} · ${tr('Added in demo', '演示版添加')}`,
      tone: 'accent'
    });
  };

  return (
    <Sheet
      title={tr('New event', '新建日程')}
      subtitle={tr('Local demo · no account sync', '本地演示 · 不同步账号')}
      onClose={onClose}
    >
      <div className="event-form">
        <label className="field">
          <span>{tr('Title', '标题')}</span>
          <input value={title} onChange={event => setTitle(event.target.value)} placeholder={tr('Event title', '日程标题')} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>{tr('Time', '时间')}</span>
            <input value={time} onChange={event => setTime(event.target.value)} placeholder="15:00" inputMode="numeric" />
          </label>
          <label className="field">
            <span>{tr('Duration (min)', '时长（分钟）')}</span>
            <input value={duration} onChange={event => setDuration(event.target.value)} placeholder="30" inputMode="numeric" />
          </label>
        </div>
        <p className="event-hint">
          {tr(
            'The event is stored in this browser only. The real client binds a confirmation to a provider eventId.',
            '日程只保存在当前浏览器。真实客户端会把确认动作绑定到服务商返回的 eventId。'
          )}
        </p>
        <button type="button" className="primary-action full" onClick={submit}>
          <Icon name="calendar" size={16} />
          {tr('Add to demo calendar', '添加到演示日历')}
        </button>
      </div>
    </Sheet>
  );
}
