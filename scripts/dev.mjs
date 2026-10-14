import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.json': 'application/json' };
createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/api/roster') { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: 'Live roster is available after hosting configuration.' })); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const file = path.resolve(root, /^(assets|data|documents)\//.test(relative) ? `public/${relative}` : relative);
  if (!file.startsWith(root + path.sep) || !/^(index\.html|src\/[^/]+\.(js|css)|public\/(assets|data|documents)\/[^/]+)$/.test(path.relative(root, file))) { res.writeHead(404); res.end(); return; }
  try { const bytes = await readFile(file); res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(bytes); } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
