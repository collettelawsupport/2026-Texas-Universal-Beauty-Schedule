import { configured, createSession, json, readLoginBody, sameOrigin, sessionCookie, settings, verifyPassword } from '../lib/queens-auth.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405, { allow: 'POST' });
  if (!sameOrigin(request)) return json({ message: 'Please sign in from the Queens page.' }, 403);
  const config = settings();
  if (!configured(config)) return json({ message: 'Queens access is being prepared. Please try again shortly.' }, 503);
  let body;
  try { body = await readLoginBody(request); } catch { return json({ message: 'Please enter the Queens password.' }, 400); }
  if (!await verifyPassword(body?.password, config.passwordHash)) return json({ message: 'That password doesn’t match. Please try again.' }, 401);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(createSession(config)) });
}
export const config = { path: '/api/queens/login', rateLimit: { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 10 } };
