import { events } from './data.js';
import { optionalStatus, sanitizeOptionalFields } from './optionals.js';
import { winnersCircleNote } from './participation.js';
export const STORE_KEY = 'txolm-schedule-v1';
export const contestantName = contestant => `${contestant.name}${contestant.participation === 'optionals-only' ? '*' : ''}`;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function matchesContestant(event, contestant) {
  if (event.divisions?.length && !event.divisions.includes(contestant.division)) return false;
  if (event.contestantIds?.length && !event.contestantIds.includes(contestant.id)) return false;
  if (contestant.participation === 'optionals-only') return event.audience === 'optional' && optionalStatus(event, contestant) === 'entered';
  // Unconfirmed categories stay visible; known non-entries are excluded.
  return optionalStatus(event, contestant) !== 'not-entered';
}
export const scheduleFor = contestants => events.filter(event => contestants.some(c => matchesContestant(event, c)));
// Overview schedules hide ended events; explicit day and personal views remain complete.
export function eventEndInstant(event, list = events) {
  if (event.end) return eventInstant(event, 'end').getTime();
  const start = eventInstant(event).getTime();
  const next = list.flatMap(item => [eventInstant(item).getTime(), ...(item.report ? [eventInstant(item, 'report').getTime()] : [])]).filter(time => time > start);
  // Untimed endings (reports, inspections, farewell) last until the next assignment,
  // but never linger into the following competition day.
  const nextDate = new Date(`${event.date}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const midnight = eventInstant({ date: nextDate.toISOString().slice(0, 10), start: '00:00' }).getTime();
  return Math.min(midnight, ...next);
}
export function remainingEvents(list, now = Date.now()) {
  return list.filter(event => now < eventEndInstant(event, list));
}
export function scheduleForView({ tab = 'schedule', day = 'all', contestants = [], now = Date.now() } = {}) {
  let list = tab === 'mine' ? scheduleFor(contestants) : events;
  if (tab === 'schedule' && day === 'all') list = remainingEvents(list, now);
  return list.filter(event => day === 'all' || event.date === day);
}
export function scheduleClockKey(now = Date.now(), list = events) {
  return list.map(event => now >= eventEndInstant(event, list) ? 'ended' : now < eventInstant(event) ? 'upcoming' : 'started').join(',');
}
export function nextScheduleChange(now = Date.now(), list = events) {
  const future = list.flatMap(event => [eventInstant(event).getTime(), eventEndInstant(event, list)]).filter(time => time > now);
  return future.length ? Math.min(...future) : null;
}
export function timeLabel(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}
export function parseSaved(raw) {
  try {
    const value = JSON.parse(raw);
    return {
      watched: Array.isArray(value?.watched) ? value.watched.filter(x => typeof x === 'string').slice(0, 200) : [],
      personal: Array.isArray(value?.personal) ? value.personal.filter(x => typeof x.id === 'string' && x.id.startsWith('personal-') && typeof x.name === 'string' && typeof x.division === 'string' && Array.isArray(x.optionals)).slice(0, 100).map(c => ({ id: c.id, name: c.name, division: c.division, ...sanitizeOptionalFields(c) })) : []
    };
  } catch { return { watched: [], personal: [] }; }
}
export function eventInstant(event, field = 'start') {
  // The competition crosses the 2026 daylight-saving transition. Sunday is CST.
  return new Date(`${event.date}T${event[field] || event.start || event.report}:00${event.date >= '2026-11-01' ? '-06:00' : '-05:00'}`);
}
export function calendarFile(selectedEvents, confirmed, contestants = []) {
  const escape = text => String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
  const fold = line => { const pieces = []; let part = ''; for (const char of line) { if (new TextEncoder().encode(part + char).length > 73) { pieces.push(part); part = ' '; } part += char; } pieces.push(part); return pieces.join('\r\n'); };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Texas OLM//2026 Schedule//EN', 'CALSCALE:GREGORIAN'];
  for (const event of selectedEvents.filter(e => confirmed || !e.timeNeedsConfirmation)) {
    const end = event.end ? eventInstant(event, 'end') : new Date(eventInstant(event).getTime() + 15 * 60000);
    const pending = contestants.filter(c => matchesContestant(event, c) && optionalStatus(event, c) === 'unknown');
    const entryNote = pending.length ? `\nEntry not confirmed: ${pending.map(c => c.name).join(', ')}. Check the live schedule for updates.` : '';
    const practiceNote = contestants.filter(c => c.participation === 'winners-circle' && matchesContestant(event, c)).map(c => `\n${c.name} · Winners Circle: ${winnersCircleNote}`).join('');
    lines.push('BEGIN:VEVENT', `UID:${event.id}-2026@texasolm.schedule`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(eventInstant(event))}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(event.title)}`, 'LOCATION:Texas A&M Hotel and Convention Center', `DESCRIPTION:${escape(event.details + ('checkin' in event ? '\nCheck-in: ' + (event.checkin ? timeLabel(event.checkin) : 'Time to be announced. Check the live schedule.') : '') + entryNote + practiceNote)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
