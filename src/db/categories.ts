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
export function listCategories(): Category[] {
  const db = getDb();
  const rows = db.getAllSync<CategoryRow>('SELECT * FROM categories ORDER BY id ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, isActive: !!r.is_active }));
}

export function renameCategory(id: number, name: string): void {
  getDb().runSync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

export function setCategoryActive(id: number, active: boolean): void {
  getDb().runSync('UPDATE categories SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
}
