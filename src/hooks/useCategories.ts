import { useCallback } from 'react';

import { listCategories, renameCategory, setCategoryActive } from '@/db/categories';
import type { Category } from '@/lib/types';
import { useWrite } from './DbVersionContext';
import { useDbQuery } from './useDbQuery';

export const CATEGORIES_KEY = 'categories';
const NONE: Category[] = [];

/** Primed at startup (see _layout), so this is never empty on a first render. */
export function useCategories(): Category[] {
  return useDbQuery(CATEGORIES_KEY, listCategories, NONE).data;
}

export function useCategoryEdits() {
  const write = useWrite();
  const rename = useCallback((id: number, name: string) => write(() => renameCategory(id, name)), [write]);
  const setActive = useCallback(
    (id: number, active: boolean) => write(() => setCategoryActive(id, active)),
    [write]
  );
  return { rename, setActive };
}
