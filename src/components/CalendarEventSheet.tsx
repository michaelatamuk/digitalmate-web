import { useState } from 'react';
import type { CalendarEvent } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { buildCalendarIcs, icsFilename } from '../lib/calendarIcs';
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
  const [icsNote, setIcsNote] = useState('');

  const chosenTime = (): { hours: number; minutes: number } => {
    const [hours, minutes] = (/^\d{2}:\d{2}$/.test(time) ? time : '15:00').split(':').map(Number);
    return { hours, minutes };
  };

  const startDate = (): Date => {
    const { hours, minutes } = chosenTime();
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    return start;
  };

  const chosenDuration = (): number => {
    const minutes = Number.parseInt(duration, 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
  };

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

  // The browser cannot write the device calendar, so the event leaves as a standard .ics file —
  // shared to the system share sheet when the browser supports files, downloaded otherwise.
  const exportIcs = async () => {
    const start = startDate();
    const name = title.trim() || tr('Untitled event', '未命名日程');
    const ics = buildCalendarIcs({
      title: name,
      start,
      durationMinutes: chosenDuration(),
      description: tr('Created in the DigitalMate web demo.', '在 DigitalMate 网页演示中创建。')
    });
    const fileName = icsFilename(name, start);
    const file = new File([ics], fileName, { type: 'text/calendar' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        setIcsNote(tr('Shared with your calendar app.', '已分享到日历应用。'));
        return;
      } catch {
        // Cancelled or unsupported share: fall through to a download.
      }
    }
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setIcsNote(
      tr(
        'Saved an .ics file. Open it to add the event to your phone or desktop calendar.',
        '已保存 .ics 文件，打开即可添加到手机或电脑日历。'
      )
    );
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
            'The event is stored in this browser only. Export it as an .ics file to use it in your real calendar.',
            '日程只保存在当前浏览器。导出为 .ics 文件即可加入系统日历。'
          )}
        </p>
        <button type="button" className="primary-action full" onClick={submit}>
          <Icon name="calendar" size={16} />
          {tr('Add to demo calendar', '添加到演示日历')}
        </button>
        <button type="button" className="secondary-action full" onClick={() => void exportIcs()}>
          <Icon name="download" size={16} />
          {tr('Add to phone calendar (.ics)', '添加到手机日历（.ics）')}
        </button>
        {icsNote ? <p className="event-hint">{icsNote}</p> : null}
      </div>
    </Sheet>
  );
}
