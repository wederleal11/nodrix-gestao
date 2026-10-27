import type { Task } from '../types';
import { validLocalDeadline } from './taskDeadline';

/** Earliest calendar deadlines first, undated/invalid at the end; no timezone conversion. */
export function compareTasksByDeadline(
  a: Pick<Task, 'id' | 'title' | 'deadline'>,
  b: Pick<Task, 'id' | 'title' | 'deadline'>,
): number {
  const aDate = a.deadline && validLocalDeadline(a.deadline) ? a.deadline : null;
  const bDate = b.deadline && validLocalDeadline(b.deadline) ? b.deadline : null;
  if (aDate && bDate && aDate !== bDate) return aDate < bDate ? -1 : 1;
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;
  return a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id);
}

export function sortTasksByDeadline<T extends Pick<Task, 'id' | 'title' | 'deadline'>>(tasks: readonly T[]): T[] {
  return [...tasks].sort(compareTasksByDeadline);
}
