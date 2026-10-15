import test from 'node:test';
import assert from 'node:assert/strict';
import { events } from '../src/data.js';
import { scheduleForView, scheduleFor, scheduleClockKey, nextScheduleChange, calendarFile } from '../src/logic.js';

const at = value => new Date(value).getTime();
const ids = list => list.map(event => event.id);
const full = time => scheduleForView({ now: at(time) });

test('the full schedule retains registration through the gap and advances both 6:30 events together', () => {
  for (const time of ['2026-10-14T12:00:00-05:00', '2026-10-30T16:00:00-05:00', '2026-10-30T17:30:00-05:00', '2026-10-30T18:29:59.999-05:00']) {
    assert.deepEqual(full(time), events);
  }
  assert.deepEqual(ids(full('2026-10-30T18:30:00-05:00')), ids(events.slice(1)));
  assert.deepEqual(ids(full('2026-10-30T21:00:00-05:00')).slice(0, 2), ['practice', 'pro-am']);
});

test('the cutoff follows the next start, including overlaps and overnight gaps', () => {
  assert.deepEqual(ids(full('2026-10-31T08:59:59-05:00')).slice(0, 2), ['practice', 'pro-am']);
  assert.equal(full('2026-10-31T09:00:00-05:00')[0].id, 'close-up');
  assert.equal(full('2026-10-31T11:59:59-05:00')[0].id, 'playtime');
  assert.equal(full('2026-10-31T12:00:00-05:00')[0].id, 'parents');
  assert.ok(!ids(full('2026-10-31T12:00:00-05:00')).includes('playtime'));
});

test('Sunday follows Central Standard Time regardless of the viewer timezone', () => {
  assert.equal(full('2026-11-01T13:59:59Z')[0].id, 'candyland');
  assert.equal(full('2026-11-01T14:00:00Z')[0].id, 'evening-gown');
  assert.equal(full('2026-11-01T15:30:00Z')[0].id, 'special-awards');
  assert.equal(full('2026-11-01T17:30:00Z')[0].id, 'finals');
  assert.deepEqual(ids(full('2026-11-01T19:30:00Z')), ['farewell']);
  assert.deepEqual(ids(full('2026-11-02T12:00:00Z')), ['farewell']);
});

test('daily schedules and personalized schedules retain past events and their calendar entries', () => {
  const now = at('2026-11-02T12:00:00Z');
  for (const day of ['2026-10-30', '2026-10-31', '2026-11-01']) {
    assert.deepEqual(scheduleForView({ day, now }), events.filter(event => event.date === day));
  }
  const contestant = { id: 'only-optionals', name: 'Optional Entrant', division: '10 - 12 years', participation: 'optionals-only', optionals: ['pro-am', 'practice-interview', 'livin-doll'] };
  const personal = scheduleForView({ tab: 'mine', contestants: [contestant], now });
  assert.deepEqual(personal, scheduleFor([contestant]));
  assert.deepEqual(ids(personal), ['practice', 'pro-am', 'livin-doll']);
  assert.match(calendarFile(personal, true, [contestant]), /UID:practice-/);
  assert.deepEqual(ids(scheduleForView({ tab: 'mine', day: '2026-10-30', contestants: [contestant], now })), ['practice', 'pro-am']);
  assert.match(calendarFile(scheduleForView({ day: '2026-10-30', now }), true), /UID:registration-/);
});

test('the clock wakes at exact start/end boundaries and remains stable between them', () => {
  const before = at('2026-10-30T18:29:59.999-05:00');
  const start = at('2026-10-30T18:30:00-05:00');
  assert.equal(nextScheduleChange(before), start);
  assert.notEqual(scheduleClockKey(before), scheduleClockKey(start));
  assert.equal(scheduleClockKey(start), scheduleClockKey(start + 60000));
  assert.equal(nextScheduleChange(start), at('2026-10-30T20:00:00-05:00'));
  assert.equal(nextScheduleChange(at('2026-10-31T21:30:00-05:00')), at('2026-11-01T08:00:00-06:00'));
  assert.equal(nextScheduleChange(at('2026-11-02T12:00:00Z')), null);
});
