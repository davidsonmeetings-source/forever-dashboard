import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// The remote dev environment ships a pinned Chromium and blocks Playwright's
// own download (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1). Fall back to it when the
// version Playwright expects is absent. In CI, `npx playwright install chromium`
// provides the matching build and this branch is skipped.
let executablePath;
try {
  const { chromium } = await import('playwright-core');
  const preinstalled = '/opt/pw-browsers/chromium';
  if (!existsSync(chromium.executablePath()) && existsSync(preinstalled)) {
    executablePath = preinstalled;
  }
} catch {}

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.mjs',
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
});
