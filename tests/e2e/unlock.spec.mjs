// End-to-end tests for the password unlock flow, driving the exact bootstrap
// script shipped in index.html against a fixture ciphertext (see global-setup).

import { test, expect } from '@playwright/test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TEST_PASSWORD, FIXTURE_DIR } from './global-setup.mjs';

let server;
let pageUrl;

test.beforeAll(async () => {
  const html = await readFile(path.join(FIXTURE_DIR, 'page.html'));
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  pageUrl = `http://127.0.0.1:${server.address().port}/`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

// PBKDF2 runs 250k iterations in the browser per attempt; allow for slow runners.
const UNLOCK_TIMEOUT = { timeout: 15000 };

test('wrong password shows an error and stays locked', async ({ page }) => {
  await page.goto(pageUrl);
  await page.fill('#pw', 'wrong-password');
  await page.click('#go');
  await expect(page.locator('#err')).toHaveText('סיסמה שגויה', UNLOCK_TIMEOUT);
  await expect(page.locator('#pw')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('dpw'))).toBeNull();
});

test('correct password decrypts and renders the dashboard', async ({ page }) => {
  await page.goto(pageUrl);
  await page.fill('#pw', TEST_PASSWORD);
  await page.click('#go');
  await expect(page.locator('#unlocked')).toHaveText('FIXTURE OK', UNLOCK_TIMEOUT);
  expect(await page.evaluate(() => sessionStorage.getItem('dpw'))).toBe(TEST_PASSWORD);
});

test('Enter key submits the password', async ({ page }) => {
  await page.goto(pageUrl);
  await page.fill('#pw', TEST_PASSWORD);
  await page.press('#pw', 'Enter');
  await expect(page.locator('#unlocked')).toHaveText('FIXTURE OK', UNLOCK_TIMEOUT);
});

test('reload auto-unlocks from the cached session password', async ({ page }) => {
  await page.goto(pageUrl);
  await page.fill('#pw', TEST_PASSWORD);
  await page.click('#go');
  await expect(page.locator('#unlocked')).toBeVisible(UNLOCK_TIMEOUT);

  await page.reload();
  await expect(page.locator('#unlocked')).toHaveText('FIXTURE OK', UNLOCK_TIMEOUT);
});

test('stale cached password falls back to the prompt and clears itself', async ({ page }) => {
  await page.goto(pageUrl);
  await page.evaluate(() => sessionStorage.setItem('dpw', 'stale-wrong-password'));
  await page.reload();

  await expect(page.locator('#pw')).toBeVisible();
  // Auto-unlock failure must clear the bad cache and show no error text.
  await expect.poll(
    () => page.evaluate(() => sessionStorage.getItem('dpw')),
    UNLOCK_TIMEOUT,
  ).toBeNull();
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('#unlocked')).toHaveCount(0);
});
