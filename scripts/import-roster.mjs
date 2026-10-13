import { readFile, writeFile } from 'node:fs/promises';
import { rosterFromWorkbook } from '../netlify/lib/roster.mjs';
const input = process.argv[2];
if (!input) throw new Error('Usage: npm run import:roster -- /private/path/workbook.xlsx');
const contestants = await rosterFromWorkbook(await readFile(input));
await writeFile('public/data/roster.json', JSON.stringify({ updatedAt: new Date().toISOString(), contestants }, null, 2) + '\n');
console.log(`Imported ${contestants.length} contestants. Only names, divisions, opaque IDs, and optional categories were saved.`);
