import { useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Image or SVG with zoom and pan. Used for attachment previews and Hive previews so a screenshot
 * or document scan can be read without leaving the app.
 */
export function ZoomableImage({ src, alt, className }: ZoomableImageProps) {
  const { tr } = useI18n();
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  const setZoom = (next: number): void => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    setScale(clamped);
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  };

  const reset = (): void => {
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  };

  const zoomed = scale > MIN_SCALE;
  const moved = offset.x !== 0 || offset.y !== 0;

  return (
    <div className={`zoomable${className ? ` ${className}` : ''}`}>
      <div
        className={`zoomable-stage${zoomed ? ' is-zoomed' : ''}`}
        onDoubleClick={() => (zoomed ? reset() : setZoom(2))}
        onPointerDown={event => {
          if (!zoomed) return;
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          setOffset({ x: start.ox + (event.clientX - start.x), y: start.oy + (event.clientY - start.y) });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: zoomed ? (drag.current ? 'grabbing' : 'grab') : 'zoom-in',
            transition: drag.current ? 'none' : 'transform 120ms ease-out'
          }}
        />
      </div>
      <div className="zoomable-controls">
        <button
          type="button"
          className="zoomable-button"
          onClick={() => setZoom(scale - 0.5)}
          disabled={!zoomed}
          aria-label={tr('Zoom out', '缩小')}
        >
          −
        </button>
        <button
          type="button"
          className="zoomable-button"
          onClick={() => setZoom(scale + 0.5)}
          disabled={scale >= MAX_SCALE}
          aria-label={tr('Zoom in', '放大')}
        >
          +
        </button>
        <button
          type="button"
          className="zoomable-reset"
          onClick={reset}
          disabled={!zoomed && !moved}
        >
          {tr('Reset', '重置')}
        </button>
        {zoomed ? (
          <span className="zoomable-level" aria-hidden="true">
            {Math.round(scale * 100)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
