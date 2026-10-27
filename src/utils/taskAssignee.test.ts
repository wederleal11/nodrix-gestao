import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTaskAssignee } from './taskAssignee';
const users = [
  { uid: 'creator', status: 'active' as const },
  { uid: 'other', status: 'active' as const },
  { uid: 'inactive', status: 'inactive' as const },
];
test('new demand defaults to its actual signed-in active creator', () => {
  assert.equal(defaultTaskAssignee(null, {uid:'creator',status:'active'}, users), 'creator');
});
test('existing task keeps its previous responsible instead of rewriting historical data', () => {
  assert.equal(defaultTaskAssignee({assigneeId:'other'}, {uid:'creator',status:'active'}, users), 'other');
});
test('inactive, missing or not-yet-loaded identities cannot be auto-assigned', () => {
  assert.equal(defaultTaskAssignee(null,{uid:'inactive',status:'inactive'},users), '');
  assert.equal(defaultTaskAssignee(null,{uid:'not-listed',status:'active'},users), '');
  assert.equal(defaultTaskAssignee(null,{uid:'creator',status:'active'},[]), '');
  assert.equal(defaultTaskAssignee(null,null,users), '');
});
