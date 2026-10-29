import type { SVGProps } from 'react';

export type IconName =
  | 'plus'
  | 'mic'
  | 'send'
  | 'heart'
  | 'clock'
  | 'more'
  | 'spark'
  | 'search'
  | 'close'
  | 'back'
  | 'chevronRight'
  | 'chevronDown'
  | 'check'
  | 'bookmark'
  | 'thumbUp'
  | 'thumbDown'
  | 'refresh'
  | 'settings'
  | 'user'
  | 'bell'
  | 'shield'
  | 'wifi'
  | 'battery'
  | 'signal'
  | 'chat'
  | 'compass'
  | 'external'
  | 'train'
  | 'plane'
  | 'coffee'
  | 'play'
  | 'rss'
  | 'trash'
  | 'info'
  | 'eye'
  | 'calendar'
  | 'mail'
  | 'sun'
  | 'arrowUpRight'
  | 'filter'
  | 'globe'
  | 'lock'
  | 'download'
  | 'grid'
  | 'hotel'
  | 'car'
  | 'copy'
  | 'edit'
  | 'volume';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 22, filled = false, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest
  };

  switch (name) {
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common}>
          <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common} fill={filled ? 'currentColor' : 'none'}>
          <path d="M12 20.2S3.8 15.1 3.8 8.9A4.4 4.4 0 0 1 12 6.4a4.4 4.4 0 0 1 8.2 2.5c0 6.2-8.2 11.3-8.2 11.3Z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 1.8" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="5.5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="18.5" cy="12" r="1.6" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path d="M12 3.5l1.7 4.9 4.9 1.7-4.9 1.7L12 16.7l-1.7-4.9L5.4 10l4.9-1.7L12 3.5Z" />
          <path d="M18.8 16.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.4 15.4 4.3 4.3" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'back':
      return (
        <svg {...common}>
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg {...common}>
          <path d="m9 5 7 7-7 7" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg {...common}>
          <path d="m5 9 7 7 7-7" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg {...common} fill={filled ? 'currentColor' : 'none'}>
          <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case 'thumbUp':
      return (
        <svg {...common}>
          <path d="M7 10.5v9H4.5v-9H7Zm0 0 4.2-7.2a1.6 1.6 0 0 1 2.9.7V9h3.3a2 2 0 0 1 2 2.4l-1.1 6a2 2 0 0 1-2 1.6H7" />
        </svg>
      );
    case 'thumbDown':
      return (
        <svg {...common}>
          <path d="M17 13.5v-9h2.5v9H17Zm0 0-4.2 7.2a1.6 1.6 0 0 1-2.9-.7V15H6.6a2 2 0 0 1-2-2.4l1.1-6a2 2 0 0 1 2-1.6H17" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 1 0-2.3 6.6M20 5v6h-6" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H7v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7ZM10 20h4" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-2.5Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'wifi':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm-4.2-5.1a6.2 6.2 0 0 1 8.4 0l1.4-1.5a8.3 8.3 0 0 0-11.2 0l1.4 1.5Zm-3.2-3.3a10.8 10.8 0 0 1 14.8 0l1.4-1.5a12.9 12.9 0 0 0-17.6 0l1.4 1.5Z" />
        </svg>
      );
    case 'battery':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="16" height="8" rx="2" />
          <path d="M21 11v2" />
          <rect x="5" y="10" width="10" height="4" rx="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'signal':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="4" y="13" width="2.6" height="6" rx="0.8" />
          <rect x="8.4" y="10" width="2.6" height="9" rx="0.8" />
          <rect x="12.8" y="7" width="2.6" height="12" rx="0.8" />
          <rect x="17.2" y="4" width="2.6" height="15" rx="0.8" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.6-4.6A7.5 7.5 0 1 1 20 11.5Z" />
        </svg>
      );
    case 'compass':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </svg>
      );
    case 'external':
      return (
        <svg {...common}>
          <path d="M14 4h6v6M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      );
    case 'train':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="13" rx="3" />
          <path d="M8 8h8M8 12h.01M16 12h.01M7 17l-2 3M17 17l2 3M9 20h6" />
        </svg>
      );
    case 'plane':
      return (
        <svg {...common}>
          <path d="M10.5 20.5 12 15l6.8-3.4a1.5 1.5 0 0 0 .8-1.9 1.4 1.4 0 0 0-1.8-.8L11 12 5.4 9.2a1 1 0 0 0-1.2.3l-.4.6 4.7 3.6-1.3 4.5.9.9 2-3.5 2.5-.7-1.3 4.4.8.8Z" />
        </svg>
      );
    case 'coffee':
      return (
        <svg {...common}>
          <path d="M5 8h12v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" />
          <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 4v2M11 3.5v2.5M14 4v2" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common}>
          <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'rss':
      return (
        <svg {...common}>
          <circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none" />
          <path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4.5 6.5h15M9 6.5V4h6v2.5M7 6.5 8 20h8l1-13.5M10 10v6M14 10v6" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2.8 12S6 6.5 12 6.5 21.2 12 21.2 12 18 17.5 12 17.5 2.8 12 2.8 12Z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
          <path d="M8 3.5v4M16 3.5v4M4 10h16" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case 'arrowUpRight':
      return (
        <svg {...common}>
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <path d="M3.5 5.5h17l-6.5 8v6l-4 2v-8l-6.5-8Z" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5Z" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2.5" />
          <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3.5v12M7.5 11l4.5 4.5 4.5-4.5M4 20h16" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
      );
    case 'hotel':
      return (
        <svg {...common}>
          <path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V20M16 10h2.5A1.5 1.5 0 0 1 20 11.5V20M2.5 20h19" />
          <path d="M7.5 8h2M7.5 12h2M7.5 16h2M12 8h1M12 12h1M12 16h1" />
        </svg>
      );
    case 'car':
      return (
        <svg {...common}>
          <path d="M4.5 16.5h15M5 16.5v-4l2-5h10l2 5v4" />
          <path d="M5 12.5h14M7.5 16.5v2M16.5 16.5v2" />
          <circle cx="8" cy="14.2" r="0.9" />
          <circle cx="16" cy="14.2" r="0.9" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...common}>
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
          <path d="m13.5 7 3.5 3.5" />
        </svg>
      );
    case 'volume':
      return (
        <svg {...common}>
          <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4v-5Z" />
          <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
        </svg>
      );
    default:
      return null;
  }
}
