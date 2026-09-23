import { getDb } from './client';
import type { TimeBlock } from '@/lib/types';

interface TimeBlockRow {
  id: number;
  start_time: string;
  end_time: string;
  category_id: number;
  note: string | null;
  created_at: string;
}

function toTimeBlock(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    startTime: row.start_time,
    endTime: row.end_time,
    categoryId: row.category_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listTimeBlocksForRange(rangeStartIso: string, rangeEndIso: string): Promise<TimeBlock[]> {
  const rows = await getDb().getAllAsync<TimeBlockRow>(
    'SELECT * FROM time_blocks WHERE start_time < ? AND end_time > ? ORDER BY start_time ASC',
    [rangeEndIso, rangeStartIso]
  );
  return rows.map(toTimeBlock);
}

export async function getLastTimeBlock(): Promise<TimeBlock | null> {
  const row = await getDb().getFirstAsync<TimeBlockRow>('SELECT * FROM time_blocks ORDER BY end_time DESC LIMIT 1');
  return row ? toTimeBlock(row) : null;
}

export interface TimeBlockInput {
  startTime: string;
  endTime: string;
  categoryId: number;
  note: string | null;
}

export async function insertTimeBlock(input: TimeBlockInput): Promise<number> {
  const db = getDb();
  const same = [input.startTime, input.endTime, input.categoryId];

  // The same category over the exact same minutes is one entry, never two, so a
  // repeated save keeps what is already there rather than adding a copy. The check
  // and the insert are one statement: as two awaits, a second save could slip in
  // between them and both would pass.
  const result = await db.runAsync(
    `INSERT INTO time_blocks (start_time, end_time, category_id, note, created_at)
     SELECT ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM time_blocks WHERE start_time = ? AND end_time = ? AND category_id = ?)`,
    [...same, input.note, new Date().toISOString(), ...same]
  );
  if (result.changes > 0) return result.lastInsertRowId;

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM time_blocks WHERE start_time = ? AND end_time = ? AND category_id = ? LIMIT 1',
    same
  );
  return existing?.id ?? 0;
}

export async function updateTimeBlock(id: number, input: TimeBlockInput): Promise<void> {
  await getDb().runAsync(
    'UPDATE time_blocks SET start_time = ?, end_time = ?, category_id = ?, note = ? WHERE id = ?',
    [input.startTime, input.endTime, input.categoryId, input.note, id]
  );
}

export async function deleteTimeBlock(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM time_blocks WHERE id = ?', [id]);
}
