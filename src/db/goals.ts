import { getDb } from './client';
import type { Goal } from '@/lib/types';

interface GoalRow {
  id: number;
  title: string;
  deadline: string;
  is_complete: number;
  created_at: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    deadline: row.deadline,
    isComplete: Boolean(row.is_complete),
    createdAt: row.created_at,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const rows = await getDb().getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY deadline ASC');
  return rows.map(toGoal);
}

/**
 * `createdAt` is only passed when undoing a delete, so the goal comes back with
 * its progress bar where it was instead of starting again from empty.
 */
export async function insertGoal(title: string, deadlineIso: string, createdAt?: string): Promise<number> {
  const db = getDb();

  // The same thing due on the same day is one goal. Check and insert in one
  // statement, so two saves can't both pass the check.
  const result = await db.runAsync(
    `INSERT INTO goals (title, deadline, is_complete, created_at)
     SELECT ?, ?, 0, ?
     WHERE NOT EXISTS (SELECT 1 FROM goals WHERE title = ? AND deadline = ? AND is_complete = 0)`,
    [title, deadlineIso, createdAt ?? new Date().toISOString(), title, deadlineIso]
  );
  if (result.changes > 0) return result.lastInsertRowId;

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM goals WHERE title = ? AND deadline = ? AND is_complete = 0 LIMIT 1',
    [title, deadlineIso]
  );
  return existing?.id ?? 0;
}

export async function updateGoal(id: number, title: string, deadlineIso: string): Promise<void> {
  await getDb().runAsync('UPDATE goals SET title = ?, deadline = ? WHERE id = ?', [title, deadlineIso, id]);
}

export async function setGoalComplete(id: number, complete: boolean): Promise<void> {
  await getDb().runAsync('UPDATE goals SET is_complete = ? WHERE id = ?', [complete ? 1 : 0, id]);
}

export async function deleteGoal(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM goals WHERE id = ?', [id]);
}
