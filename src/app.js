import { competition, days, divisions, events, optionalCategories } from './data.js';
import { STORE_KEY, escapeHTML as h, matchesContestant, scheduleFor, timeLabel, parseSaved, calendarFile, eventInstant } from './logic.js';
const $ = selector => document.querySelector(selector);
let saved;
try { saved = parseSaved(localStorage.getItem(STORE_KEY)); } catch { saved = parseSaved(null); }
const initialTab = ['mine', 'contestants'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'schedule';
const state = { ...saved, roster: [], rosterState: 'loading', syncedAt: null, tab: initialTab, day: 'all', category: 'all', search: '', division: 'all', person: 'all', onlyWatched: false };
let toastTimer;
const icons = {
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m4 4h4"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>'
};
const labels = { essential: 'Weekend essential', competition: 'Required competition', optional: 'Optional event', celebration: 'Celebration' };
function allContestants() { return [...state.roster, ...state.personal].sort((a, b) => a.name.localeCompare(b.name)); }
function watched() { return allContestants().filter(c => state.watched.includes(c.id)); }
function selected() { return watched().filter(c => state.person === 'all' || c.id === state.person); }
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ watched: state.watched, personal: state.personal })); } catch { notify('Your selection works now, but this browser cannot save it for next time.'); } }
function initials(name) { return name.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
function avatar(c, size = '') { return `<span class="avatar ${size}" aria-hidden="true">${h(initials(c.name))}</span>`; }
function switchTab(tab) { state.tab = tab; state.search = ''; state.category = 'all'; render(); }
function filteredEvents() {
  const list = state.tab === 'mine' ? scheduleFor(selected()) : events;
  return list.filter(e => (state.day === 'all' || e.date === state.day) && (state.category === 'all' || e.category === state.category) && (!state.search || `${e.title} ${e.details}`.toLowerCase().includes(state.search.toLowerCase())));
}
function eventCard(event) {
  const people = (state.tab === 'mine' ? selected() : watched()).filter(c => matchesContestant(event, c));
  const needsEntries = people.some(c => !Array.isArray(c.optionals)) && event.audience !== 'all';
  const isNow = Date.now() >= eventInstant(event) && event.end && Date.now() < eventInstant(event, 'end');
  return `<article class="event-row ${event.id === 'candyland' ? 'candy-event' : ''}"><div class="event-time"><strong>${timeLabel(event.start).replace(' ', '<span>') + '</span>'}</strong>${event.end ? `<small>– ${timeLabel(event.end)}</small>` : ''}</div><div class="timeline-mark" aria-hidden="true"><span></span></div><details class="event-card"><summary><div class="event-main"><div class="event-labels"><span class="tag ${event.category}">${labels[event.category]}</span>${isNow ? '<span class="live-label">Happening now</span>' : ''}</div><h3>${h(event.title)}${event.id === 'candyland' ? '<span class="event-sparkle" aria-hidden="true"> ✦</span>' : ''}</h3><p>${h(event.subtitle)}</p>${'checkin' in event ? `<div class="check-in">${icons.calendar} Check-in: ${event.checkin ? timeLabel(event.checkin) : '<span>To be announced</span>'}</div>` : ''}${needsEntries ? '<div class="entry-note">Optional entries need confirmation</div>' : ''}${people.length ? `<div class="event-people">${people.map(c => `<span>${avatar(c, 'mini')}${h(c.name)}</span>`).join('')}</div>` : ''}</div><span class="expand-icon" aria-hidden="true">+</span></summary><div class="event-details"><p>${h(event.details)}</p>${event.attire ? `<p><b>What to wear</b><br>${h(event.attire)}</p>` : ''}${event.bring ? `<p><b>What to bring</b><br>${h(event.bring)}</p>` : ''}<p class="location-line">${icons.pin} ${h(competition.venue)}</p>${event.timeNeedsConfirmation && !competition.timesConfirmed ? '<p>Time awaiting organizer confirmation.</p>' : ''}</div></details></article>`;
}
function dayControls() {
  return `<div class="day-buttons" role="group" aria-label="Filter by day"><button data-day="all" class="${state.day === 'all' ? 'active' : ''}" aria-pressed="${state.day === 'all'}">All weekend</button>${days.map(d => `<button data-day="${d.date}" class="${state.day === d.date ? 'active' : ''}" aria-pressed="${state.day === d.date}">${d.short}<span>${d.month === 'OCT' ? 'Oct' : 'Nov'} ${Number(d.number)}</span></button>`).join('')}</div>`;
}
function sidebar() {
  const list = watched();
  return `<aside class="sidebar"><section class="watch-card"><div class="aside-title"><span class="icon-tile">${icons.heart}</span><h2>Your cheering section</h2></div><p>Follow your favorites.<br>We’ll keep their moments together.</p>${list.length ? `<div class="watch-list">${list.map(c => `<button data-person="${h(c.id)}">${avatar(c)}<span><strong>${h(c.name)}</strong><small>${h(c.division)}</small></span><span class="watch-heart" aria-hidden="true">♥</span></button>`).join('')}</div><button class="button primary full-width" data-go="mine">See my schedule ${icons.arrow}</button><button class="text-button full-width" data-go="contestants">Manage contestants</button>` : `<div class="empty-hearts" aria-hidden="true">♡ <span>♡</span> ♡</div><button class="button primary full-width" data-go="contestants">Find contestants ${icons.arrow}</button><small class="device-note">Your watch list is saved on this device.</small>`}</section><section class="good-to-know"><span class="eyebrow">A LITTLE REMINDER</span><h2>Ready, set, sparkle.</h2><ul><li><span>01</span><p><b>Keep your badge handy</b>A chaperone or guest badge is required to enter the staging area.</p></li><li><span>02</span><p><b>Check in on time</b>Division check-in times will be announced. Lateness counts against you.</p></li><li><span>03</span><p><b>Make room for memories</b>Stay after crowning for photos. The top four are required to stay.</p></li></ul></section><div class="venue-note">${icons.pin}<div><b>One magical weekend.<br>One lovely location.</b><p>All events at Texas A&M Hotel<br>and Convention Center.</p></div></div></aside>`;
}
function renderSchedule() {
  const mine = state.tab === 'mine';
  return `<div class="section-heading"><div><span class="eyebrow">${mine ? 'SAVED JUST FOR YOU' : 'YOUR WEEKEND, AT A GLANCE'}</span><h2>${mine ? 'My schedule' : 'Every moment matters.'}</h2><p>${mine ? 'The essentials, celebrations, and entered optionals for your watched contestants.' : 'From the first hello to the final crown. Find your next special moment.'}</p></div><div class="heading-actions"><button class="button button-quiet" id="print">Print ${icons.download}</button><button class="button button-outline" id="calendar" ${mine && !selected().length ? 'disabled' : ''}>Add to calendar ${icons.calendar}</button></div></div>${mine ? `<div class="personal-bar"><div class="person-pills"><button data-person="all" class="${state.person === 'all' ? 'active' : ''}">Everyone I’m watching <span>${watched().length}</span></button>${watched().map(c => `<button data-person="${h(c.id)}" class="${state.person === c.id ? 'active' : ''}">${avatar(c, 'mini')}${h(c.name)}</button>`).join('')}</div><button class="text-button" data-go="contestants">+ Manage contestants</button></div>` : ''}<div class="schedule-layout"><section class="schedule-column" aria-label="Events"><div class="schedule-tools">${dayControls()}<div class="search-row"><label class="search-box">${icons.search}<input id="event-search" type="search" placeholder="Find an event…" aria-label="Find an event" value="${h(state.search)}"></label><select id="event-category" aria-label="Filter event type"><option value="all">All event types</option>${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${state.category === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></div><div id="event-results">${eventResults()}</div></section>${sidebar()}</div>`;
}
function eventResults() {
  if (state.tab === 'mine' && !watched().length) return `<div class="empty-state"><span class="empty-icon">${icons.heart}</span><h3>Your weekend, made personal.</h3><p>Choose the contestants you’re cheering for to see their events here.</p><button class="button primary" data-go="contestants">Find contestants ${icons.arrow}</button></div>`;
  const list = filteredEvents();
  if (!list.length) return `<div class="empty-state"><span class="empty-icon">${icons.search}</span><h3>No events in this view</h3><p>Try a different day or clear your filters.</p><button class="button button-outline" id="reset-filters">Show all events</button></div>`;
  return `<p class="result-count" aria-live="polite">${list.length} event${list.length === 1 ? '' : 's'}${state.tab === 'mine' ? ` for ${selected().length === 1 ? h(selected()[0].name) : 'your cheering section'}` : ' across the weekend'} <span>Tap an event for the details</span></p>${days.map((d, i) => {
    const todayEvents = list.filter(e => e.date === d.date);
    return todayEvents.length ? `<section class="day-section"><div class="day-heading"><span class="date-stamp"><small>${d.month}</small><strong>${d.number}</strong></span><div><span class="day-kicker">DAY ${String(i + 1).padStart(2, '0')} · ${d.label.toUpperCase()}</span><h2>${d.title}</h2><p>${d.subtitle}</p></div></div><div class="event-list">${todayEvents.map(eventCard).join('')}</div></section>` : '';
  }).join('')}`;
}
function rosterResults() {
  const list = allContestants().filter(c => c.name.toLowerCase().includes(state.search.toLowerCase()) && (state.division === 'all' || c.division === state.division) && (!state.onlyWatched || state.watched.includes(c.id)));
  if (!list.length) return `<div class="empty-state"><span class="empty-icon">${icons.heart}</span><h3>${state.rosterState === 'loading' ? 'Finding your cheering section…' : state.roster.length ? 'No contestants found' : 'Make a schedule your own'}</h3><p>${state.roster.length ? 'Try another name or age division.' : 'The official roster is being connected. You can create a personal contestant now and choose their entered optionals.'}</p>${!state.roster.length ? '<button class="button primary" data-add>Add a personal contestant +</button>' : '<button class="button button-outline" id="reset-roster">Clear filters</button>'}</div>`;
  return `<p class="result-count" aria-live="polite">${list.length} contestant${list.length !== 1 ? 's' : ''} <span>Check a contestant to watch</span></p><div class="contestant-grid">${list.map(c => {
    const checked = state.watched.includes(c.id);
    return `<article class="contestant-card ${checked ? 'is-watched' : ''}"><label class="contestant-choice">${avatar(c)}<span class="contestant-info"><strong>${h(c.name)}</strong><small>${h(c.division)}</small></span><input type="checkbox" data-watch="${h(c.id)}" ${checked ? 'checked' : ''} aria-label="Watch ${h(c.name)}"><span class="custom-check" aria-hidden="true">${checked ? '✓' : '+'}</span></label><div class="contestant-foot"><span>${c.id.startsWith('personal-') ? 'Personal profile · this device' : 'Official roster'}</span>${checked ? `<button class="text-button" data-person="${h(c.id)}">Schedule ↗</button>` : '<span class="watch-prompt">Add to watch list</span>'}</div>${c.id.startsWith('personal-') ? `<div class="profile-actions"><button class="text-button" data-edit="${h(c.id)}">Edit optionals</button><button class="text-button" data-remove="${h(c.id)}">Remove profile</button></div>` : ''}</article>`;
  }).join('')}</div>`;
}
function renderContestants() {
  return `<div class="section-heading"><div><span class="eyebrow">BIG MOMENTS. YOUR FAVORITE PEOPLE.</span><h2>Meet your cheering section.</h2><p>Check a contestant to watch. Their personal schedule will be ready in My schedule.</p></div><button class="button button-outline" data-add>Add personal contestant +</button></div><div class="roster-notice">${state.rosterState === 'live' ? `<span class="status-dot"></span> Official roster connected · Refreshed ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: competition.timezone }).format(new Date(state.syncedAt))} Central` : state.rosterState === 'saved' ? 'Showing the last published roster. Live updates are temporarily unavailable.' : state.rosterState === 'loading' ? 'Loading official contestants…' : 'Official roster connection pending. Personal profiles are available now.'}<button class="text-button" id="refresh-roster">Refresh</button></div><div class="roster-tools"><label class="search-box">${icons.search}<input id="roster-search" type="search" placeholder="Search contestant names…" aria-label="Search contestant names" value="${h(state.search)}"></label><select id="division-filter" aria-label="Filter age division"><option value="all">All age divisions</option>${divisions.map(d => `<option ${d === state.division ? 'selected' : ''}>${h(d)}</option>`).join('')}</select><label class="watch-filter"><input type="checkbox" id="only-watched" ${state.onlyWatched ? 'checked' : ''}> Watching only</label></div><div id="roster-results">${rosterResults()}</div><p class="privacy-note">${icons.heart} Watch selections and personal profiles stay in this browser. No account needed.</p>`;
}
function render() {
  if (state.person !== 'all' && !watched().some(c => c.id === state.person)) state.person = 'all';
  document.querySelectorAll('[data-tab]').forEach(b => { b.setAttribute('aria-current', b.dataset.tab === state.tab ? 'page' : 'false'); });
  $('#watch-count').textContent = watched().length;
  $('#content').innerHTML = state.tab === 'contestants' ? renderContestants() : renderSchedule();
}
function openProfile(id) {
  const c = state.personal.find(p => p.id === id);
  const form = $('#profile-form'); form.reset(); form.dataset.editId = c?.id || '';
  $('#profile-title').textContent = c ? 'Edit personal contestant' : 'Add a personal contestant';
  $('#profile-division').innerHTML = divisions.map(d => `<option>${h(d)}</option>`).join('');
  $('#optional-inputs').innerHTML = optionalCategories.map(([key, label]) => `<label class="optional-choice"><input type="checkbox" name="optionals" value="${key}" ${c?.optionals.includes(key) ? 'checked' : ''}>${h(label)}</label>`).join('');
  if (c) { form.elements.name.value = c.name; form.elements.division.value = c.division; }
  $('#profile-dialog').showModal();
}
$('#profile-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const name = String(data.get('name')).trim();
  if (!name) { form.elements.name.setCustomValidity('Please enter a contestant name.'); form.elements.name.reportValidity(); return; }
  const contestant = { id: form.dataset.editId || `personal-${crypto.randomUUID()}`, name, division: String(data.get('division')), optionals: data.getAll('optionals') };
  state.personal = [...state.personal.filter(c => c.id !== contestant.id), contestant];
  if (!state.watched.includes(contestant.id)) state.watched.push(contestant.id);
  save(); $('#profile-dialog').close(); state.person = contestant.id; switchTab('mine'); notify(`${name}’s schedule is ready.`);
});
$('#profile-form').elements.name.addEventListener('input', event => event.target.setCustomValidity(''));
$('#close-dialog').addEventListener('click', () => $('#profile-dialog').close());
document.addEventListener('click', async event => {
  const b = event.target.closest('button'); if (!b) return;
  if (b.dataset.tab) switchTab(b.dataset.tab);
  if (b.dataset.go) switchTab(b.dataset.go);
  if (b.dataset.day) { state.day = b.dataset.day; render(); }
  if (b.dataset.person) { state.person = b.dataset.person; switchTab('mine'); }
  if (b.hasAttribute('data-add')) openProfile();
  if (b.dataset.edit) openProfile(b.dataset.edit);
  if (b.dataset.remove) { state.personal = state.personal.filter(c => c.id !== b.dataset.remove); state.watched = state.watched.filter(id => id !== b.dataset.remove); save(); render(); notify('Personal profile removed from this device.'); }
  if (b.id === 'reset-filters') { state.day = 'all'; state.category = 'all'; state.search = ''; render(); }
  if (b.id === 'reset-roster') { state.division = 'all'; state.search = ''; state.onlyWatched = false; render(); }
  if (b.id === 'refresh-roster') { b.disabled = true; b.textContent = 'Refreshing…'; await loadRoster(); render(); }
  if (b.id === 'print') window.print();
  if (b.id === 'calendar') {
    const blob = new Blob([calendarFile(filteredEvents(), competition.timesConfirmed)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'texas-olm-2026-schedule.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Calendar downloaded. Revisit the live schedule for updates.');
  }
  if (b.id === 'share-site') {
    try { if (navigator.share) await navigator.share({ title: 'Texas OLM 2026 · Your competition weekend', url: location.origin }); else { await navigator.clipboard.writeText(location.origin); notify('Weekend link copied!'); } } catch (error) { if (error.name !== 'AbortError') notify('Share this page’s address with your cheering section.'); }
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'event-search') { state.search = event.target.value; $('#event-results').innerHTML = eventResults(); }
  if (event.target.id === 'roster-search') { state.search = event.target.value; $('#roster-results').innerHTML = rosterResults(); }
});
document.addEventListener('change', event => {
  const el = event.target;
  if (el.dataset.watch) { const id = el.dataset.watch; state.watched = el.checked ? [...new Set([...state.watched, id])] : state.watched.filter(v => v !== id); save(); $('#watch-count').textContent = watched().length; $('#roster-results').innerHTML = rosterResults(); const focusTarget = [...document.querySelectorAll('[data-watch]')].find(input => input.dataset.watch === id); focusTarget?.focus(); notify(el.checked ? 'Added to My schedule.' : 'Removed from My schedule.'); }
  if (el.id === 'event-category') { state.category = el.value; $('#event-results').innerHTML = eventResults(); }
  if (el.id === 'division-filter') { state.division = el.value; $('#roster-results').innerHTML = rosterResults(); }
  if (el.id === 'only-watched') { state.onlyWatched = el.checked; $('#roster-results').innerHTML = rosterResults(); }
});
function safeRoster(payload) {
  if (!Array.isArray(payload?.contestants)) throw new Error('Invalid roster');
  return payload.contestants.filter(c => typeof c.id === 'string' && !c.id.startsWith('personal-') && typeof c.name === 'string' && typeof c.division === 'string').map(c => ({ id: c.id, name: c.name.slice(0, 100), division: c.division.slice(0, 80), optionals: Array.isArray(c.optionals) ? c.optionals.filter(x => optionalCategories.some(([key]) => x === key)) : null }));
}
async function loadRoster() {
  try {
    const response = await fetch('/api/roster', { signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error('Roster unavailable');
    const data = await response.json(); state.roster = safeRoster(data); state.rosterState = 'live'; state.syncedAt = data.updatedAt || new Date().toISOString();
  } catch {
    try { const response = await fetch('/data/roster.json'); const data = await response.json(); const fallback = safeRoster(data); if (fallback.length || !state.roster.length) { state.roster = fallback; state.syncedAt = data.updatedAt; } state.rosterState = state.roster.length ? 'saved' : 'unavailable'; } catch { state.rosterState = state.roster.length ? 'saved' : 'unavailable'; }
  }
}
window.addEventListener('storage', event => { if (event.key === STORE_KEY) { Object.assign(state, parseSaved(event.newValue)); render(); } });
render();
loadRoster().then(render);
// Refresh the roster when a family returns to the app, and every five minutes while open.
let lastRefresh = Date.now();
async function refreshIfNeeded() { if (!document.hidden && Date.now() - lastRefresh >= 5 * 60 * 1000) { lastRefresh = Date.now(); await loadRoster(); if (!$('#profile-dialog').open) render(); } }
setInterval(refreshIfNeeded, 60 * 1000); document.addEventListener('visibilitychange', refreshIfNeeded);
