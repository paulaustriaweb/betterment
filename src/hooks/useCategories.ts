import { useCallback } from 'react';

import { insertCategory, listCategories, renameCategory, setCategoryActive } from '@/db/categories';
import type { Category } from '@/lib/types';
import { useWrite, type Table } from './tableVersions';
import { useDbQuery } from './useDbQuery';

export const CATEGORIES_KEY = 'categories';
const NONE: Category[] = [];
const CATEGORIES: Table[] = ['categories'];

/** Primed at startup (see _layout), so this is never empty on a first render. */
export function useCategories(): Category[] {
  return useDbQuery(CATEGORIES_KEY, CATEGORIES, listCategories, NONE).data;
}

export function useCategoryEdits() {
  const write = useWrite(CATEGORIES);
  const rename = useCallback((id: number, name: string) => write(() => renameCategory(id, name)), [write]);
  const setActive = useCallback(
    (id: number, active: boolean) => write(() => setCategoryActive(id, active)),
    [write]
  );
  const create = useCallback((name: string, color: string) => write(() => insertCategory(name, color)), [write]);
  return { rename, setActive, create };
}
