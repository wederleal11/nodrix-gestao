import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Task } from '../types';
import {
  checklistProgress, taskPredecessors, taskDependents, taskDependencySummary, validatePredecessorSelection,
} from './taskDependencies';

const task = (id: string, status: string, predecessorIds: string[] = []): Task =>
  ({ id, status, predecessorIds, title: id } as Task);

test('green checklist only after every item is completed', () => {
  assert.equal(checklistProgress({ checklist: [] }).isComplete, false);
  assert.deepEqual(checklistProgress({ checklist: [
    { id: 'a', text: 'A', done: true }, { id: 'b', text: 'B', done: false },
  ] }), { total: 2, completed: 1, pending: 1, isComplete: false });
  assert.equal(checklistProgress({ checklist: [{ id: 'a', text: 'A', done: true }] }).isComplete, true);
});
test('Go Live shows tasks that depend on it and how many remain', () => {
  const tasks = [task('go-live', 'planned', ['qa']), task('qa', 'completed'),
    task('deploy', 'in_progress', ['go-live']), task('monitor', 'completed', ['go-live'])];
  assert.deepEqual(taskPredecessors(tasks[0], tasks).map(t => t.id), ['qa']);
  assert.deepEqual(taskDependents(tasks[0], tasks).map(t => t.id), ['deploy', 'monitor']);
  assert.equal(taskDependencySummary(tasks[0], tasks).dependentsTotal, 2);
  assert.equal(taskDependencySummary(tasks[0], tasks).dependentsPending, 1);
});
test('self links, duplicates, missing nodes and indirect cycles rejected', () => {
  const tasks = [task('a', 'planned', ['b']), task('b', 'planned', ['c']), task('c', 'planned')];
  assert.match(validatePredecessorSelection('a', ['a'], tasks) || '', /si mesma/);
  assert.match(validatePredecessorSelection('a', ['missing'], tasks) || '', /não existe/);
  assert.match(validatePredecessorSelection('a', ['b', 'b'], tasks) || '', /duplicadas/);
  assert.match(validatePredecessorSelection('c', ['a'], tasks) || '', /circular/);
  assert.equal(validatePredecessorSelection('a', ['c'], tasks), null);
});
test('deleted predecessors remain counted as pending rather than disappearing', () => {
  const t = task('go-live', 'planned', ['removed']);
  const stats = taskDependencySummary(t, [t]);
  assert.equal(stats.predecessorsTotal, 1);
  assert.equal(stats.predecessorsPending, 1);
  assert.deepEqual(stats.missingPredecessorIds, ['removed']);
});
