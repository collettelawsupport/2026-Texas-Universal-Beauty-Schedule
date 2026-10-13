import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_NAME, SESSION_SECONDS, createSession, hashPassword, sessionFor, verifyPassword } from '../netlify/lib/queens-auth.mjs';
import login from '../netlify/functions/queens-login.mjs';
import logout from '../netlify/functions/queens-logout.mjs';
import page from '../netlify/functions/queens-page.mjs';
import { serveSchedule } from '../netlify/functions/queens-schedule.mjs';

const origin = 'https://schedule.example';
const password = 'Only a synthetic test password';
let config;
const previous = { passwordHash: process.env.QUEENS_PASSWORD_HASH, secret: process.env.QUEENS_SESSION_SECRET };
before(async () => {
  config = { passwordHash: await hashPassword(password), secret: 'synthetic-test-secret-'.repeat(4) };
  process.env.QUEENS_PASSWORD_HASH = config.passwordHash;
  process.env.QUEENS_SESSION_SECRET = config.secret;
});
after(() => {
  for (const [name, value] of [['QUEENS_PASSWORD_HASH', previous.passwordHash], ['QUEENS_SESSION_SECRET', previous.secret]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});
const request = (path, { token, ...options } = {}) => new Request(origin + path, { ...options, headers: { ...(token ? { cookie: `${COOKIE_NAME}=${token}` } : {}), ...options.headers } });
const post = (path, body, headers = {}) => request(path, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('password verification requires the correct password and a valid hash', async () => {
  assert.equal(await verifyPassword(password, config.passwordHash), true);
  for (const candidate of ['', null, 17, password.toUpperCase(), 'x'.repeat(257)]) assert.equal(await verifyPassword(candidate, config.passwordHash), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
  assert.notEqual(await hashPassword(password), config.passwordHash, 'a fresh salt is used');
});
test('signed sessions expire, reject tampering, and invalidate after password rotation', () => {
  const now = Date.now();
  const token = createSession(config, now);
  const signed = request('/queens/', { token });
  assert.ok(sessionFor(signed, config, now));
  assert.equal(sessionFor(signed, config, now + SESSION_SECONDS * 1000), null);
  assert.equal(sessionFor(signed, { ...config, passwordHash: config.passwordHash.replace(/.$/, config.passwordHash.endsWith('0') ? '1' : '0') }, now), null);
  const [payload, signature] = token.split('.');
  const data = JSON.parse(Buffer.from(payload, 'base64url'));
  data.exp += 86400;
  const tampered = Buffer.from(JSON.stringify(data)).toString('base64url') + '.' + signature;
  assert.equal(sessionFor(request('/queens/', { token: tampered }), config, now), null);
  for (const value of ['true', 'undefined', '..', token + '.extra', 'x'.repeat(2048)]) assert.equal(sessionFor(request('/queens/', { token: value }), config, now), null);
});
test('login only sets a secure cookie for a valid same-origin password submission', async () => {
  const bad = await login(post('/api/queens/login', { password: 'incorrect' }));
  assert.equal(bad.status, 401); assert.equal(bad.headers.get('set-cookie'), null);
  const good = await login(post('/api/queens/login', { password }));
  assert.equal(good.status, 200);
  const cookie = good.headers.get('set-cookie');
  for (const flag of ['__Host-queens_session=', 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=43200']) assert.ok(cookie.includes(flag));
  const token = cookie.split(';')[0].slice(COOKIE_NAME.length + 1);
  assert.ok(sessionFor(request('/queens/', { token })));
  assert.deepEqual(await good.json(), { ok: true });
  assert.equal((await login(post('/api/queens/login', { password }, { origin: 'https://elsewhere.example' }))).status, 403);
  assert.equal((await login(post('/api/queens/login', { password }, { 'sec-fetch-site': 'cross-site' }))).status, 403);
  assert.equal((await login(request('/api/queens/login'))).status, 405);
  assert.equal((await login(post('/api/queens/login', { password }, { 'content-type': 'text/plain' }))).status, 400);
  assert.equal((await login(post('/api/queens/login', { password: 'x'.repeat(4096) }))).status, 400);
  assert.equal((await login(request('/api/queens/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{broken' }))).status, 400);
});
test('private data cannot be loaded without an authenticated session', async () => {
  let reads = 0;
  const load = async () => { reads++; return { events: [{ id: 'private-assignment', title: 'Private event' }] }; };
  const denied = await serveSchedule(request('/api/queens/schedule'), load);
  assert.equal(denied.status, 401); assert.equal(reads, 0);
  const forged = await serveSchedule(request('/api/queens/schedule', { token: 'true' }), load);
  assert.equal(forged.status, 401); assert.equal(reads, 0);
  const allowed = await serveSchedule(request('/api/queens/schedule', { token: createSession(config) }), load);
  assert.equal(allowed.status, 200); assert.equal(reads, 1);
  assert.equal((await allowed.json()).events[0].id, 'private-assignment');
  for (const response of [denied, forged, allowed]) {
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('netlify-cdn-cache-control'), 'no-store');
    assert.equal(response.headers.get('vary'), 'Cookie');
  }
  const unavailable = await serveSchedule(request('/api/queens/schedule', { token: createSession(config) }), async () => { throw new Error('private internal details'); });
  assert.equal(unavailable.status, 503); assert.doesNotMatch(await unavailable.text(), /private internal details/);
});
test('page and logout keep access behind the session', async () => {
  const locked = page(request('/queens/'));
  assert.match(await locked.text(), /id="queens-login"/);
  const unlocked = page(request('/queens/', { token: createSession(config) }));
  const html = await unlocked.text();
  assert.match(html, /id="queens-events"/); assert.doesNotMatch(html, /id="queens-login"/);
  assert.match(unlocked.headers.get('cache-control'), /no-store/);
  assert.equal((await logout(request('/api/queens/logout'))).status, 405);
  assert.equal((await logout(post('/api/queens/logout', {}, { origin: 'https://elsewhere.example' }))).status, 403);
  const response = await logout(post('/api/queens/logout', {}));
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});
test('missing production configuration fails closed', async () => {
  const secret = process.env.QUEENS_SESSION_SECRET;
  try {
    delete process.env.QUEENS_SESSION_SECRET;
    assert.equal((await login(post('/api/queens/login', { password }))).status, 503);
    assert.equal(sessionFor(request('/queens/', { token: createSession(config) })), null);
  } finally { process.env.QUEENS_SESSION_SECRET = secret; }
});
