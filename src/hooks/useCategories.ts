import { useCallback, useMemo } from 'react';

import { listCategories, renameCategory, setCategoryActive } from '@/db/categories';
import type { Category } from '@/lib/types';
import { useDbVersion } from './DbVersionContext';

export function useCategories(): Category[] {
  const { version } = useDbVersion();
  // `version` is the invalidation key, not an input — it bumps on every write
  // so this re-queries SQLite. eslint can't see that it matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => listCategories(), [version]);
}

export function useCategoryEdits() {
  const { bump } = useDbVersion();

  const rename = useCallback(
    (id: number, name: string) => {
      renameCategory(id, name);
      bump();
    },
    [bump]
  );

  const setActive = useCallback(
    (id: number, active: boolean) => {
      setCategoryActive(id, active);
      bump();
    },
    [bump]
  );

  return { rename, setActive };
}
