import { rosterFromWorkbook, sanitizeRoster } from '../lib/roster.mjs';
const MAX_BYTES = 20 * 1024 * 1024;
async function bodyWithLimit(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Workbook too large');
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Workbook too large'); } chunks.push(Buffer.from(value)); }
  return Buffer.concat(chunks);
}
function checkedURL(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Source requires HTTPS');
  return url;
}
export default async function handler(request) {
  const headers = { 'content-type': 'application/json', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' };
  if (request.method !== 'GET') return Response.json({ message: 'Method not allowed' }, { status: 405, headers: { ...headers, allow: 'GET' } });
  const feed = Netlify.env.get('ROSTER_FEED_URL');
  const source = Netlify.env.get('BIG_FORMS_URL');
  const key = Netlify.env.get('WORKBOOK_DOWNLOAD_KEY');
  if (!feed && !(source && key)) return Response.json({ message: 'The official contestant roster is being connected.' }, { status: 503, headers: { ...headers, 'cache-control': 'no-store' } });
  try {
    let contestants;
    if (feed) {
      const token = Netlify.env.get('ROSTER_FEED_TOKEN');
      const response = await fetch(checkedURL(feed), { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(12000), redirect: 'error' });
      if (!response.ok) throw new Error('Roster feed unavailable');
      contestants = sanitizeRoster(JSON.parse((await bodyWithLimit(response)).toString('utf8')));
    } else {
      const url = checkedURL(source); url.pathname = '/api/download-workbook'; url.search = ''; url.hash = '';
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ downloadKey: key }), signal: AbortSignal.timeout(20000), redirect: 'error' });
      if (!response.ok) throw new Error('Workbook unavailable');
      contestants = await rosterFromWorkbook(await bodyWithLimit(response));
    }
    // Only approved identity and stage-optional fields cross the public boundary.
    return Response.json({ updatedAt: new Date().toISOString(), contestants }, { headers: { ...headers, 'cache-control': 'public, max-age=60', 'netlify-cdn-cache-control': 'public, s-maxage=300, stale-while-revalidate=300' } });
  } catch {
    // Do not log private responses, source URLs, or credentials.
    return Response.json({ message: 'The roster is temporarily unavailable. Please try again shortly.' }, { status: 502, headers: { ...headers, 'cache-control': 'no-store' } });
  }
}
export const config = { path: '/api/roster', method: ['GET', 'POST', 'PUT', 'DELETE'] };
