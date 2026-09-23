import { useCallback, useRef } from 'react';

/**
 * Runs a submit unless one is already in flight, or finished within `windowMs`.
 *
 * Saves are async, so an impatient second tap lands while the first is still
 * writing — and would write the same thing twice. Inserts are idempotent in the
 * database too; this stops the second write being attempted at all. The window
 * starts when the save ends, not when it began.
 */
export function useSubmitGuard(windowMs = 700) {
  const busy = useRef(false);
  const finishedAt = useRef(0);

  return useCallback(
    async (work: () => Promise<void>) => {
      if (busy.current || Date.now() - finishedAt.current < windowMs) return;
      busy.current = true;
      try {
        await work();
      } finally {
        busy.current = false;
        finishedAt.current = Date.now();
      }
    },
    [windowMs]
  );
}
