import { getDb } from './client';
import type { Category } from '@/lib/types';

interface CategoryRow {
  id: number;
  name: string;
  color: string;
  is_active: number;
}

/**
 * All of them, hidden ones included. Entries keep pointing at a category after it
 * is hidden, so every colour and name lookup has to still resolve — only the
 * picker on Log filters down to the active ones.
 */
export async function listCategories(): Promise<Category[]> {
  const rows = await getDb().getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY id ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, isActive: !!r.is_active }));
}

export async function renameCategory(id: number, name: string): Promise<void> {
  await getDb().runAsync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

export async function setCategoryActive(id: number, active: boolean): Promise<void> {
  await getDb().runAsync('UPDATE categories SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
}
