import { useRef } from 'react';

/**
 * Ignores a repeat submit that lands within `windowMs` of the last one.
 *
 * Saving blocks the main thread while SQLite works, so a second tap doesn't get
 * dropped — it queues and fires the moment the first finishes, writing the same
 * thing twice. Nothing about the write path is idempotent, so this is what stops
 * an impatient double-tap becoming two records.
 */
export function useSubmitGuard(windowMs = 700): () => boolean {
  const last = useRef(0);
  return () => {
    const now = Date.now();
    if (now - last.current < windowMs) return false;
    // Stamped again by the caller when the work finishes. The window has to start
    // from the end of the save, not the beginning: a save that blocks for a second
    // puts the next tap outside the window before it is even delivered.
    last.current = now;
    queueMicrotask(() => {
      last.current = Date.now();
    });
    return true;
  };
}
