import { escapeHTML as escape, timeLabel } from './logic.js';
import { days } from './data.js';

const form = document.querySelector('#queens-login');
const signOut = document.querySelector('#sign-out');
const status = document.querySelector('#queens-status');
const eventsElement = document.querySelector('#queens-events');
let schedule = null;
let activeDay = 'all';
let query = '';
let expirationTimer;
let loading = false;

if (form) {
  const input = document.querySelector('#queens-password');
  const show = document.querySelector('#show-password');
  show.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    show.textContent = visible ? 'Hide' : 'Show';
    show.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    show.setAttribute('aria-pressed', String(visible));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]');
    const error = document.querySelector('#login-error');
    button.disabled = true; button.textContent = 'Opening your schedule…'; error.textContent = '';
    input.removeAttribute('aria-invalid');
    try {
      const response = await fetch('/api/queens/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: input.value }) });
      if (response.status === 429) throw new Error('Too many attempts. Please wait one minute and try again.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to sign in. Please try again.');
      input.value = '';
      location.replace('/queens/');
    } catch (err) {
      error.textContent = err instanceof TypeError ? 'Unable to connect. Please check your connection and try again.' : err.message;
      input.setAttribute('aria-invalid', 'true'); input.focus();
      button.disabled = false; button.textContent = 'Enter Queens section →';
    }
  });
}

const paragraph = value => escape(value).replace(/\n/g, '<br>');
function eventCard(event) {
  const primaryTime = event.report || event.start;
  const range = event.start ? `${timeLabel(event.start)}${event.end ? ' – ' + timeLabel(event.end) : ''}` : '';
  const fields = [['Royalty & assignments', event.royalty], ['Chaperones', event.chaperones], ['Wardrobe', event.wardrobe], ['Details', event.notes], ['Dismissal times', event.dismissal]];
  return `<article class="event-row"><div class="event-time"><strong>${escape(timeLabel(primaryTime)).replace(/ (AM|PM)$/, ' <span>$1</span>')}</strong><small>${event.report ? 'REPORT TIME' : 'EVENT TIME'}</small></div><div class="timeline-mark" aria-hidden="true"><span></span></div><details class="event-card queens-event"><summary><div class="event-main"><div class="event-labels"><span class="tag ${event.report ? 'competition' : 'essential'}">${event.report ? 'REPORT READY' : 'ON THE SCHEDULE'}</span>${event.group ? `<span class="queen-group">${escape(event.group)}</span>` : ''}</div><h3>${escape(event.title)}</h3>${range && event.report ? `<p>Event: ${escape(range)}</p>` : event.end ? `<p>Until ${escape(timeLabel(event.end))}</p>` : ''}${event.wardrobe ? `<p class="queen-wardrobe"><span aria-hidden="true">◇</span> ${paragraph(event.wardrobe)}</p>` : ''}</div><span class="expand-icon" aria-hidden="true">+</span></summary><div class="event-details">${fields.filter(([, value]) => value).map(([label, value]) => `<div class="queen-detail"><h4>${label}</h4><p>${paragraph(value)}</p></div>`).join('')}</div></details></article>`;
}
function render() {
  if (!schedule) return;
  const matched = schedule.events.filter(event => (activeDay === 'all' || event.date === activeDay) && [event.title, event.group, event.royalty, event.chaperones, event.wardrobe, event.notes, event.dismissal].join(' ').toLowerCase().includes(query));
  status.textContent = `${matched.length} ${matched.length === 1 ? 'event' : 'events'}${query ? ' matching your search' : ' for your royal weekend'}`;
  eventsElement.innerHTML = matched.length ? days.map(day => {
    const events = matched.filter(event => event.date === day.date);
    if (!events.length) return '';
    return `<section class="day-section"><div class="day-heading"><div class="date-stamp"><small>${day.month}</small><strong>${day.number}</strong></div><div><span class="day-kicker">${day.label.toUpperCase()} · 2026</span><h2>${escape(day.title)}</h2></div></div><div>${events.map(eventCard).join('')}</div></section>`;
  }).join('') : '<div class="empty-state"><h3>No matching assignments</h3><p>Try another name or event, or select All days.</p><button class="button button-outline" id="clear-queens-filters">Clear filters</button></div>';
  document.querySelector('#clear-queens-filters')?.addEventListener('click', () => {
    query = ''; activeDay = 'all'; document.querySelector('#queens-search').value = ''; updateDayButtons(); render();
  });
}
function updateDayButtons() {
  document.querySelectorAll('[data-day]').forEach(button => {
    const selected = button.dataset.day === activeDay;
    button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected));
  });
}
function lock() {
  schedule = null; eventsElement?.replaceChildren(); clearTimeout(expirationTimer);
  location.replace('/queens/');
}
async function loadSchedule() {
  if (loading) return;
  loading = true;
  const refresh = document.querySelector('#refresh-queens');
  refresh.disabled = true;
  status.textContent = 'Loading your royal weekend…';
  try {
    const response = await fetch('/api/queens/schedule', { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401) { lock(); return; }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load the schedule. Please try again.');
    schedule = result;
    clearTimeout(expirationTimer);
    expirationTimer = setTimeout(lock, Math.max(0, result.sessionExpiresAt - Date.now()));
    render(); document.querySelector('#print-queens').disabled = false;
  } catch (err) {
    schedule = null; eventsElement.replaceChildren(); document.querySelector('#print-queens').disabled = true;
    status.textContent = err instanceof TypeError ? 'Unable to connect. Check your connection and select Refresh.' : err.message;
  } finally { loading = false; refresh.disabled = false; }
}
if (signOut) {
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    schedule = null; eventsElement.replaceChildren();
    try {
      const response = await fetch('/api/queens/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Unable to sign out. Please try again.');
      lock();
    } catch { status.textContent = 'Unable to sign out. Check your connection and try again.'; signOut.disabled = false; }
  });
  document.querySelector('#queens-days').addEventListener('click', event => {
    const button = event.target.closest('[data-day]');
    if (!button) return;
    activeDay = button.dataset.day; updateDayButtons(); render();
  });
  document.querySelector('#queens-search').addEventListener('input', event => { query = event.target.value.trim().toLowerCase(); render(); });
  document.querySelector('#refresh-queens').addEventListener('click', loadSchedule);
  document.querySelector('#print-queens').addEventListener('click', () => window.print());
  // Private schedule data lives only in memory; recheck access when returning to the page.
  window.addEventListener('pagehide', () => { schedule = null; eventsElement.replaceChildren(); });
  window.addEventListener('pageshow', event => { if (event.persisted) loadSchedule(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadSchedule(); });
  loadSchedule();
}
