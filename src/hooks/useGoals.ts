import { useCallback, useMemo } from 'react';

import { deleteGoal, insertGoal, listGoals, setGoalComplete, updateGoal } from '@/db/goals';
import { safeRead } from '@/db/safeRead';
import type { Goal } from '@/lib/types';
import { useDbVersion } from './DbVersionContext';

export function useGoals() {
  const { version, bump } = useDbVersion();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goals = useMemo(() => safeRead('goals', listGoals, [] as Goal[]), [version]);

  const add = useCallback(
    (title: string, deadlineIso: string) => {
      try {
        return insertGoal(title, deadlineIso);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const update = useCallback(
    (id: number, title: string, deadlineIso: string) => {
      try {
        updateGoal(id, title, deadlineIso);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const setComplete = useCallback(
    (id: number, complete: boolean) => {
      try {
        setGoalComplete(id, complete);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const remove = useCallback(
    (id: number) => {
      try {
        deleteGoal(id);
      } finally {
        bump();
      }
    },
    [bump]
  );

  return { goals, add, update, setComplete, remove };
}
