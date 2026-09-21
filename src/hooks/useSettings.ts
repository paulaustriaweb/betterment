import { useCallback, useMemo } from 'react';

import { getSetting, setSetting } from '@/db/settings';
import { useDbVersion } from './DbVersionContext';

export function useSetting(key: string, fallback: string): [string, (value: string) => void] {
  const { version, bump } = useDbVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => getSetting(key) ?? fallback, [key, fallback, version]);

  const set = useCallback(
    (next: string) => {
      setSetting(key, next);
      bump();
    },
    [key, bump]
  );

  return [value, set];
}
