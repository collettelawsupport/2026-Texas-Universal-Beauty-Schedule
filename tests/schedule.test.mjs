import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { events, competition } from '../src/data.js';
import { scheduleFor, matchesContestant, calendarFile, eventInstant, parseSaved, escapeHTML, contestantName } from '../src/logic.js';
import { rosterFromWorkbook, sanitizeRoster } from '../netlify/lib/roster.mjs';
import rosterHandler from '../netlify/functions/roster.mjs';
const person = optionals => ({ id:'test', name:'Test Contestant', division:'7 - 9 years', optionals });
test('13 source events have confirmed times and positive durations', () => {
  assert.equal(events.length,13); assert.equal(competition.timesConfirmed,true);
  assert.equal(new Set(events.map(e=>e.id)).size,13);
  for (const e of events) if(e.end) assert.ok(eventInstant(e,'end')>eventInstant(e), e.title);
});
test('check-ins respect organizer exceptions in schedules and calendar exports', () => {
 const exceptions = ['livin-doll', 'registration', 'candyland', 'farewell'];
 for (const event of events.filter(e => exceptions.includes(e.id))) assert.ok(!Object.hasOwn(event, 'checkin'), event.title);
 for (const event of events.filter(e => !exceptions.includes(e.id))) {
  assert.match(event.checkin, /^\d{2}:\d{2}$/);
  assert.equal(eventInstant(event) - eventInstant(event, 'checkin'), 15 * 60_000, event.title);
 }
 const calendar = calendarFile(events, true).replace(/\r\n /g, '');
 assert.equal((calendar.match(/Check-in:/g) || []).length, 9);
 for (const id of exceptions) {
  const entry = calendar.split('BEGIN:VEVENT').find(value => value.includes(`UID:${id}-2026@`));
  assert.ok(entry && !entry.includes('Check-in:'), id);
 }
 for (const [id, time] of [['pro-am', '6:15 PM'], ['evening-gown', '7:45 AM'], ['finals', '11:15 AM']]) {
  const entry = calendar.split('BEGIN:VEVENT').find(value => value.includes(`UID:${id}-2026@`));
  assert.ok(entry.includes(`Check-in: ${time}`), id);
 }
 assert.ok(!calendar.includes('Time to be announced'));
});
test('required and shared events are preserved; unentered optionals are excluded',()=> {
 const list=scheduleFor([person([])]);
 assert.ok(list.some(e=>e.id==='finals')); assert.ok(list.some(e=>e.id==='parents')); assert.ok(list.some(e=>e.id==='candyland'));
 assert.equal(list.length,9); assert.ok(!list.some(e=>e.id==='special-awards'));
});
test('optionals from multiple watched contestants form one deduplicated family schedule',()=> {
 const list=scheduleFor([person(['practice-interview']),{...person(['pro-am','livin-doll']),id:'second'}]);
 assert.equal(list.length,13); assert.equal(list.filter(e=>e.id==='special-awards').length,1);
});
test('unknown optional entries are not silently hidden',()=>assert.equal(scheduleFor([person(null)]).length,13));
test('Winners Circle uses the main contestant schedule and keeps its practice status in calendar exports', () => {
 for (const optionals of [null, [], ['practice-interview', 'pro-am']]) {
  const regular = person(optionals);
  const practice = { ...regular, participation: 'winners-circle' };
  const list = scheduleFor([practice]);
  assert.deepEqual(list, scheduleFor([regular]));
  assert.ok(['registration', 'close-up', 'playtime', 'parents', 'sportswear', 'candyland', 'evening-gown', 'finals', 'farewell'].every(id => list.some(e => e.id === id)));
  const calendar = calendarFile(list, true, [practice]).replace(/\r\n /g, '');
  assert.match(calendar, /Test Contestant · Winners Circle: Practice participant from another state\. Not eligible for a crown\./);
  assert.match(calendar, /UID:finals-/);
  assert.ok(!calendarFile(list, true, [regular]).includes('Winners Circle'));
 }
});
test('optionals-only contestants receive only confirmed stage events, including calendar exports', () => {
 const c = { ...person(['pro-am', 'optional-talent', 'practice-interview']), participation: 'optionals-only' };
 const list = scheduleFor([c]);
 assert.deepEqual(list.map(e => e.id), ['practice', 'pro-am']);
 assert.equal(contestantName(c), 'Test Contestant*');
 assert.equal(contestantName(person([])), 'Test Contestant');
 assert.deepEqual(scheduleFor([{ ...c, optionals: null }]), []);
 assert.deepEqual(scheduleFor([{ ...c, optionals: [], optionalCoverage: [] }]), []);
 assert.deepEqual(scheduleFor([{ ...c, optionals: ['livin-doll'] }]).map(e => e.id), ['livin-doll']);
 const calendar = calendarFile(list, true, [c]);
 assert.equal(calendar.match(/BEGIN:VEVENT/g).length, 2);
 assert.match(calendar, /UID:practice-/);
 assert.match(calendar, /UID:pro-am-/);
 assert.ok(!/UID:(registration|finals|special-awards|candyland)-/.test(calendar));
});
test('mixed watch lists keep official events for competing contestants without assigning them to optionals-only entrants', () => {
 const optional = { ...person(['pro-am']), participation: 'optionals-only' };
 const competing = { ...person([]), id: 'competing' };
 const finals = events.find(e => e.id === 'finals');
 assert.ok(scheduleFor([optional, competing]).some(e => e.id === 'finals'));
 assert.equal(matchesContestant(finals, optional), false);
 assert.equal(matchesContestant(finals, competing), true);
 assert.equal(matchesContestant({audience:'optional',optional:['pro-am'],divisions:['3 - 6 years']}, optional), false);
});
test('division and contestant specific event restrictions are honored',()=> {
 assert.equal(matchesContestant({audience:'all',divisions:['3 - 6 years']},person([])),false);
 assert.equal(matchesContestant({audience:'all',contestantIds:['other']},person([])),false);
});
test('calendar handles Sunday DST transition, stable IDs and CRLF',()=> {
 const output=calendarFile(events,true);
 assert.match(output,/DTSTART:20261030T210000Z/);
 assert.match(output,/DTSTART:20261101T140000Z/);
 assert.equal(output.match(/BEGIN:VEVENT/g).length,13);
 assert.match(output,/UID:finals-2026@texasolm.schedule/);
 assert.ok(output.endsWith('\r\n')); assert.ok(output.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
});
test('unconfirmed events cannot be exported as firm calendar times',()=>assert.equal(calendarFile(events,false).match(/BEGIN:VEVENT/g).length,9));
test('bad saved state recovers and HTML-sensitive names are escaped',()=> {
 assert.deepEqual(parseSaved('{broken'),{watched:[],personal:[]});
 assert.deepEqual(parseSaved('{"watched":[1,"okay"],"personal":[{}]}').watched,['okay']);
 assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
async function exampleWorkbook(missingField=false) {
 const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Test Contestant');
 sheet.getCell('A1').value='Texas Our Little Miss • Contestant Paperwork & Charges';
 sheet.getCell('A2').value='Contestant';sheet.getCell('B2').value='Test Contestant';sheet.getCell('A3').value='Division';sheet.getCell('B3').value='7 - 9 years';sheet.getCell('A5').value='Submission ID';sheet.getCell('B5').value='private-source-id';
 sheet.addRow(['Field','Response']);sheet.addRow(['Email','private@example.test']);sheet.addRow(['Address','Never expose this']);
 sheet.addRow(['Practice Interview (Close-Up Appraisal)','• I am not entering Practice Close Up or will add this optional at the door']);
 sheet.addRow(['Pro Am Modeling — Highly Recommended','• Sportswear / Casual Wear\n• Western Wear\n• I am not entering Pro Am Modeling or will add this optional at the door']);
 if(!missingField)sheet.addRow(['Optional Talent (All age divisions not requiring talent)','• I am not entering optional talent/command performance or will add this optional at the door']);
 sheet.addRow(['Livin’ Doll (Highly Recommended)','State Contestant = $50']);
 sheet.addRow(['Miss Photogenic — Photo Due by 10/05/26','I am not entering Miss Photogenic']);
 sheet.addRow(['Commercial Print (Check all that apply)','• I am not entering Commercial Print or will add this optional at registration']);
 sheet.addRow(['Prettiest and Bests (check each one you want to enter)','• I am not entering any Prettiest and Bests or will add this optional at the door']);
 sheet.addRow(['$20 COUPON — What optional would you like to select for free?','Commercial Headshot']);
 return book.xlsx.writeBuffer();
}
test('Big Forms import publishes only stage enrollment, combines ProAm entries, and excludes non-stage coupons',async()=> {
 const list=await rosterFromWorkbook(await exampleWorkbook());
 assert.equal(list.length,1);assert.deepEqual(Object.keys(list[0]),['id','name','division','optionals']);
 assert.deepEqual(list[0].optionals,['pro-am','livin-doll']);
 assert.ok(!JSON.stringify(list).includes('private'));assert.ok(!JSON.stringify(list).includes('Never expose'));
 assert.equal((await rosterFromWorkbook(await exampleWorkbook()))[0].id,list[0].id);
});
test('incomplete workbook entries remain unknown instead of silently excluding events',async()=> assert.equal((await rosterFromWorkbook(await exampleWorkbook(true)))[0].optionals,null));
test('unexpected workbooks fail closed',async()=> {
 const book=new ExcelJS.Workbook();book.addWorksheet('Contacts').addRow(['secret']);
 await assert.rejects(rosterFromWorkbook(await book.xlsx.writeBuffer()),/No recognized/);
});
test('JSON feed sanitation strips extra data and rejects duplicate IDs',()=> {
 const result=sanitizeRoster({contestants:[{...person(['pro-am','invalid']),email:'private@example.test'}]});
 assert.deepEqual(result,[person(['pro-am'])]);assert.throws(()=>sanitizeRoster({contestants:[person([]),person([])]}),/Duplicate/);
});
test('roster endpoint reports missing configuration honestly and rejects mutation',async()=> {
 globalThis.Netlify={env:{get:()=>undefined}};
 assert.equal((await rosterHandler(new Request('https://example.test/api/roster'))).status,503);
 assert.equal((await rosterHandler(new Request('https://example.test/api/roster',{method:'POST'}))).status,405);
});
test('roster endpoint only returns approved fields and suppresses upstream failures',async()=> {
 globalThis.Netlify={env:{get:key=>key==='ROSTER_FEED_URL'?'https://example.test/approved-feed':undefined}};
 const originalFetch=globalThis.fetch;
 try {
  globalThis.fetch=async()=>Response.json({contestants:[{...person(['pro-am','prettiest-best','commercial-print','photogenic']),phone:'private',optionalDetails:{'commercial-print':['headshot'],'prettiest-best':['hair'],'pro-am':['western']}}]});
  const response=await rosterHandler(new Request('https://example.test/api/roster'));
  assert.equal(response.status,200);assert.deepEqual((await response.json()).contestants,[person(['pro-am'])]);
  globalThis.fetch=async()=>{throw new Error('secret connection detail');};
  const error=await rosterHandler(new Request('https://example.test/api/roster'));
  assert.equal(error.status,502);assert.ok(!(await error.text()).includes('secret'));
 } finally {globalThis.fetch=originalFetch;}
});

test('older personal profiles are cleaned while saved watch IDs are retained', () => {
 const profile={id:'personal-old',name:'Example',division:'7 - 9 years',optionals:['pro-am','prettiest-best','commercial-print'],optionalDetails:{'prettiest-best':['eyes'],'pro-am':['western']}};
 const saved=parseSaved(JSON.stringify({watched:['contestant-existing','personal-old'],personal:[profile]}));
 assert.deepEqual(saved.watched,['contestant-existing','personal-old']);
 assert.deepEqual(saved.personal,[{id:profile.id,name:profile.name,division:profile.division,optionals:['pro-am']}]);
});
