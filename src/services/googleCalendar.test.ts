import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapGoogleEvents } from './googleCalendar';

test('Google event is projected into the same calendar without Firestore writes', () => {
  const items=mapGoogleEvents([{id:'g1',summary:'Reunião',start:{date:'2026-10-27'},end:{date:'2026-10-28'}}],'u1');
  assert.equal(items.length,1);
  assert.equal(items[0].source,'google');
  assert.equal(items[0].date,'2026-10-27');
  assert.deepEqual(items[0].assigneeIds,['u1']);
});
test('multi-day events use an exclusive end date', () => {
  const list=mapGoogleEvents([{id:'g2',start:{date:'2026-10-27'},end:{date:'2026-10-30'}}],'u1');
  assert.deepEqual(list.map(e=>e.date),['2026-10-27','2026-10-28','2026-10-29']);
  assert.equal(new Set(list.map(e=>e.id)).size,3);
});
test('cancelled and untrusted Google URLs are ignored safely', () => {
  const list=mapGoogleEvents([
    {id:'cancel',status:'cancelled',start:{date:'2026-10-27'}},
    {id:'busy',start:{date:'2026-10-27'},htmlLink:'javascript:alert(1)'},
  ],'u1');
  assert.equal(list.length,1);
  assert.equal(list[0].title,'Ocupado');
  assert.equal(list[0].googleHtmlLink,undefined);
});
