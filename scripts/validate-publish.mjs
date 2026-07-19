#!/usr/bin/env node
// Pre-publish validation for the encrypted dashboard pages.
//
//   node scripts/validate-publish.mjs                  # structural checks only
//   DASHBOARD_PW=... node scripts/validate-publish.mjs # + decrypt round-trip
//
// Intended to run in the publish pipeline right before committing, so a
// corrupted or truncated ciphertext never reaches the live dashboard.
// Exits non-zero on any failure.

import { webcrypto } from 'node:crypto';
import {
  PAGES, loadPage, decodeBase64Strict,
  EXPECTED_ITERATIONS, SALT_BYTES, IV_BYTES, GCM_TAG_BYTES, MIN_PLAINTEXT_BYTES,
} from '../tests/lib/inspect.mjs';

const { subtle } = webcrypto;
const password = process.env.DASHBOARD_PW;
let failures = 0;

function check(ok, label) {
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
  return ok;
}

async function decrypt(page, pw) {
  const enc = new TextEncoder();
  const base = await subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt: decodeBase64Strict(page.salt, 'SALT'), iterations: page.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  const pt = await subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64Strict(page.iv, 'IV') },
    key, decodeBase64Strict(page.ct, 'CT'),
  );
  return new TextDecoder().decode(pt);
}

const seen = { salts: new Set(), ivs: new Set() };

for (const { file } of PAGES) {
  console.log(`\n${file}`);
  let page;
  try {
    page = await loadPage(file);
  } catch (e) {
    check(false, e.message);
    continue;
  }

  try {
    check(decodeBase64Strict(page.salt, 'SALT').length === SALT_BYTES, 'salt is 16-byte base64');
    check(decodeBase64Strict(page.iv, 'IV').length === IV_BYTES, 'IV is 12-byte base64');
    check(decodeBase64Strict(page.ct, 'CT').length >= MIN_PLAINTEXT_BYTES + GCM_TAG_BYTES, 'ciphertext has plausible size');
  } catch (e) {
    check(false, e.message);
    continue;
  }
  check(page.iter === EXPECTED_ITERATIONS, `PBKDF2 iterations = ${EXPECTED_ITERATIONS}`);
  check(!seen.salts.has(page.salt), 'salt not reused by another page');
  check(!seen.ivs.has(page.iv), 'IV not reused by another page');
  seen.salts.add(page.salt);
  seen.ivs.add(page.iv);

  if (!password) continue;
  try {
    const html = await decrypt(page, password);
    check(/^\s*<!DOCTYPE html>/i.test(html), 'plaintext starts with <!DOCTYPE html>');
    check(/<\/html>\s*$/i.test(html), 'plaintext ends with </html>');
    check(html.length >= MIN_PLAINTEXT_BYTES, 'plaintext has plausible size');
  } catch {
    check(false, 'decryption round-trip (wrong DASHBOARD_PW or corrupted ciphertext)');
  }
}

if (!password) console.log('\nnote: DASHBOARD_PW not set — decryption round-trip skipped');
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
