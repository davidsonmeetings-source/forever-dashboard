# forever-dashboard
Davidson Forever live dashboard (encrypted)

## Testing

The dashboard content is AES-GCM-encrypted inside `index.html` / `coord/index.html`;
only the password-unlock bootstrap is plaintext. Three layers of tests cover it:

- `npm test` — structural checks (no password needed): the SALT/IV/CT/ITER crypto
  envelope is well-formed, the unlock UI is wired, both pages ship an identical
  bootstrap script, and salt/IV are never reused across pages.
- `npm run test:e2e` — Playwright tests that drive the *exact shipped unlock script*
  against a fixture ciphertext encrypted with a known test password: wrong password,
  correct password, Enter key, session auto-unlock on reload, and stale-cache recovery.
  (First run: `npm install`.)
- `npm run validate` — pre-publish gate for the pipeline that generates these pages.
  With `DASHBOARD_PW` set it additionally decrypts both pages and verifies the
  plaintext is intact HTML, so a corrupted publish never reaches the live dashboard.
  Run it before every automated commit.
