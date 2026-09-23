import { useCallback } from 'react';

import { listSettings, setSetting } from '@/db/settings';
import { useWrite } from './DbVersionContext';
import { useDbQuery } from './useDbQuery';

export const SETTINGS_KEY = 'settings';
const NONE: Record<string, string> = {};

/**
 * Primed at startup (see _layout), so the stored value is there on the first
 * render — no flash of PHP before someone's USD, no 1h default before their 30m.
 */
export function useSetting(key: string, fallback: string): [string, (value: string) => Promise<void>] {
  const write = useWrite();
  const all = useDbQuery(SETTINGS_KEY, listSettings, NONE).data;
  const set = useCallback((next: string) => write(() => setSetting(key, next)), [key, write]);
  return [all[key] ?? fallback, set];
}
