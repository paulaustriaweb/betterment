import { useCallback, useMemo } from 'react';

import { getSetting, setSetting } from '@/db/settings';
import { safeRead } from '@/db/safeRead';
import { useDbVersion } from './DbVersionContext';

export function useSetting(key: string, fallback: string): [string, (value: string) => void] {
  const { version, bump } = useDbVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => safeRead(`setting:${key}`, () => getSetting(key) ?? fallback, fallback), [key, fallback, version]);

  const set = useCallback(
    (next: string) => {
      try {
        setSetting(key, next);
      } finally {
        bump();
      }
    },
    [key, bump]
  );

  return [value, set];
}
