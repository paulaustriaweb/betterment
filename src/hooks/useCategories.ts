import { useMemo } from 'react';

import { listActiveCategories } from '@/db/categories';
import type { Category } from '@/lib/types';
import { useDbVersion } from './DbVersionContext';

export function useCategories(): Category[] {
  const { version } = useDbVersion();
  // `version` is the invalidation key, not an input — it bumps on every write
  // so this re-queries SQLite. eslint can't see that it matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => listActiveCategories(), [version]);
}
