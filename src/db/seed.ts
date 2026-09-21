import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORY_SEED } from '@/constants/categories';

export function seedIfEmpty(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (row && row.count > 0) return;

  for (const cat of CATEGORY_SEED) {
    db.runSync('INSERT INTO categories (name, color, is_active) VALUES (?, ?, 1)', [cat.name, cat.color]);
  }
  db.runSync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['currency', 'PHP']);
  db.runSync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['reminder_time', '23:30']);
}
