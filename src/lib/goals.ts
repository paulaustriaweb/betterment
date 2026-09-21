import { differenceInCalendarDays } from 'date-fns';

import type { Goal } from './types';

export type Urgency = 'overdue' | 'soon' | 'later';

export function daysUntil(deadlineIso: string, from: Date): number {
  return differenceInCalendarDays(new Date(deadlineIso), from);
}

export function urgencyOf(days: number): Urgency {
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'later';
}

/** 0 at creation, 1 at the deadline. Clamped, so an overdue goal reads as full. */
export function goalProgress(createdAtIso: string, deadlineIso: string, now: Date): number {
  const start = new Date(createdAtIso).getTime();
  const end = new Date(deadlineIso).getTime();
  if (end <= start) return 1;
  const ratio = (now.getTime() - start) / (end - start);
  return Math.min(1, Math.max(0, ratio));
}

export function sortByDeadline(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export function countdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
}
