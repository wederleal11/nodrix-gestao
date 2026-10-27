import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, monthGrid, monthAtOffset } from './calendarMonth';

test('monthly calendar starts on Monday, includes full month and year transitions', () => {
  const days = monthGrid(new Date(2026, 9, 1, 12));
  assert.equal(localDateKey(days[0]), '2026-09-28');
  assert.equal(localDateKey(days[days.length - 1]), '2026-11-01');
  assert.equal(days.length % 7, 0);
  assert.equal(days[0].getDay(), 1);
  assert.equal(localDateKey(monthAtOffset(1, new Date(2026, 11, 25))), '2027-01-01');
});
test('month grid includes leap day and handles short February correctly', () => {
  const days = monthGrid(new Date(2028, 1, 13));
  assert.ok(days.some(day => localDateKey(day) === '2028-02-29'));
  assert.equal(days.length, 35);
});
test('date keys use local calendar fields, never UTC dates', () => {
  const day = new Date(2026, 9, 27, 23, 30);
  assert.equal(localDateKey(day), '2026-10-27');
});
