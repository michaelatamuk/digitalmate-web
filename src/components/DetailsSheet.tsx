import type { ItemDetail } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { Icon } from './Icons';
import { Sheet } from './Overlays';

interface DetailsSheetProps {
  detail: ItemDetail;
  onClose: () => void;
  onNotice: (message: string) => void;
}

export function DetailsSheet({ detail, onClose, onNotice }: DetailsSheetProps) {
  const { tr } = useI18n();
  const item = detail.item;
  const text = (key: string): string => {
    const value = item[key];
    return value === undefined || value === null ? '' : String(value);
  };
  const isFood = detail.kind === 'food';
  const isTrain = detail.kind === 'train';
  const title = isFood ? text('name') : isTrain ? text('trainCode') || text('code') : text('code');
  const kindLabel = isFood
    ? tr('Place', '门店')
    : isTrain
      ? tr('Train', '高铁')
      : tr('Flight', '航班');
  const sourceTags = Array.isArray(item.sourceTags)
    ? (item.sourceTags as string[])
    : text('sourceTag')
      ? [text('sourceTag')]
      : [];

  const rows = isFood
    ? [
        { label: tr('Category', '分类'), value: text('category') },
        { label: tr('Distance', '距离'), value: text('distance') },
        { label: tr('Address', '地址'), value: text('address') },
        { label: tr('Rating', '评分'), value: text('rating') ? `${text('rating')} ★` : '' },
        { label: tr('Reference price', '参考价'), value: text('price') },
        { label: tr('Status', '状态'), value: text('open') },
        { label: tr('Sources', '来源'), value: sourceTags.join(' · ') }
      ]
    : [
        { label: tr('From', '出发'), value: text('from') },
        { label: tr('To', '到达'), value: text('to') },
        { label: tr('Departure', '出发时间'), value: text('depart') },
        { label: tr('Arrival', '到达时间'), value: text('arrive') },
        { label: tr('Duration', '耗时'), value: text('duration') },
        { label: tr('Price', '价格'), value: text('price') },
        { label: tr('Availability', '余票/舱位'), value: text('seats') },
        { label: tr('Source', '来源'), value: sourceTags.join(' · ') }
      ];

  const mapUrl = isFood && text('address')
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text('address'))}`
    : '';
  const sourceUrl = isTrain ? 'https://www.12306.cn/' : isFood ? mapUrl : 'https://www.variflight.com/';

  const copyDetails = async () => {
    const summary = [
      `${kindLabel}: ${title}`,
      ...rows.filter(row => row.value).map(row => `${row.label}: ${row.value}`)
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      onNotice(tr('Details copied to the clipboard.', '详情已复制到剪贴板。'));
    } catch {
      onNotice(tr('Clipboard access is not available.', '当前浏览器无法访问剪贴板。'));
    }
  };

  return (
    <Sheet
      title={title || kindLabel}
      subtitle={tr('Demo data · no booking, order or payment', '演示数据 · 不订票、不下单、不支付')}
      onClose={onClose}
    >
      <div className="details-hero">
        <span className={`details-kind ${isFood ? 'is-food' : isTrain ? 'is-train' : 'is-flight'}`}>
          <Icon name={isFood ? 'coffee' : isTrain ? 'train' : 'plane'} size={15} />
          {kindLabel}
        </span>
        {text('price') ? <strong className="details-price">{text('price')}</strong> : null}
      </div>

      <div className="info-rows details-rows">
        {rows.filter(row => row.value).map(row => (
          <div className="info-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>

      <div className="details-note">
        <Icon name="info" size={14} />
        {tr(
          'This is a local mock. The real client keeps provider evidence and requires confirmation for writes.',
          '这是本地模拟数据。真实客户端会保留来源证据，并对写操作要求确认。'
        )}
      </div>

      <div className="details-actions">
        <button type="button" className="secondary-action" onClick={() => void copyDetails()}>
          <Icon name="download" size={15} />
          {tr('Copy details', '复制详情')}
        </button>
        {sourceUrl ? (
          <a className="primary-action" href={sourceUrl} target="_blank" rel="noreferrer">
            {tr('Open source', '打开来源')}
            <Icon name="external" size={14} />
          </a>
        ) : null}
      </div>
    </Sheet>
  );
}
