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
    last.current = now;
    return true;
  };
}
