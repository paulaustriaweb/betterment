import type { Clock } from './timeInput';
import type { TimeBlock } from './types';

export interface Routine {
  categoryId: number;
  start: Clock;
  end: Clock;
  /** How many times it was logged in the window looked at. */
  count: number;
}

function clockOf(iso: string): Clock {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes(), meridiem: d.getHours() < 12 ? 'am' : 'pm' };
}

/**
 * Entries logged the same way at least twice — same activity, same start and end
 * on the clock — most repeated first. Sleep 11 PM–7 AM every night becomes one tap.
 */
export function findRoutines(blocks: TimeBlock[], limit = 3): Routine[] {
  const groups = new Map<string, Routine & { last: string }>();
  for (const b of blocks) {
    const start = clockOf(b.startTime);
    const end = clockOf(b.endTime);
    const key = `${b.categoryId}|${start.hour}:${start.minute}|${end.hour}:${end.minute}`;
    const hit = groups.get(key);
    if (hit) {
      hit.count += 1;
      if (b.startTime > hit.last) hit.last = b.startTime;
    } else {
      groups.set(key, { categoryId: b.categoryId, start, end, count: 1, last: b.startTime });
    }
  }
  return [...groups.values()]
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1))
    .slice(0, limit)
    .map(({ categoryId, start, end, count }) => ({ categoryId, start, end, count }));
}

/** "11p–7a", "9:30a–12p" — short enough for a chip. */
export function shortClock(clock: Clock): string {
  const h = clock.hour % 12 || 12;
  const m = clock.minute ? `:${String(clock.minute).padStart(2, '0')}` : '';
  return `${h}${m}${clock.hour < 12 ? 'a' : 'p'}`;
}
