// Builds the e2e fixture page: the REAL shipped index.html with only the data
// constants (SALT/IV/CT) swapped for values encrypted from a known plaintext
// with a known test password. This lets the e2e suite exercise the exact
// unlock script that is in production, without needing the real password.

import { webcrypto, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadPage, REPO_ROOT } from '../lib/inspect.mjs';

export const TEST_PASSWORD = 'e2e-test-password-1234';
export const FIXTURE_DIR = path.join(REPO_ROOT, 'tests', 'e2e', '.fixtures');

const FIXTURE_PLAINTEXT = [
  '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">',
  '<title>fixture</title></head><body><h1 id="unlocked">FIXTURE OK</h1></body></html>',
].join('');

export default async function globalSetup() {
  const page = await loadPage('index.html');
  const { subtle } = webcrypto;
  const enc = new TextEncoder();

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const base = await subtle.importKey('raw', enc.encode(TEST_PASSWORD), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: page.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(FIXTURE_PLAINTEXT)));

  const b64 = buf => Buffer.from(buf).toString('base64');
  const fixtureConsts =
    `const SALT="${b64(salt)}",IV="${b64(iv)}",CT="${b64(ct)}",ITER=${page.iter};`;
  const fixtureHtml = page.html.replace(page.constStatement, fixtureConsts);

  await mkdir(FIXTURE_DIR, { recursive: true });
  await writeFile(path.join(FIXTURE_DIR, 'page.html'), fixtureHtml);
}
