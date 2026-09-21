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

export function listGoals(): Goal[] {
  const db = getDb();
  return db.getAllSync<GoalRow>('SELECT * FROM goals ORDER BY deadline ASC').map(toGoal);
}

export function insertGoal(title: string, deadlineIso: string): number {
  const db = getDb();
  const result = db.runSync('INSERT INTO goals (title, deadline, is_complete, created_at) VALUES (?, ?, 0, ?)', [
    title,
    deadlineIso,
    new Date().toISOString(),
  ]);
  return result.lastInsertRowId;
}

export function setGoalComplete(id: number, complete: boolean): void {
  getDb().runSync('UPDATE goals SET is_complete = ? WHERE id = ?', [complete ? 1 : 0, id]);
}

export function deleteGoal(id: number): void {
  getDb().runSync('DELETE FROM goals WHERE id = ?', [id]);
}
