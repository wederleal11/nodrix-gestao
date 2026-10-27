import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortTasksByDeadline } from './kanbanDeadlineOrder';
const task = (id: string, deadline?: string) => ({ id, title: id, deadline });

test('sorts 01/10, 02/10, 03/10, across months and years; no deadline last', () => {
  const tasks = [
    task('none'), task('oct3','2026-10-03'), task('nov1','2026-11-01'),
    task('oct1','2026-10-01'), task('oct2','2026-10-02'), task('old','2025-12-31'),
  ];
  assert.deepEqual(sortTasksByDeadline(tasks).map(t => t.id),
    ['old','oct1','oct2','oct3','nov1','none']);
  assert.equal(tasks[0].id, 'none', 'never mutate the caller');
});

test('equal dates sort predictably; a rescheduled date reorders immediately', () => {
  const tasks = [task('z','2026-10-30'),task('b','2026-10-30'),task('a','2026-10-31')];
  assert.deepEqual(sortTasksByDeadline(tasks).map(t=>t.id), ['b','z','a']);
  const changed = tasks.map(t => t.id === 'a' ? {...t, deadline: '2026-10-29'} : t);
  assert.deepEqual(sortTasksByDeadline(changed).map(t=>t.id), ['a','b','z']);
});

test('overdue goes first; missing/invalid dates go last', () => {
  const items=[task('missing',''),task('future','2027-01-01'),
    task('expired','2026-10-01'),task('invalid','2026-13-01')];
  assert.deepEqual(sortTasksByDeadline(items).map(t=>t.id), ['expired','future','invalid','missing']);
});
