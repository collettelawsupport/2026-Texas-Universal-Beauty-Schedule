import test from 'node:test';
import assert from 'node:assert/strict';
import { events } from '../src/data.js';
import { scheduleForView, scheduleFor, scheduleClockKey, nextScheduleChange, calendarFile, remainingEvents } from '../src/logic.js';

const at = value => new Date(value).getTime();
const ids = list => list.map(event => event.id);
const full = time => scheduleForView({ now: at(time) });

test('overview events disappear at their own end, including gaps and overlaps', () => {
  for (const time of ['2026-10-14T12:00:00-05:00', '2026-10-30T16:00:00-05:00', '2026-10-30T17:29:59.999-05:00']) {
    assert.deepEqual(full(time), events);
  }
  assert.deepEqual(ids(full('2026-10-30T17:30:00-05:00')), ids(events.slice(1)));
  assert.deepEqual(ids(full('2026-10-30T20:00:00-05:00')).slice(0, 2), ['pro-am', 'close-up']);
  assert.equal(full('2026-10-30T22:00:00-05:00')[0].id, 'close-up');
  assert.equal(full('2026-10-31T09:03:00-05:00')[0].id, 'close-up');
  assert.ok(full('2026-10-31T09:03:00-05:00').every(e => e.date !== '2026-10-30'));
  assert.equal(full('2026-10-31T11:00:00-05:00')[0].id, 'playtime');
  assert.deepEqual(ids(full('2026-10-31T12:00:00-05:00')).slice(0, 2), ['playtime', 'parents']);
  assert.equal(full('2026-10-31T12:30:00-05:00')[0].id, 'sportswear');
});

test('Sunday ending boundaries use Central Standard Time, including the last event', () => {
  assert.equal(full('2026-11-01T13:59:59Z')[0].id, 'evening-gown');
  assert.equal(full('2026-11-01T14:59:59Z')[0].id, 'evening-gown');
  assert.equal(full('2026-11-01T15:00:00Z')[0].id, 'special-awards');
  assert.equal(full('2026-11-01T16:30:00Z')[0].id, 'finals');
  assert.deepEqual(ids(full('2026-11-01T19:30:00Z')), ['farewell']);
  assert.deepEqual(full('2026-11-02T06:00:00Z'), []);
});

test('Queens reports without end times expire at the next assignment; Saturday 9:03 contains no Friday events', () => {
  const queens = [
    { id: 'friday', date: '2026-10-30', start: '18:30', end: '22:00' },
    { id: 'report', date: '2026-10-31', report: '08:15' },
    { id: 'inspection', date: '2026-10-31', start: '08:30' },
    { id: 'close-up', date: '2026-10-31', report: '08:45', start: '09:00', end: '10:30' },
    { id: 'playtime', date: '2026-10-31', report: '11:15', start: '11:30', end: '12:30' },
    { id: 'photo', date: '2026-11-01', start: '13:45' }
  ];
  assert.equal(remainingEvents(queens, at('2026-10-31T08:29:59-05:00'))[0].id, 'report');
  assert.equal(remainingEvents(queens, at('2026-10-31T08:30:00-05:00'))[0].id, 'inspection');
  assert.equal(remainingEvents(queens, at('2026-10-31T08:45:00-05:00'))[0].id, 'close-up');
  assert.deepEqual(ids(remainingEvents(queens, at('2026-10-31T09:03:00-05:00'))), ['close-up', 'playtime', 'photo']);
  assert.equal(remainingEvents(queens, at('2026-10-31T10:30:00-05:00'))[0].id, 'playtime');
  assert.equal(nextScheduleChange(at('2026-10-31T08:30:00-05:00'), queens), at('2026-10-31T08:45:00-05:00'));
  assert.deepEqual(remainingEvents(queens, at('2026-11-02T00:00:00-06:00')), []);
  assert.equal(queens.length, 6, 'Filtering must not remove data from the full daily schedule');
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

test('a simultaneous inspection and report roll into the event start, without hiding the event', () => {
  const list = [
    { id: 'inspection', date: '2026-11-01', start: '07:45' },
    { id: 'gown', date: '2026-11-01', report: '07:45', start: '08:00', end: '09:00' }
  ];
  assert.deepEqual(ids(remainingEvents(list, at('2026-11-01T08:00:00-06:00'))), ['gown']);
});
