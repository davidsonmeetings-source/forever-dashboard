# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Static hosting for two password-protected live dashboards for the Davidson Forever project (Rishon LeZion, Davidson Group). There is no build system, no package manager, no tests, and no lint — the repo contains only self-contained HTML files served as static pages:

- `index.html` — main control dashboard ("לוח בקרה Forever")
- `coord/index.html` — coordinators board ("לוח מתאמות Forever")

Both pages are Hebrew, RTL (`lang="he" dir="rtl"`).

## How the encryption shell works

Each HTML file is a small visible "password gate" plus an encrypted payload. The real dashboard content is **not stored in plaintext anywhere in this repo** — it lives in the `CT` constant as base64 AES-256-GCM ciphertext.

Decryption flow (identical in both files):
1. User enters a password; a key is derived with PBKDF2-SHA256 (`ITER=250000`, per-file random `SALT`).
2. The `CT` blob is decrypted with AES-GCM using the per-file `IV`.
3. The decrypted plaintext is a complete HTML document, written over the page via `document.open()/document.write()`.
4. On success the password is cached in `sessionStorage` under key `dpw`, so a refresh auto-unlocks; a failed auto-unlock clears the cache.

Each file has its own `SALT`/`IV`/`CT` (and potentially its own password).

## Consequences for editing

- **Dashboard content cannot be edited directly.** Changing what the dashboard shows requires re-encrypting a new plaintext HTML document with the correct password and replacing `SALT`, `IV`, and `CT` together (a fresh random salt and IV must be generated for every re-encryption; never reuse an IV with the same key).
- **The shell (login UI + unlock script) is editable plaintext**, but it is duplicated in both files — keep `index.html` and `coord/index.html` in sync when changing it.
- The `CT` value sits on a single very long line (~240KB in `index.html`). Do not reformat, wrap, or let tooling "prettify" these files — any corruption of the base64 or of the surrounding one-line script breaks decryption.
- Never commit decrypted dashboard content, passwords, or intermediate plaintext files to this repo.

## Content updates are automated

An external automation regularly commits and pushes updated ciphertext:
- `dashboard update DD.MM.YYYY HH:MM` — main dashboard (daily around 08:55 plus ad-hoc updates)
- `coord board YYYY-MM-DD HH:MM` — coordinators board (roughly hourly at :15)

Expect frequent upstream commits on `main`; fetch/rebase before pushing manual changes, and follow the existing commit-message patterns when committing updates of the same kind.

## Conventions

- Everything is dependency-free vanilla HTML/CSS/JS in a single file per page — keep it that way (no external scripts, frameworks, or build steps).
- UI text is Hebrew, RTL; password inputs are `direction:ltr`.
- Brand palette used by the gate (and dashboards): navy `#0f1e3d` / `#1c3461`, gold accent `#c9a227`.
