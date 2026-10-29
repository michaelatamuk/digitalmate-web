import { useEffect, useState } from 'react';
import { Icon } from './Icons';

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="dm-brand" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d8896f" />
          <stop offset="0.55" stopColor="#c47f97" />
          <stop offset="1" stopColor="#9f86c9" />
        </linearGradient>
      </defs>
      <path
        d="M6.5 26.5 16 5.5l9.5 21"
        fill="none"
        stroke="url(#dm-brand)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.2 19.5h9.6"
        fill="none"
        stroke="url(#dm-brand)"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

export function StatusBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="statusbar" aria-hidden="true">
      <span className="status-time">{time}</span>
      <span className="status-notch" />
      <span className="status-icons">
        <Icon name="signal" size={15} />
        <Icon name="wifi" size={15} />
        <Icon name="battery" size={20} />
      </span>
    </div>
  );
}

interface TopBarProps {
  left?: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  subtle?: boolean;
}

export function TopBar({ left, title, subtitle, right, subtle }: TopBarProps) {
  return (
    <header className={`topbar ${subtle ? 'is-subtle' : ''}`}>
      <div className="topbar-left">{left}</div>
      {title ? (
        <div className="topbar-center">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      ) : null}
      <div className="topbar-right">{right}</div>
    </header>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  active,
  size = 20
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onClick?: () => void;
  active?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
