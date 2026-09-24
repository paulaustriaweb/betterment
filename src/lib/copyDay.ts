import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';

import { detectOverlap } from './time';
import type { TimeBlock } from './types';

export interface Draft {
  startTime: string;
  endTime: string;
  categoryId: number;
  note: string | null;
}

/**
 * A day's entries moved onto another day, for a day that mostly repeats. Only entries
 * that start on the source day are copied. Dropped: anything that would end after
 * `now` (it hasn't happened), and anything clashing with what's already logged there.
 */
export function copyDay(
  sourceBlocks: TimeBlock[],
  sourceDay: Date,
  targetDay: Date,
  targetBlocks: TimeBlock[],
  now: Date
): Draft[] {
  const from = startOfDay(sourceDay);
  const shift = differenceInCalendarDays(startOfDay(targetDay), from);
  return sourceBlocks
    .filter((b) => differenceInCalendarDays(startOfDay(new Date(b.startTime)), from) === 0)
    .map((b) => ({
      start: addDays(new Date(b.startTime), shift),
      end: addDays(new Date(b.endTime), shift),
      block: b,
    }))
    .filter(({ start, end }) => end <= now && !detectOverlap(targetBlocks, start, end))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map(({ start, end, block }) => ({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      categoryId: block.categoryId,
      note: block.note,
    }));
}
