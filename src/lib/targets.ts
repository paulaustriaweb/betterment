import { addDays, startOfDay } from 'date-fns';

import { minutesByCategory } from './time';
import type { TimeBlock } from './types';

/** "Sleep at least 7h a day", "Scrolling at most 2h a day". */
export interface Target {
  categoryId: number;
  kind: 'atLeast' | 'atMost';
  minutes: number;
}

/** Stored as JSON in settings; anything malformed is dropped, never thrown. */
export function parseTargets(json: string): Target[] {
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (t): t is Target =>
        typeof t === 'object' &&
        t !== null &&
        Number.isInteger(t.categoryId) &&
        (t.kind === 'atLeast' || t.kind === 'atMost') &&
        Number.isFinite(t.minutes) &&
        t.minutes > 0
    );
  } catch {
    return [];
  }
}

/** One target on one day. */
export interface DayResult {
  minutes: number;
  /** Met: enough of an at-least, or not over an at-most. */
  met: boolean;
}

export function minutesOn(blocks: TimeBlock[], categoryId: number, day: Date): number {
  const start = startOfDay(day);
  return minutesByCategory(blocks, start, addDays(start, 1)).get(categoryId) ?? 0;
}

export function judge(target: Target, minutes: number): boolean {
  return target.kind === 'atLeast' ? minutes >= target.minutes : minutes <= target.minutes;
}

export interface TargetResult {
  target: Target;
  days: DayResult[];
  metDays: number;
}

/** Each target across the given days, oldest first. */
export function evaluateTargets(targets: Target[], blocks: TimeBlock[], days: Date[]): TargetResult[] {
  return targets.map((target) => {
    const results = days.map((day) => {
      const minutes = minutesOn(blocks, target.categoryId, day);
      return { minutes, met: judge(target, minutes) };
    });
    return { target, days: results, metDays: results.filter((r) => r.met).length };
  });
}
