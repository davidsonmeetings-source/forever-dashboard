// Structural smoke tests for the published pages. Run with: npm test
// These need no password: they validate the crypto envelope, the UI wiring,
// and invariants the publish pipeline must uphold.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGES, loadPage, decodeBase64Strict,
  EXPECTED_ITERATIONS, SALT_BYTES, IV_BYTES, GCM_TAG_BYTES, MIN_PLAINTEXT_BYTES,
} from './lib/inspect.mjs';

const pages = await Promise.all(PAGES.map(async p => ({ ...p, ...(await loadPage(p.file)) })));

for (const page of pages) {
  test(`${page.file}: crypto envelope is well-formed`, () => {
    const salt = decodeBase64Strict(page.salt, 'SALT');
    const iv = decodeBase64Strict(page.iv, 'IV');
    const ct = decodeBase64Strict(page.ct, 'CT');
    assert.equal(salt.length, SALT_BYTES, 'salt must be 16 bytes');
    assert.equal(iv.length, IV_BYTES, 'AES-GCM IV must be 12 bytes');
    assert.ok(
      ct.length >= MIN_PLAINTEXT_BYTES + GCM_TAG_BYTES,
      `ciphertext suspiciously small (${ct.length} bytes) — truncated publish?`,
    );
    assert.equal(page.iter, EXPECTED_ITERATIONS, 'PBKDF2 iteration count changed');
  });

  test(`${page.file}: unlock UI is wired`, () => {
    for (const marker of ['id="pw"', 'id="go"', 'id="err"']) {
      assert.ok(page.html.includes(marker), `missing element ${marker}`);
    }
    assert.match(page.bootstrap, /getElementById\('go'\)\.onclick/, 'unlock button not wired');
    assert.match(page.bootstrap, /e\.key==='Enter'/, 'Enter-key unlock not wired');
    assert.match(page.bootstrap, /sessionStorage\.getItem\('dpw'\)/, 'session auto-unlock missing');
    assert.match(page.bootstrap, /sessionStorage\.removeItem\('dpw'\)/, 'stale-password cleanup missing');
    assert.match(page.bootstrap, /crypto\.subtle\.decrypt\(\{name:'AES-GCM'/, 'AES-GCM decrypt missing');
  });
}

test('both pages ship an identical unlock bootstrap (no copy-paste drift)', () => {
  const [a, b] = pages;
  assert.equal(a.bootstrap, b.bootstrap,
    'unlock scripts differ between index.html and coord/index.html — a fix was applied to only one page');
});

test('salt and IV are unique per page (AES-GCM must never reuse an IV under the same key)', () => {
  const [a, b] = pages;
  assert.notEqual(a.salt, b.salt, 'pages share a PBKDF2 salt');
  assert.notEqual(a.iv, b.iv, 'pages share an AES-GCM IV');
  assert.notEqual(a.ct, b.ct, 'pages share identical ciphertext');
});
