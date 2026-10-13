import { events } from './data.js';
export const STORE_KEY = 'txolm-schedule-v1';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function matchesContestant(event, contestant) {
  if (event.divisions?.length && !event.divisions.includes(contestant.division)) return false;
  if (event.contestantIds?.length && !event.contestantIds.includes(contestant.id)) return false;
  if (event.audience === 'all') return true;
  // Unknown entries stay visible and explicitly marked for confirmation.
  if (!Array.isArray(contestant.optionals)) return true;
  if (event.audience === 'any-optional') return contestant.optionals.length > 0;
  return event.optional?.some(key => contestant.optionals.includes(key)) ?? false;
}
export const scheduleFor = contestants => events.filter(event => contestants.some(c => matchesContestant(event, c)));
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
      personal: Array.isArray(value?.personal) ? value.personal.filter(x => typeof x.id === 'string' && x.id.startsWith('personal-') && typeof x.name === 'string' && typeof x.division === 'string' && Array.isArray(x.optionals)).slice(0, 100) : []
    };
  } catch { return { watched: [], personal: [] }; }
}
export function eventInstant(event, field = 'start') {
  // The competition crosses the 2026 daylight-saving transition. Sunday is CST.
  return new Date(`${event.date}T${event[field] || event.start}:00${event.date >= '2026-11-01' ? '-06:00' : '-05:00'}`);
}
export function calendarFile(selectedEvents, confirmed) {
  const escape = text => String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
  const fold = line => { const pieces = []; let part = ''; for (const char of line) { if (new TextEncoder().encode(part + char).length > 73) { pieces.push(part); part = ' '; } part += char; } pieces.push(part); return pieces.join('\r\n'); };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Texas OLM//2026 Schedule//EN', 'CALSCALE:GREGORIAN'];
  for (const event of selectedEvents.filter(e => confirmed || !e.timeNeedsConfirmation)) {
    const end = event.end ? eventInstant(event, 'end') : new Date(eventInstant(event).getTime() + 15 * 60000);
    lines.push('BEGIN:VEVENT', `UID:${event.id}-2026@texasolm.schedule`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(eventInstant(event))}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(event.title)}`, 'LOCATION:Texas A&M Hotel and Convention Center', `DESCRIPTION:${escape(event.details + ('checkin' in event ? '\nCheck-in: ' + (event.checkin ? timeLabel(event.checkin) : 'Time to be announced. Check the live schedule.') : ''))}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
