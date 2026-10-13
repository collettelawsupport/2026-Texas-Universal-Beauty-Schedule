import { getStore } from '@netlify/blobs';
import { json, sessionFor } from '../lib/queens-auth.mjs';

export async function serveSchedule(request, loadSchedule) {
  if (request.method !== 'GET') return json({ message: 'Method not allowed.' }, 405, { allow: 'GET' });
  const session = sessionFor(request);
  if (!session) return json({ message: 'Please enter the Queens password to view this schedule.' }, 401);
  try {
    const schedule = await loadSchedule();
    if (!schedule || !Array.isArray(schedule.events)) throw new Error('Missing schedule');
    return json({ ...schedule, sessionExpiresAt: session.exp * 1000 });
  } catch {
    return json({ message: 'The Queens schedule is temporarily unavailable. Please try again shortly.' }, 503);
  }
}
export default request => serveSchedule(request, () => getStore({ name: 'queens-content', consistency: 'strong' }).get('schedule.json', { type: 'json' }));
export const config = { path: '/api/queens/schedule' };
