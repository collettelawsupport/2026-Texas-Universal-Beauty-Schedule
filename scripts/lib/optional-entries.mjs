import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { divisions } from '../../src/data.js';
import { knownOptionalKeys, sanitizeOptionalFields } from '../../src/optionals.js';
import { sanitizeRoster } from '../../netlify/lib/roster.mjs';

const sheets = [
  { name: 'Living Doll', category: 'livin-doll', columns: [['Entered', null]], color: 'FFFFC000' },
  { name: 'Practice Interview', category: 'practice-interview', columns: [['Entered', null]], color: 'FFFFC000' },
  { name: 'Command_Optional Talent', category: 'optional-talent', columns: [['Command Performance', 'command-performance'], ['Optional Talent', 'optional-talent']], color: 'FFF4B183' }
];
const normalize = name => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const text = cell => cell.value == null ? '' : cell.text.trim();
function isEntered(cell, color) {
  const fill = cell.fill;
  if (fill?.pattern === 'solid' && fill.fgColor?.argb?.toUpperCase() === color) return true;
  if (text(cell) || (fill?.pattern === 'solid' && !['FFFFFFFF', '00000000'].includes(fill.fgColor?.argb?.toUpperCase()))) throw new Error(`Unrecognized optional marker at ${cell.address}`);
  return false;
}
export async function optionalEntriesFromWorkbook(bytes) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const records = new Map();
  let recognized = 0;
  for (const spec of sheets) {
    const sheet = workbook.getWorksheet(spec.name);
    if (!sheet || sheet.state !== 'visible') continue;
    recognized++;
    if (text(sheet.getCell('A1')) !== 'Age Division' || text(sheet.getCell('B1')) !== 'Name') throw new Error(`Unexpected headers in ${spec.name}`);
    spec.columns.forEach(([header], i) => { if (text(sheet.getCell(1, i + 3)) !== header) throw new Error(`Unexpected entry column in ${spec.name}`); });
    for (let row = 2; row <= sheet.rowCount; row++) {
      const name = text(sheet.getCell(row, 2)).replace(/\s+/g, ' ');
      if (!name) continue; // Blank scorecard rows do not identify a contestant.
      const division = text(sheet.getCell(row, 1));
      if (!divisions.includes(division)) throw new Error(`Unrecognized division for ${name}`);
      const key = `${normalize(name)}|${division}`;
      const record = records.get(key) || { name, division, selections: {} };
      const marked = spec.columns.filter((_, index) => isEntered(sheet.getCell(row, index + 3), spec.color));
      const selection = { entered: marked.length > 0, details: marked.map(([, detail]) => detail).filter(Boolean) };
      const previous = record.selections[spec.category];
      if (previous && JSON.stringify(previous) !== JSON.stringify(selection)) throw new Error(`Conflicting duplicate entries for ${name} in ${spec.name}`);
      record.selections[spec.category] = selection;
      records.set(key, record);
    }
  }
  if (!recognized || !records.size) throw new Error('No recognized optional-entry sheets');
  return [...records.values()];
}
function sameFirstLast(a, b) {
  const left = normalize(a).split(' '), right = normalize(b).split(' ');
  return left.length >= 2 && right.length >= 2 && left[0] === right[0] && left.at(-1) === right.at(-1);
}
export function mergeOptionalEntries(roster, entries, { aliases = {}, addUnmatched = false } = {}) {
  const contestants = sanitizeRoster({ contestants: roster });
  const matched = new Set(), unmatched = [];
  for (const entry of entries) {
    const targetName = aliases[normalize(entry.name)] || entry.name;
    const candidates = contestants.filter(c => c.division === entry.division && (normalize(c.name) === normalize(targetName) || sameFirstLast(c.name, targetName)));
    if (candidates.length > 1) throw new Error(`Ambiguous contestant match for ${entry.name}`);
    let contestant = candidates[0];
    if (!contestant && !addUnmatched) { unmatched.push(entry.name); continue; }
    if (!contestant) {
      contestant = { id: `contestant-${createHash('sha256').update(`published-roster:${normalize(entry.name)}:beauty`).digest('hex').slice(0, 24)}`, name: entry.name, division: entry.division, optionals: null };
      contestants.push(contestant);
    }
    if (matched.has(contestant.id)) throw new Error(`Multiple source names resolve to ${contestant.name}`);
    matched.add(contestant.id);
    const covered = Object.keys(entry.selections);
    const optionals = [...(contestant.optionals || []).filter(key => !covered.includes(key)), ...covered.filter(key => entry.selections[key].entered)];
    const optionalCoverage = [...new Set([...knownOptionalKeys(contestant), ...covered])];
    const optionalDetails = { ...contestant.optionalDetails };
    for (const key of covered) {
      delete optionalDetails[key];
      if (entry.selections[key].details.length) optionalDetails[key] = entry.selections[key].details;
    }
    delete contestant.optionalDetails;
    Object.assign(contestant, sanitizeOptionalFields({ optionals, optionalCoverage, optionalDetails }));
  }
  return { contestants: contestants.sort((a, b) => a.name.localeCompare(b.name)), matched: matched.size, unmatched };
}
