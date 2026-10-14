import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { divisions } from '../../src/data.js';
const categories = ['practice-interview', 'pro-am', 'optional-talent', 'livin-doll', 'photogenic', 'commercial-print', 'prettiest-best', 'other-optional'];
const fieldMap = [
  [/^Practice Interview \(/, 'practice-interview'], [/^Pro Am Modeling/, 'pro-am'],
  [/^Optional Talent \(/, 'optional-talent'], [/^Livin.? Doll \(/, 'livin-doll'],
  [/^Miss Photogenic/, 'photogenic'], [/^Commercial Print \(/, 'commercial-print'],
  [/^Prettiest and Bests/, 'prettiest-best']
];
function text(cell) { return cell.value == null ? '' : cell.text.trim(); }
export function hasEntry(value) {
  return String(value).split('\n').map(v => v.replace(/^\s*[•-]\s*/, '').trim()).some(v => v && !/not entering|do not need|will add|^none$|^n\/a$/i.test(v));
}
export function sanitizeRoster(payload) {
  if (!Array.isArray(payload?.contestants)) throw new Error('Roster must contain contestants');
  const seen = new Set();
  return payload.contestants.map(c => {
    if (typeof c.id !== 'string' || !c.id || c.id.startsWith('personal-') || typeof c.name !== 'string' || !c.name.trim() || typeof c.division !== 'string') throw new Error('Invalid contestant record');
    if (seen.has(c.id)) throw new Error('Duplicate contestant ID');
    seen.add(c.id);
    return { id: c.id.slice(0, 100), name: c.name.trim().slice(0, 100), division: c.division.trim().slice(0, 80), optionals: Array.isArray(c.optionals) ? [...new Set(c.optionals.filter(v => categories.includes(v)))] : null, ...(c.program === 'prince' ? { program: 'prince' } : {}) };
  });
}
function publishedRoster(sheet) {
  const contestants = [];
  // The organizer's printable roster has two independent first/last-name columns.
  for (const column of [1, 5]) {
    let division, program;
    for (let row = 8; row <= sheet.rowCount; row++) {
      const first = text(sheet.getCell(row, column)).replace(/\s+/g, ' ');
      const last = text(sheet.getCell(row, column + 1)).replace(/\s+/g, ' ');
      if (!first && !last) continue;
      const heading = first.match(/^(\d+)\s*(?:[-–—]\s*(\d+)|(\+))\s*years?(?:\s*[-–—]?\s*(prince))?$/i);
      if (heading) {
        division = heading[3] ? `${heading[1]} + years` : `${heading[1]} - ${heading[2]} years`;
        if (!divisions.includes(division)) throw new Error(`Unrecognized roster age division: ${first}`);
        program = heading[4] ? 'prince' : undefined;
        continue;
      }
      if (!division || !first || !last || /^\d/.test(first)) throw new Error(`Unrecognized roster row ${row}`);
      const name = `${first} ${last}`;
      const identity = `published-roster:${name.normalize('NFKC').toLowerCase()}:${program || 'beauty'}`;
      contestants.push({ id: `contestant-${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`, name, division, optionals: null, ...(program ? { program } : {}) });
    }
  }
  return contestants;
}
export async function rosterFromWorkbook(bytes) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const contestants = [];
  for (const sheet of workbook.worksheets) {
    if (sheet.state !== 'visible') continue;
    if (sheet.name === 'Contestant Roster' && /Texas Our Little Miss\s+Universal Beauty Competition/i.test(text(sheet.getCell('A1')))) {
      contestants.push(...publishedRoster(sheet));
      continue;
    }
    if (!text(sheet.getCell('A1')).includes('Contestant Paperwork & Charges') || text(sheet.getCell('A2')) !== 'Contestant' || text(sheet.getCell('A3')) !== 'Division') continue;
    const name = text(sheet.getCell('B2')), division = text(sheet.getCell('B3')), sourceId = text(sheet.getCell('B5'));
    if (!name || !sourceId || text(sheet.getCell('A5')) !== 'Submission ID') throw new Error('Missing contestant identity');
    const entered = new Set(); const known = new Set(); let inResponses = false;
    sheet.eachRow(row => {
      const label = text(row.getCell(1));
      if (label === 'Field' && text(row.getCell(2)) === 'Response') { inResponses = true; return; }
      if (!inResponses) return;
      const response = text(row.getCell(2));
      for (const [pattern, key] of fieldMap) {
        if (pattern.test(label)) { if (response) known.add(key); if (hasEntry(response)) entered.add(key); }
      }
      if (/^\$20 COUPON/.test(label) && hasEntry(response)) {
        if (/Prettiest/i.test(response)) entered.add('prettiest-best');
        if (/Commercial/i.test(response)) entered.add('commercial-print');
      }
    });
    contestants.push({
      id: `contestant-${createHash('sha256').update(sourceId).digest('hex').slice(0, 24)}`,
      name, division, optionals: known.size === fieldMap.length ? [...entered] : null
    });
  }
  if (!contestants.length) throw new Error('No recognized contestant roster or Big Forms sheets');
  return sanitizeRoster({ contestants }).sort((a, b) => a.name.localeCompare(b.name));
}
