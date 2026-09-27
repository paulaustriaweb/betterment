import { addDays } from 'date-fns/addDays';
import { addHours } from 'date-fns/addHours';
import { startOfDay } from 'date-fns/startOfDay';

import type { Slice } from './report';
import { capAtNow, minutesByCategory } from './time';
import type { TimeBlock } from './types';

/** One bar: a stretch of time and what filled it. */
export interface Column {
  start: Date;
  /** Per activity, in a fixed order so colours stack the same way in every bar. */
  segments: Slice[];
  /** Logged minutes in the bar, never more than `capacity`. */
  total: number;
  /** What a full bar means: 60 for an hour, 1440 for a day. */
  capacity: number;
  /** Hasn't started yet — drawn as an empty track. */
  future: boolean;
}

function column(blocks: TimeBlock[], start: Date, end: Date, capacity: number, now: Date): Column {
  const future = start >= now;
  const segments = future
    ? []
    : [...minutesByCategory(blocks, start, capAtNow(end, now))]
        .map(([categoryId, minutes]) => ({ categoryId, minutes }))
        .sort((a, b) => a.categoryId - b.categoryId);
  const total = Math.min(capacity, segments.reduce((sum, s) => sum + s.minutes, 0));
  return { start, segments, total, capacity, future };
}

/** A day as 24 hourly bars — when things happened, not just how much. */
export function hourlyColumns(blocks: TimeBlock[], day: Date, now: Date): Column[] {
  const base = startOfDay(day);
  return Array.from({ length: 24 }, (_, h) => column(blocks, addHours(base, h), addHours(base, h + 1), 60, now));
}

/**
 * One bar per day, each out of a full 24 hours — so the empty part of a bar is the
 * time that went unlogged. The gray gap, as a chart.
 */
export function dailyColumns(blocks: TimeBlock[], days: Date[], now: Date): Column[] {
  return days.map((d) => {
    const start = startOfDay(d);
    return column(blocks, start, addDays(start, 1), 24 * 60, now);
  });
}
