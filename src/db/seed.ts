import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORY_SEED } from '@/constants/categories';

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (row && row.count > 0) return;

  await db.withTransactionAsync(async () => {
    for (const cat of CATEGORY_SEED) {
      await db.runAsync('INSERT INTO categories (name, color, is_active) VALUES (?, ?, 1)', [cat.name, cat.color]);
    }
    await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['currency', 'PHP']);
    await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['reminder_time', '23:30']);
  });
}
