import { useCallback, useSyncExternalStore } from 'react';

/**
 * One version number per table, bumped after every write to it. Queries re-read
 * when a table they depend on changes — and only then.
 *
 * This used to be one counter for the whole database in a React context, so saving
 * a time entry re-rendered all five tabs and re-read settings, categories, money and
 * goals too. A small store with per-table snapshots means only the components that
 * read the written table re-render.
 */
export type Table = 'time' | 'money' | 'goals' | 'settings' | 'categories';
export const ALL_TABLES: Table[] = ['time', 'money', 'goals', 'settings', 'categories'];

const versions: Record<Table, number> = { time: 0, money: 0, goals: 0, settings: 0, categories: 0 };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bumpTables(tables: Table[]): void {
  for (const t of tables) versions[t] += 1;
  for (const listener of listeners) listener();
}

/** A single number that changes whenever any of `tables` is written. */
function versionOf(tables: Table[]): number {
  return tables.reduce((sum, t) => sum + versions[t], 0);
}

export function useTablesVersion(tables: Table[]): number {
  // Joined so the snapshot getter is stable for the same set of tables.
  const key = tables.join(',');
  const get = useCallback(() => versionOf(key.split(',') as Table[]), [key]);
  return useSyncExternalStore(subscribe, get, get);
}

/**
 * Runs a write, then bumps its tables in `finally` — a write that threw may well have
 * landed, and the screen has to show what's actually stored. The error still
 * propagates: the caller is the one who says so where the action happened.
 */
export function useWrite(tables: Table[]) {
  const key = tables.join(',');
  return useCallback(
    async <T,>(write: () => Promise<T>): Promise<T> => {
      try {
        return await write();
      } finally {
        bumpTables(key.split(',') as Table[]);
      }
    },
    [key]
  );
}
