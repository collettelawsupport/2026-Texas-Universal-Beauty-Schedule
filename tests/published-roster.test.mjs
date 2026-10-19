import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { rosterFromWorkbook, sanitizeRoster } from '../netlify/lib/roster.mjs';
import { divisions } from '../src/data.js';
import { scheduleFor } from '../src/logic.js';

async function printableRoster({ duplicate = false, adultDivision = '40+ Years', offset = 0 } = {}) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Contestant Roster');
  sheet.mergeCells('A1:F5');
  sheet.getCell('A1').value = '2026 Texas Our Little Miss \nUniversal Beauty Competition';
  for (const [row, first, last] of [[8, '0 -2 Years'], [9 + offset, ' Example ', 'Beauty'], [12 + offset, '7-9 Years - Prince'], [13 + offset, 'Example', 'Prince']]) {
    if (!last) sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(row, 1).value = first;
    if (last) sheet.getCell(row, 2).value = last;
  }
  sheet.mergeCells('E8:F8'); sheet.getCell('E8').value = adultDivision;
  sheet.getCell('E9').value = duplicate ? 'Example' : 'Adult';
  sheet.getCell('F9').value = duplicate ? 'Beauty' : 'Contestant';
  sheet.mergeCells('E23:F23'); // Blank merged cells in the supplied workbook.
  sheet.getCell('I30').value = 0;
  book.addWorksheet('Private contacts').addRow(['private@example.test']);
  return book.xlsx.writeBuffer();
}

test('printable roster reads both blocks, preserves Prince, and leaves optionals unknown', async () => {
  const roster = await rosterFromWorkbook(await printableRoster());
  assert.equal(roster.length, 3);
  assert.equal(roster.find(c => c.name === 'Example Prince').program, 'prince');
  assert.equal(roster.find(c => c.name === 'Example Prince').division, '7 - 9 years');
  assert.equal(roster.find(c => c.name === 'Adult Contestant').division, '40 + years');
  assert.ok(roster.every(c => c.optionals === null));
  assert.ok(!JSON.stringify(roster).includes('private@example.test'));
  const shifted = await rosterFromWorkbook(await printableRoster({ offset: 1 }));
  assert.deepEqual(shifted, roster);
});

test('ambiguous duplicate names and outdated age groups cannot silently enter a published roster', async () => {
  await assert.rejects(rosterFromWorkbook(await printableRoster({ duplicate: true })), /Duplicate/);
  await assert.rejects(rosterFromWorkbook(await printableRoster({ adultDivision: '29+ Years' })), /Unrecognized roster age division/);
});

test('only the approved Prince marker survives feed sanitation', () => {
  const base = { id: 'one', name: 'Example', division: '7 - 9 years', optionals: null };
  assert.deepEqual(sanitizeRoster({ contestants: [{ ...base, program: 'prince', email: 'private' }] }), [{ ...base, program: 'prince' }]);
  assert.deepEqual(sanitizeRoster({ contestants: [{ ...base, program: '<script>' }] }), [base]);
});

test('the optionals-only participation marker survives public sanitation', () => {
  const base = { id: 'optional-only', name: 'Optional Entrant', division: '10 - 12 years', optionals: ['pro-am'] };
  assert.deepEqual(sanitizeRoster({contestants:[{...base, participation:'optionals-only', email:'private'}]}), [{...base, participation:'optionals-only'}]);
  for (const participation of ['invalid', true, '<script>']) assert.deepEqual(sanitizeRoster({contestants:[{...base,participation}]}), [base]);
});

test('published roster contains 15 competition contestants and one approved optionals-only entrant', async () => {
  const data = JSON.parse(await readFile(new URL('../public/data/roster.json', import.meta.url)));
  const roster = sanitizeRoster(data);
  assert.equal(data.source, 'published-snapshot');
  assert.equal(roster.length, 16);
  assert.equal(roster.filter(c => c.participation !== 'optionals-only').length, 15);
  assert.deepEqual(roster.filter(c => c.program === 'prince').map(c => c.name), ['Paxtyn Pike', 'Silas Elgourbi']);
  assert.ok(roster.every(c => divisions.includes(c.division)));
  assert.ok(!roster.some(c => ['Sydni Lee', 'Sydney Lee', 'Brittany Skye Pike', 'Brittany Pike'].includes(c.name)));
  assert.equal(roster.find(c => c.name === 'Mareigh Chavez').id, 'contestant-dd0d4936dfa93984caa5b7eb');
  assert.equal(roster.find(c => c.name === 'Paxtyn Pike').id, 'contestant-efe45ed63f1e80df1a248d1f');
  const brynley = roster.find(c => c.name === 'Brynley Buzzard');
  assert.equal(brynley.division, '10 - 12 years');
  assert.equal(brynley.participation, 'optionals-only');
  assert.deepEqual([...brynley.optionals].sort(), ['livin-doll', 'optional-talent', 'practice-interview', 'pro-am']);
  assert.deepEqual(scheduleFor([brynley]).map(e => e.id), ['practice', 'pro-am', 'livin-doll']);
  assert.ok(!roster.some(c => c.name === 'Allison Nice'));
});
