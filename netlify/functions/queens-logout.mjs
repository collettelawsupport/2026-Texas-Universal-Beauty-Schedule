import { json, sameOrigin, sessionCookie } from '../lib/queens-auth.mjs';
export default async function handler(request) {
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405, { allow: 'POST' });
  if (!sameOrigin(request)) return json({ message: 'Please sign out from the Queens page.' }, 403);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('') });
}
export const config = { path: '/api/queens/logout' };
