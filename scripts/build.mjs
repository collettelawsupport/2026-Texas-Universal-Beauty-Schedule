import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { sanitizeRoster } from '../netlify/lib/roster.mjs';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
// Apply the same public allowlist to deploys as the live roster API.
const roster = JSON.parse(await readFile('public/data/roster.json', 'utf8'));
await writeFile('dist/data/roster.json', JSON.stringify({ source: roster.source, updatedAt: roster.updatedAt, contestants: sanitizeRoster(roster) }, null, 2) + '\n');
await cp('src', 'dist/src', { recursive: true });
await cp('index.html', 'dist/index.html');
console.log('Built static schedule in dist/');
