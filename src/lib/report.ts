import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { capAtNow, loggedMinutesInRange, minutesByCategory, unloggedBetween } from './time';
import type { TimeBlock } from './types';

export interface Slice {
  categoryId: number;
  minutes: number;
}

/** What a range looked like — the report Overview shows. */
export interface Report {
  /** Minutes logged in the range, up to now. Overlaps counted once. */
  logged: number;
  /** Per category, largest first. */
  slices: Slice[];
  /** Days in the range since tracking began, today included — the average's divisor. */
  trackedDays: number;
  /**
   * Unlogged time on days that are over, since tracking began. Today never counts:
   * it's logged at night, so a gap at 3 PM isn't missing yet.
   */
  unloggedPast: number;
  /** Where the latest entry in the range ends — where tonight's logging picks up. */
  loggedUntil: Date | null;
}

export function buildReport(
  blocks: TimeBlock[],
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
  trackingStart: Date | null
): Report {
  const elapsedEnd = capAtNow(rangeEnd, now);
  const logged = elapsedEnd > rangeStart ? loggedMinutesInRange(blocks, rangeStart, elapsedEnd) : 0;

  const slices = [...minutesByCategory(blocks, rangeStart, elapsedEnd)]
    .map(([categoryId, minutes]) => ({ categoryId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  let trackedDays = 0;
  let unloggedPast = 0;
  if (trackingStart) {
    const from = trackingStart > rangeStart ? trackingStart : rangeStart;
    const lastDay = startOfDay(elapsedEnd.getTime() === rangeEnd.getTime() ? new Date(rangeEnd.getTime() - 1) : elapsedEnd);
    trackedDays = Math.max(0, differenceInCalendarDays(lastDay, startOfDay(from)) + 1);
    unloggedPast = unloggedBetween(blocks, from, capAtNow(rangeEnd, startOfDay(now)));
  }

  let loggedUntil: Date | null = null;
  for (const b of blocks) {
    const end = new Date(b.endTime);
    if (new Date(b.startTime) < rangeEnd && (!loggedUntil || end > loggedUntil)) loggedUntil = end;
  }

  return { logged, slices, trackedDays, unloggedPast, loggedUntil };
}
