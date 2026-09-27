import { addDays } from 'date-fns/addDays';
import { addHours } from 'date-fns/addHours';
import { startOfDay } from 'date-fns/startOfDay';

import type { Slice } from './report';
import { capAtNow, minutesByCategory } from './time';
import type { TimeBlock } from './types';

export interface Change {
  categoryId: number;
  now: number;
  before: number;
  /** now − before, in minutes. */
  delta: number;
}

/** Each activity now against the same stretch last time, largest now first. */
export function compareSlices(current: Slice[], previous: Slice[]): Change[] {
  const before = new Map(previous.map((s) => [s.categoryId, s.minutes]));
  const ids = new Set([...current.map((s) => s.categoryId), ...previous.map((s) => s.categoryId)]);
  const now = new Map(current.map((s) => [s.categoryId, s.minutes]));
  return [...ids]
    .map((id) => {
      const n = now.get(id) ?? 0;
      const b = before.get(id) ?? 0;
      return { categoryId: id, now: n, before: b, delta: n - b };
    })
    .sort((a, b) => b.now - a.now || b.before - a.before);
}

/**
 * The change worth one line on Overview: the biggest swing, if it's at least
 * half an hour — smaller than that is noise, not news.
 */
export function biggestChange(changes: Change[], minMinutes = 30): Change | null {
  let best: Change | null = null;
  for (const c of changes) {
    if (Math.abs(c.delta) < minMinutes) continue;
    if (!best || Math.abs(c.delta) > Math.abs(best.delta)) best = c;
  }
  return best;
}

export interface LateNight {
  minutes: number;
  /** Per activity, largest first. */
  slices: Slice[];
}

/**
 * Time logged awake after 11 PM — from 11 PM until the night ends (5 AM by default),
 * for each day given, excluding sleep. Late nights are what this app was built to
 * make visible, so they get their own number.
 */
export function awakeLate(
  blocks: TimeBlock[],
  days: Date[],
  now: Date,
  excluded: Set<number>,
  nightEndsHour = 5
): LateNight {
  const totals = new Map<number, number>();
  for (const day of days) {
    const start = addHours(startOfDay(day), 23);
    const end = capAtNow(addHours(startOfDay(addDays(day, 1)), nightEndsHour), now);
    if (end <= start) continue;
    for (const [id, minutes] of minutesByCategory(blocks, start, end)) {
      if (!excluded.has(id)) totals.set(id, (totals.get(id) ?? 0) + minutes);
    }
  }
  const slices = [...totals]
    .map(([categoryId, minutes]) => ({ categoryId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  return { minutes: slices.reduce((sum, s) => sum + s.minutes, 0), slices };
}
