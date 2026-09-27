import { useCallback } from 'react';

import { listSettings, setSetting } from '@/db/settings';
import { useWrite, type Table } from './tableVersions';
import { useDbQuery } from './useDbQuery';

export const SETTINGS_KEY = 'settings';
const NONE: Record<string, string> = {};
const SETTINGS: Table[] = ['settings'];

/**
 * Primed at startup (see _layout), so the stored value is there on the first
 * render — no flash of PHP before someone's USD, no 1h default before their 30m.
 */
export function useSetting(key: string, fallback: string): [string, (value: string) => Promise<void>] {
  const write = useWrite(SETTINGS);
  const all = useDbQuery(SETTINGS_KEY, SETTINGS, listSettings, NONE).data;
  const set = useCallback((next: string) => write(() => setSetting(key, next)), [key, write]);
  return [all[key] ?? fallback, set];
}
