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
import { safeRead } from '@/db/safeRead';
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
    return safeRead(`day:${rangeStart}`, () => listTimeBlocksForRange(rangeStart, rangeEnd), [] as TimeBlock[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, version]);

  const add = useCallback(
    (input: TimeBlockInput) => {
      try {
        return insertTimeBlock(input);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const update = useCallback(
    (id: number, input: TimeBlockInput) => {
      try {
        updateTimeBlock(id, input);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const remove = useCallback(
    (id: number) => {
      try {
        deleteTimeBlock(id);
      } finally {
        bump();
      }
    },
    [bump]
  );

  return { blocks, add, update, remove };
}

export function useTimeBlocksForRange(rangeStart: Date, rangeEnd: Date): TimeBlock[] {
  const { version } = useDbVersion();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  return useMemo(
    () => safeRead(`range:${startIso}:${endIso}`, () => listTimeBlocksForRange(startIso, endIso), [] as TimeBlock[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startIso, endIso, version]
  );
}

export function useLastTimeBlock(): TimeBlock | null {
  const { version } = useDbVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => safeRead('lastBlock', getLastTimeBlock, null as TimeBlock | null), [version]);
}
