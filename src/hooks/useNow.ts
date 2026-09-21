import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, refreshed every minute and whenever the app comes back to the
 * foreground.
 *
 * Screens used to read `new Date()` once at mount. Tabs never unmount, and a
 * home-screen web app can stay alive for days — so leaving it open past midnight
 * left every screen believing it was still yesterday. On the one screen that
 * writes data that means logging to the wrong day, which is the bug this whole
 * app exists to prevent.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  return now;
}
