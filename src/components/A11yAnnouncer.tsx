import { useEffect, useRef, useState } from 'react';
import { subscribeAnnouncements } from '../lib/announce';

const CLEAR_DELAY_MS = 80;

/**
 * One visually hidden live region per politeness. The text is cleared first so announcing the same
 * message twice still reaches a screen reader; pending timers are cleared on unmount.
 */
export function A11yAnnouncer() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timers = useRef<number[]>([]);

  useEffect(
    () =>
      subscribeAnnouncements(({ message, politeness: level }) => {
        const setter = level === 'assertive' ? setAssertive : setPolite;
        setter('');
        const timer = window.setTimeout(() => setter(message), CLEAR_DELAY_MS);
        timers.current.push(timer);
        // A rapid burst (a Bee stepping through tasks) should not queue dozens of timers.
        if (timers.current.length > 8) {
          const oldest = timers.current.shift();
          if (oldest) window.clearTimeout(oldest);
        }
      }),
    []
  );

  useEffect(() => {
    return () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
    };
  }, []);

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  );
}
