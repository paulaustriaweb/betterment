import { useCallback, useMemo } from 'react';

import { deleteGoal, insertGoal, listGoals, setGoalComplete } from '@/db/goals';
import { useDbVersion } from './DbVersionContext';

export function useGoals() {
  const { version, bump } = useDbVersion();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goals = useMemo(() => listGoals(), [version]);

  const add = useCallback(
    (title: string, deadlineIso: string) => {
      const id = insertGoal(title, deadlineIso);
      bump();
      return id;
    },
    [bump]
  );

  const setComplete = useCallback(
    (id: number, complete: boolean) => {
      setGoalComplete(id, complete);
      bump();
    },
    [bump]
  );

  const remove = useCallback(
    (id: number) => {
      deleteGoal(id);
      bump();
    },
    [bump]
  );

  return { goals, add, setComplete, remove };
}
