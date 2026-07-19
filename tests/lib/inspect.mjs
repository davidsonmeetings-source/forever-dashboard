// Shared helpers for inspecting the published dashboard pages.
// Each page embeds: const SALT="<b64>",IV="<b64>",CT="<b64>",ITER=<n>;
// followed by the unlock bootstrap script.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PAGES = [
  { name: 'dashboard', file: 'index.html' },
  { name: 'coord board', file: 'coord/index.html' },
];

export const EXPECTED_ITERATIONS = 250000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;
// Smaller than any plausible real dashboard; catches truncated/empty ciphertext.
export const MIN_PLAINTEXT_BYTES = 1024;

const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function decodeBase64Strict(value, label) {
  if (typeof value !== 'string' || value.length === 0 || !B64_RE.test(value) || value.length % 4 !== 0) {
    throw new Error(`${label} is not valid base64`);
  }
  return Buffer.from(value, 'base64');
}

export async function loadPage(file) {
  const html = await readFile(path.join(REPO_ROOT, file), 'utf8');
  return parsePage(html, file);
}

export function parsePage(html, file = '<inline>') {
  const constMatch = html.match(/const SALT="([^"]*)",IV="([^"]*)",CT="([^"]*)",ITER=(\d+);/);
  if (!constMatch) throw new Error(`${file}: could not find SALT/IV/CT/ITER constants`);
  const [constStatement, salt, iv, ct, iter] = constMatch;

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error(`${file}: no <script> block found`);
  // The unlock logic is everything in the script after the data constants.
  const bootstrap = scriptMatch[1].replace(constStatement, '').trim();

  return { file, html, salt, iv, ct, iter: Number(iter), constStatement, bootstrap };
}
