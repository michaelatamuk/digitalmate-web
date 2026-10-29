import { useI18n } from '../i18n/I18nContext';

interface BeeBouProps {
  working?: boolean;
  still?: boolean;
  size?: number;
  className?: string;
  decorative?: boolean;
}

/**
 * BeeBou is the DigitalMate mascot. The real app uses an animated pet on the
 * welcome screen and switches between idle/working frames while a task runs.
 * The web demo mirrors that with the same local assets.
 */
export function BeeBou({
  working = false,
  still = false,
  size = 76,
  className = '',
  decorative = false
}: BeeBouProps) {
  const { tr } = useI18n();
  const source = working
    ? still
      ? '/bee/bee-working-still.png'
      : '/bee/bee-working.webp'
    : still
      ? '/bee/bee-idle-still.png'
      : '/bee/bee-idle.webp';

  return (
    <span className={`bee ${className}`} style={{ width: size, height: size }}>
      <img
        src={source}
        alt={decorative ? '' : tr('BeeBou, the DigitalMate assistant', 'BeeBou，DigitalMate 的数字伙伴')}
        aria-hidden={decorative || undefined}
        draggable={false}
      />
    </span>
  );
}
