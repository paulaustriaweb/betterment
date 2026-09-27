import { useCallback } from 'react';

import { deleteGoal, insertGoal, listGoals, setGoalComplete, updateGoal } from '@/db/goals';
import type { Goal } from '@/lib/types';
import { useWrite, type Table } from './tableVersions';
import { useDbQuery } from './useDbQuery';

const NONE: Goal[] = [];
const GOALS: Table[] = ['goals'];

export function useGoals() {
  const write = useWrite(GOALS);
  const { data: goals, loaded } = useDbQuery('goals', GOALS, listGoals, NONE);

  const add = useCallback(
    (title: string, deadlineIso: string, createdAt?: string) =>
      write(() => insertGoal(title, deadlineIso, createdAt)),
    [write]
  );
  const update = useCallback(
    (id: number, title: string, deadlineIso: string) => write(() => updateGoal(id, title, deadlineIso)),
    [write]
  );
  const setComplete = useCallback(
    (id: number, complete: boolean) => write(() => setGoalComplete(id, complete)),
    [write]
  );
  const remove = useCallback((id: number) => write(() => deleteGoal(id)), [write]);

  return { goals, loaded, add, update, setComplete, remove };
}
