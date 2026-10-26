import { readFile, writeFile } from 'node:fs/promises';
import { optionalEntriesFromWorkbook, mergeOptionalEntries } from './lib/optional-entries.mjs';
import { optionalImportOptions } from './lib/roster-corrections.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: npm run import:optionals -- /private/path/optionals.xlsx [--add-unmatched]');
const snapshot = JSON.parse(await readFile('public/data/roster.json', 'utf8'));
const entries = await optionalEntriesFromWorkbook(await readFile(input), optionalImportOptions);
const result = mergeOptionalEntries(snapshot.contestants, entries, { ...optionalImportOptions, addUnmatched: process.argv.includes('--add-unmatched') });
await writeFile('public/data/roster.json', JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString(), contestants: result.contestants }, null, 2) + '\n');
console.log(`Attached optional entries to ${result.matched} contestants; existing IDs preserved.`);
if (result.unmatched.length) console.log(`Not on current roster: ${result.unmatched.join(', ')}`);
