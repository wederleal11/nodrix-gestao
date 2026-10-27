import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { KanbanColumn } from '../types';
import { getKanbanStatusOptions, getDefaultNewTaskStatus, isConfiguredTaskStatus } from './taskStatusOptions';
const col=(id:string,title:string,order:number):KanbanColumn=>({id,title,order,headerBg:'',borderAccent:''});
test('Backlog stays the default even after reordering',()=>{
  assert.equal(getDefaultNewTaskStatus([col('completed','Concluída',0),col('backlog','Backlog',5)]),'backlog');
});
test('all live custom and completed stages are selectable without old hardcoded stages',()=>{
  const stages=[col('completed','Concluída',3),col('go_live','Go Live',2),col('backlog','Backlog',0)];
  assert.deepEqual(getKanbanStatusOptions(stages).map(c=>c.id),['backlog','go_live','completed']);
  assert.equal(isConfiguredTaskStatus('completed',stages),true);
  assert.equal(isConfiguredTaskStatus('go_live',stages),true);
  assert.equal(isConfiguredTaskStatus('planned',stages),false);
});
test('never invent statuses while loading, skip duplicates and virtual recovery',()=>{
  assert.equal(getDefaultNewTaskStatus([]),null);
  assert.deepEqual(getKanbanStatusOptions([col('__unmapped__','Outros',0),col('x','Etapa',1),col('x','Duplicada',2)]).map(c=>c.id),['x']);
});
