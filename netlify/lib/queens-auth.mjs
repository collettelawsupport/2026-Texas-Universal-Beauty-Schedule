import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
export const SESSION_SECONDS = 12 * 60 * 60;
export const COOKIE_NAME = '__Host-queens_session';
export const privateHeaders = {
  'cache-control': 'private, no-store, max-age=0',
  'netlify-cdn-cache-control': 'no-store',
  'cdn-cache-control': 'no-store',
  vary: 'Cookie',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'same-origin',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

export function settings() {
  const get = key => globalThis.Netlify?.env?.get(key) ?? process.env[key];
  return { passwordHash: get('QUEENS_PASSWORD_HASH') || '', secret: get('QUEENS_SESSION_SECRET') || '' };
}
export function configured({ passwordHash, secret }) {
  return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash) && secret.length >= 64;
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || !password.length || password.length > 256 || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash)) return false;
  const [, salt, expected] = passwordHash.split('$');
  return timingSafeEqual(await deriveKey(password, salt, 64), Buffer.from(expected, 'hex'));
}
const version = config => createHash('sha256').update(config.passwordHash).digest('hex').slice(0, 24);
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');
export function createSession(config, now = Date.now()) {
  if (!configured(config)) throw new Error('Queens access is not configured');
  const issued = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: issued, exp: issued + SESSION_SECONDS, v: version(config), nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload, config.secret)}`;
}
export function sessionFor(request, config = settings(), now = Date.now()) {
  if (!configured(config)) return null;
  const token = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE_NAME + '='))?.slice(COOKIE_NAME.length + 1);
  if (!token || token.length > 1024) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  if (!timingSafeEqual(Buffer.from(parts[1]), Buffer.from(sign(parts[0], config.secret)))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const time = Math.floor(now / 1000);
    return Number.isInteger(data.exp) && Number.isInteger(data.iat) && data.iat <= time && data.exp > time && data.exp - data.iat === SESSION_SECONDS && data.v === version(config) ? data : null;
  } catch { return null; }
}
export const sessionCookie = token => `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${token ? SESSION_SECONDS : 0}`;
export const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { ...privateHeaders, ...headers } });
export function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin && request.headers.get('sec-fetch-site') !== 'cross-site';
}
export async function readLoginBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('JSON required');
  if (Number(request.headers.get('content-length')) > 2048) throw new Error('Too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2048) { await reader.cancel(); throw new Error('Too large'); }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
