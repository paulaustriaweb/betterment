import { useCallback, useMemo } from 'react';
import { endOfDay, startOfDay } from 'date-fns';

import {
  deleteTimeBlock,
  getFirstStart,
  getLastTimeBlock,
  insertTimeBlock,
  listTimeBlocksForRange,
  updateTimeBlock,
  type TimeBlockInput,
} from '@/db/timeBlocks';
import type { TimeBlock } from '@/lib/types';
import { useWrite } from './DbVersionContext';
import { useDbQuery } from './useDbQuery';

const NONE: TimeBlock[] = [];

/** `ready` is false until this exact day's entries have loaded. */
export function useTimeBlocksForDay(day: Date) {
  const write = useWrite();
  const startIso = startOfDay(day).toISOString();
  const endIso = endOfDay(day).toISOString();
  const read = useCallback(() => listTimeBlocksForRange(startIso, endIso), [startIso, endIso]);
  const { data: blocks, current: ready, loaded } = useDbQuery(`day:${startIso}`, read, NONE);

  const add = useCallback((input: TimeBlockInput) => write(() => insertTimeBlock(input)), [write]);
  const update = useCallback(
    (id: number, input: TimeBlockInput) => write(() => updateTimeBlock(id, input)),
    [write]
  );
  const remove = useCallback((id: number) => write(() => deleteTimeBlock(id)), [write]);

  return { blocks, ready, loaded, add, update, remove };
}

export function useTimeBlocksForRange(rangeStart: Date, rangeEnd: Date) {
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  const read = useCallback(() => listTimeBlocksForRange(startIso, endIso), [startIso, endIso]);
  const { data, current, loaded } = useDbQuery(`range:${startIso}:${endIso}`, read, NONE);
  return { blocks: data, ready: current, loaded };
}

/**
 * When tracking began: the first entry's start. Days before it aren't "not logged" —
 * the app didn't exist for you yet. Null until the first entry is saved.
 */
export function useTrackingStart(): Date | null {
  const iso = useDbQuery<string | null>('firstStart', getFirstStart, null).data;
  return useMemo(() => (iso ? new Date(iso) : null), [iso]);
}

export function useLastTimeBlock(): TimeBlock | null {
  return useDbQuery<TimeBlock | null>('lastBlock', getLastTimeBlock, null).data;
}
