import { useEffect, useState } from 'react';

import { useDbVersion } from './DbVersionContext';

/** Last value seen per key, across every hook — revisiting a day or range is instant. */
const cache = new Map<string, unknown>();

/**
 * One read per key per dbVersion, shared by every hook asking for it. A dozen
 * components read settings; without this each write fired a dozen identical
 * queries at the worker and re-rendered once per answer.
 */
const reads = new Map<string, { version: number; promise: Promise<unknown> }>();

function readOnce<T>(key: string, version: number, read: () => Promise<T>): Promise<T> {
  const hit = reads.get(key);
  if (hit && hit.version === version) return hit.promise as Promise<T>;
  const promise = read().then((data) => {
    cache.set(key, data);
    return data;
  });
  reads.set(key, { version, promise });
  // A failed read mustn't be handed out again — the next asker retries.
  promise.catch(() => {
    if (reads.get(key)?.promise === promise) reads.delete(key);
  });
  return promise;
}

/**
 * Fills the cache before the first screen renders, for reads every screen needs.
 * Counts as the read for the starting version, so mounting doesn't read again.
 */
export function primeQuery(key: string, value: unknown): void {
  cache.set(key, value);
  reads.set(key, { version: 0, promise: Promise.resolve(value) });
}

interface State<T> {
  key: string;
  data: T;
  /** `data` belongs to `key` — not a leftover from the previous key. */
  current: boolean;
  /** `data` came from the database at all, rather than being the fallback. */
  loaded: boolean;
}

/**
 * Reads SQLite in an effect and re-reads after every write (via dbVersion).
 *
 * Reads used to run during render against the sync API, so a stalled read threw
 * during render and took the app down. Async reads can't block, and a failed one
 * just keeps the last value and logs.
 *
 * While a new key loads, the previous key's data stays on screen (marked not
 * `current`) so switching range doesn't flash an empty screen. Until the very first
 * value arrives, `loaded` is false — screens hold their figures back rather than
 * show a number computed from nothing. `read` must be
 * stable for a given key — wrap it in useCallback keyed on the same inputs.
 */
export function useDbQuery<T>(key: string, read: () => Promise<T>, fallback: T) {
  const { version } = useDbVersion();
  const [state, setState] = useState<State<T>>(() =>
    cache.has(key)
      ? { key, data: cache.get(key) as T, current: true, loaded: true }
      : { key, data: fallback, current: false, loaded: false }
  );

  // Key changed: adjust during render, not in an effect.
  if (state.key !== key) {
    setState(
      cache.has(key)
        ? { key, data: cache.get(key) as T, current: true, loaded: true }
        : { key, data: state.data, current: false, loaded: state.loaded }
    );
  }

  useEffect(() => {
    let live = true;
    readOnce(key, version, read).then(
      (data) => {
        if (!live) return;
        // Same object as already shown (shared read, or the primed value): keep the
        // old state so React skips the re-render.
        setState((prev) =>
          prev.key === key && prev.current && prev.data === data ? prev : { key, data, current: true, loaded: true }
        );
      },
      (error: unknown) => console.error(`[db] read failed: ${key}`, error)
    );
    return () => {
      live = false;
    };
  }, [key, read, version]);

  // On the pass where the key has just changed, state still describes the old key
  // until the adjustment above lands — it must not claim to be current.
  return { data: state.data, current: state.key === key && state.current, loaded: state.loaded };
}
