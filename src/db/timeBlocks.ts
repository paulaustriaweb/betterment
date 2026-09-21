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

export function listTimeBlocksForRange(rangeStartIso: string, rangeEndIso: string): TimeBlock[] {
  const db = getDb();
  const rows = db.getAllSync<TimeBlockRow>(
    'SELECT * FROM time_blocks WHERE start_time < ? AND end_time > ? ORDER BY start_time ASC',
    [rangeEndIso, rangeStartIso]
  );
  return rows.map(toTimeBlock);
}

export function getLastTimeBlock(): TimeBlock | null {
  const db = getDb();
  const row = db.getFirstSync<TimeBlockRow>('SELECT * FROM time_blocks ORDER BY end_time DESC LIMIT 1');
  return row ? toTimeBlock(row) : null;
}

export interface TimeBlockInput {
  startTime: string;
  endTime: string;
  categoryId: number;
  note: string | null;
}

export function insertTimeBlock(input: TimeBlockInput): number {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.runSync(
    'INSERT INTO time_blocks (start_time, end_time, category_id, note, created_at) VALUES (?, ?, ?, ?, ?)',
    [input.startTime, input.endTime, input.categoryId, input.note, now]
  );
  return result.lastInsertRowId;
}

export function updateTimeBlock(id: number, input: TimeBlockInput): void {
  const db = getDb();
  db.runSync('UPDATE time_blocks SET start_time = ?, end_time = ?, category_id = ?, note = ? WHERE id = ?', [
    input.startTime,
    input.endTime,
    input.categoryId,
    input.note,
    id,
  ]);
}

export function deleteTimeBlock(id: number): void {
  const db = getDb();
  db.runSync('DELETE FROM time_blocks WHERE id = ?', [id]);
}
