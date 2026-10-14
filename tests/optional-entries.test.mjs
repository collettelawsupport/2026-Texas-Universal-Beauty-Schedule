import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { optionalEntriesFromWorkbook, mergeOptionalEntries } from '../scripts/lib/optional-entries.mjs';
import { optionalStatus, optionalEntryLabels, sanitizeOptionalFields } from '../src/optionals.js';
import { scheduleFor, calendarFile, matchesContestant } from '../src/logic.js';
import { events, optionalCategories } from '../src/data.js';

const base = { id: 'existing-stable-id', name: 'Example Contestant', division: '3 - 6 years', optionals: null };
async function workbook({ duplicateConflict = false } = {}) {
  const book = new ExcelJS.Workbook();
  for (const [name, headers, color] of [
    ['Living Doll', ['Entered', 'Winner'], 'FFFFC000'],
    ['Practice Interview', ['Entered', 'Score'], 'FFFFC000'],
    ['Prettiest & Best', ['Eyes', 'Hair', 'Smile', 'Dress', 'Sportswear'], 'FFF4B183']
  ]) {
    const sheet = book.addWorksheet(name);
    sheet.addRow(['Age Division', 'Name', ...headers]);
    sheet.addRow(['3 - 6 years', 'Example Middle Contestant']);
    sheet.addRow(['3 - 6 years', 'Example Middle Contestant']);
    if (name !== 'Practice Interview') {
      for (const row of [2, 3]) {
        sheet.getCell(row, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        sheet.getCell(row, 3).note = 'Private entry note: never publish this.';
      }
      if (duplicateConflict && name === 'Living Doll') sheet.getCell('C3').fill = { type: 'pattern', pattern: 'none' };
    }
    // Orphaned formatting has no identity and must not create an entry.
    sheet.getCell('C6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  }
  return book.xlsx.writeBuffer();
}

test('highlighted scorecards import blank colored cells, deduplicate identical rows, and ignore notes', async () => {
  const entries = await optionalEntriesFromWorkbook(await workbook());
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].selections['livin-doll'], { entered: true, details: [] });
  assert.deepEqual(entries[0].selections['practice-interview'], { entered: false, details: [] });
  assert.equal(entries[0].selections['prettiest-best'], undefined);
  assert.ok(!JSON.stringify(entries).includes('Private'));
  await assert.rejects(optionalEntriesFromWorkbook(await workbook({ duplicateConflict: true })), /Conflicting duplicate/);
});

test('matching middle names preserves watched IDs, names, Prince labels and categories absent from new source', async () => {
  const original = { ...base, program: 'prince', optionals: ['pro-am', 'practice-interview'], optionalCoverage: ['pro-am', 'practice-interview'] };
  const entries = await optionalEntriesFromWorkbook(await workbook());
  const result = mergeOptionalEntries([original, { ...base, id: 'other', name: 'Another Contestant' }], entries);
  assert.equal(result.matched, 1);
  const updated = result.contestants.find(c => c.id === base.id);
  assert.equal(updated.name, base.name);
  assert.equal(updated.program, 'prince');
  assert.deepEqual(updated.optionals, ['pro-am', 'livin-doll']);
  assert.equal(updated.optionalDetails, undefined);
  assert.equal(result.contestants.find(c => c.id === 'other').optionals, null);
});

test('unmatched and ambiguous people are not silently assigned to existing contestants', () => {
  const entry = { name: 'Unmatched Person', division: base.division, selections: { 'livin-doll': { entered: true, details: [] } } };
  const result = mergeOptionalEntries([base], [entry]);
  assert.deepEqual(result.unmatched, ['Unmatched Person']);
  assert.deepEqual(result.contestants, [base]);
  assert.throws(() => mergeOptionalEntries([base, { ...base, id: 'other', name: 'Example Middle Contestant' }], [{ ...entry, name: base.name }]), /Ambiguous/);
});

test('partial coverage hides known non-entries but keeps unknown combined event entries marked', () => {
  const c = { ...base, optionals: [], optionalCoverage: ['practice-interview', 'optional-talent', 'livin-doll'] };
  assert.equal(optionalStatus(events.find(e => e.id === 'practice'), c), 'not-entered');
  assert.equal(optionalStatus(events.find(e => e.id === 'pro-am'), c), 'unknown');
  assert.equal(optionalStatus(events.find(e => e.id === 'special-awards'), c), 'unknown');
  const schedule = scheduleFor([c]);
  assert.ok(!schedule.some(e => ['practice', 'livin-doll'].includes(e.id)));
  assert.ok(schedule.some(e => e.id === 'finals'));
  const calendar = calendarFile(schedule, true, [c]);
  assert.ok(!calendar.includes('UID:practice-'));
  assert.ok(calendar.includes('UID:finals-'));
  assert.match(calendar.replace(/\r\n /g, ''), /Entry not confirmed: Example Contestant/);
  assert.equal(matchesContestant(events.find(e => e.id === 'pro-am'), { ...c, optionals: ['optional-talent'] }), true);
  assert.equal(optionalStatus(events.find(e => e.id === 'pro-am'), { ...c, optionals: ['optional-talent'] }), 'entered');
  assert.equal(matchesContestant(events.find(e => e.id === 'practice'), { ...c, optionals: [] }), false);
  assert.equal(matchesContestant(events.find(e => e.id === 'practice'), { ...c, optionals: null }), true);
});

test('public optional fields discard all non-stage enrollment and individual ProAm detail', () => {
  const result = sanitizeOptionalFields({
    optionals: ['pro-am', 'pro-am', 'optional-talent', 'prettiest-best', 'commercial-print', 'photogenic', 'other-optional'],
    optionalCoverage: ['pro-am', 'optional-talent', 'prettiest-best', 'commercial-print', 'private'],
    optionalDetails: { 'pro-am': ['sportswear', 'western'], 'optional-talent': ['command-performance', 'private'], 'prettiest-best': ['hair'], 'commercial-print': ['headshot'] }
  });
  assert.deepEqual(result, { optionals: ['pro-am', 'optional-talent'], optionalCoverage: ['pro-am', 'optional-talent'], optionalDetails: { 'optional-talent': ['command-performance'] } });
  assert.deepEqual(optionalEntryLabels(result), ['ProAm Modeling', 'Optional Talent / Command: Command Performance']);
  assert.deepEqual(optionalCategories.map(([key]) => key), ['practice-interview', 'pro-am', 'optional-talent', 'livin-doll']);
  const nonStageOnly = { ...base, optionals: ['prettiest-best', 'commercial-print'] };
  assert.deepEqual(optionalEntryLabels(nonStageOnly), []);
  assert.equal(scheduleFor([nonStageOnly]).length, 9);
});

test('published selections match representative source highlights without replacing roster identities', async () => {
  const { contestants } = JSON.parse(await readFile(new URL('../public/data/roster.json', import.meta.url)));
  const find = name => contestants.find(c => c.name === name);
  assert.deepEqual(find('Penelope Pike').optionals, ['practice-interview']);
  assert.equal(find('Penelope Pike').optionalDetails, undefined);
  assert.deepEqual(find('Jesse Finch').optionals, ['livin-doll']);
  assert.deepEqual(find('Jasmine Romero').optionalDetails, { 'optional-talent': ['optional-talent'] });
  assert.ok(!/prettiest|commercial|photogenic|other-optional|headshot|portfolio/.test(JSON.stringify(contestants)));
  assert.ok(contestants.every(c => JSON.stringify(sanitizeOptionalFields(c)) === JSON.stringify(Object.fromEntries(Object.entries(c).filter(([key]) => ['optionals', 'optionalCoverage', 'optionalDetails'].includes(key))))));
  assert.equal(find('Silas Elgourbi').program, 'prince');
  assert.equal(find('Silas Elgourbi').id, 'contestant-4f11d749e8f5c260169bd526');
  assert.equal(find('Paxtyn Pike').optionals, null);
  assert.equal(contestants.filter(c => c.name === 'Victoria Dishon').length, 1);
});
