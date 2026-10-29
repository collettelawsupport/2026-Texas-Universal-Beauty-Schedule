import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { renderHandbook } from '../src/handbook.js';

const manifest = JSON.parse(await readFile(new URL('../public/data/handbook-pages.json', import.meta.url)));
test('reader pages stay in sync with the published handbook PDF', async () => {
  const path = 'public/documents/2026-texas-universal-beauty-handbook.pdf';
  // iCloud may evict the local PDF; the Git blob still supplies the exact published source.
  const pdf = await readFile(new URL('../' + path, import.meta.url)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return execFileSync('git', ['show', `HEAD:${path}`], { maxBuffer: 8 * 1024 * 1024 });
  });
  assert.equal(manifest.sourceSha256, createHash('sha256').update(pdf).digest('hex'), 'Regenerate reader assets after editing the PDF.');
  assert.equal(manifest.pages.length, 12);
  for (const [index, page] of manifest.pages.entries()) {
    assert.equal(page.image, `/assets/handbook-page-${String(index + 1).padStart(2, '0')}.jpg`);
    const bytes = await readFile(new URL('../public' + page.image, import.meta.url));
    assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.ok(page.width >= 1200 && page.height > page.width);
    if (index > 0) assert.ok(page.text.trim().length > 20, `Missing readable text for page ${index + 1}`);
  }
});
test('every handbook reading link stays inside the app and targets an existing page', () => {
  const html = renderHandbook();
  const links = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
  const readerLinks = links.filter(link => link.includes('data-handbook-page'));
  assert.equal(readerLinks.length, 11);
  for (const link of readerLinks) {
    const number = Number(link.match(/data-handbook-page="(\d+)"/)[1]);
    assert.ok(number >= 1 && number <= manifest.pages.length);
    assert.ok(link.includes('href="#handbook"'));
    assert.ok(!link.includes('target='));
  }
  // Only the explicit Download action points straight at the PDF.
  assert.equal(links.filter(link => link.includes('.pdf') && !link.includes('download')).length, 0);
});
