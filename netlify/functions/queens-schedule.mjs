import { getStore } from '@netlify/blobs';
import { json, sessionFor, settings } from '../lib/queens-auth.mjs';
import { loadAccess } from '../lib/queens-access.mjs';

export async function serveSchedule(request, loadSchedule, config = settings()) {
  if (request.method !== 'GET') return json({ message: 'Method not allowed.' }, 405, { allow: 'GET' });
  const session = sessionFor(request, config);
  if (!session) return json({ message: 'Please enter the Queens password to view this schedule.' }, 401);
  try {
    const schedule = await loadSchedule();
    if (!schedule || !Array.isArray(schedule.events)) throw new Error('Missing schedule');
    return json({ ...schedule, sessionExpiresAt: session.exp * 1000 });
  } catch {
    return json({ message: 'The Queens schedule is temporarily unavailable. Please try again shortly.' }, 503);
  }
}
export default async request => serveSchedule(request, () => getStore({ name: 'queens-content', consistency: 'strong' }).get('schedule.json', { type: 'json' }), await loadAccess());
export const config = { path: '/api/queens/schedule' };
