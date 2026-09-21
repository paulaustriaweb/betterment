import { getDb } from './client';
import type { Category } from '@/lib/types';

interface CategoryRow {
  id: number;
  name: string;
  color: string;
  is_active: number;
}

export function listActiveCategories(): Category[] {
  const db = getDb();
  const rows = db.getAllSync<CategoryRow>('SELECT * FROM categories WHERE is_active = 1 ORDER BY id ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, isActive: !!r.is_active }));
}
