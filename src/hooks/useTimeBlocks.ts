import { useCallback, useMemo } from 'react';
import { endOfDay, startOfDay } from 'date-fns';

import {
  deleteTimeBlock,
  getLastTimeBlock,
  insertTimeBlock,
  listTimeBlocksForRange,
  updateTimeBlock,
  type TimeBlockInput,
} from '@/db/timeBlocks';
import type { TimeBlock } from '@/lib/types';
import { useDbVersion } from './DbVersionContext';

// expo-sqlite's *Sync calls are synchronous, so these read straight from
// useMemo (keyed on dbVersion) instead of useEffect+useState — no async
// gap, no stale data on first render.

export function useTimeBlocksForDay(day: Date) {
  const { version, bump } = useDbVersion();

  // `version` is the invalidation key, not an input — it bumps on every write
  // so this re-queries SQLite. eslint can't see that it matters.
  const blocks = useMemo(() => {
    const rangeStart = startOfDay(day).toISOString();
    const rangeEnd = endOfDay(day).toISOString();
    return listTimeBlocksForRange(rangeStart, rangeEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, version]);

  const add = useCallback(
    (input: TimeBlockInput) => {
      const id = insertTimeBlock(input);
      bump();
      return id;
    },
    [bump]
  );

  const update = useCallback(
    (id: number, input: TimeBlockInput) => {
      updateTimeBlock(id, input);
      bump();
    },
    [bump]
  );

  const remove = useCallback(
    (id: number) => {
      deleteTimeBlock(id);
      bump();
    },
    [bump]
  );

  return { blocks, add, update, remove };
}

export function useTimeBlocksForRange(rangeStart: Date, rangeEnd: Date): TimeBlock[] {
  const { version } = useDbVersion();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => listTimeBlocksForRange(startIso, endIso), [startIso, endIso, version]);
}

export function useLastTimeBlock(): TimeBlock | null {
  const { version } = useDbVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getLastTimeBlock(), [version]);
}
