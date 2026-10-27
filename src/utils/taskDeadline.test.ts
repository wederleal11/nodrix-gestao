import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validLocalDeadline, validateDeadlineRevision } from './taskDeadline';
import { localDateKey, weekDatesForOffset } from './calendarMonth';

test('local week remains aligned at 22:49 in Sao Paulo (date 30 stays Friday 30)', () => {
  const days = weekDatesForOffset(0, new Date(2026, 9, 26, 22, 49));
  assert.equal(days[0].dateStr, '2026-10-26');
  assert.equal(days[3].dateStr, '2026-10-29');
  assert.equal(days[4].dateStr, '2026-10-30');
  assert.equal(days[4].formatted, '30/10');
  assert.equal(localDateKey(new Date(2026, 9, 26, 23, 55)), '2026-10-26');
});
test('week navigation does not shift the date or cross year incorrectly', () => {
  const days = weekDatesForOffset(1, new Date(2026, 11, 28, 23, 10));
  assert.equal(days[0].dateStr, '2027-01-04');
  assert.equal(days[4].dateStr, '2027-01-08');
});
test('deadline change after initial requires a reason; initial assignment does not', () => {
  assert.equal(validateDeadlineRevision('', '2026-10-30', ''), null);
  assert.match(validateDeadlineRevision('2026-10-30','2026-11-03','') || '', /Explique/);
  assert.equal(validateDeadlineRevision('2026-10-30','2026-11-03','Aguardando liberação'), null);
  assert.match(validateDeadlineRevision('2026-10-30','2026-10-30','Aguardando') || '', /igual/);
});
test('rejects invalid calendar dates without UTC conversion', () => {
  assert.equal(validLocalDeadline('2026-02-29'), false);
  assert.equal(validLocalDeadline('2028-02-29'), true);
  assert.equal(validLocalDeadline('2026-11-31'), false);
  assert.equal(validLocalDeadline('2026-10-30'), true);
});
