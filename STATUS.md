# STATUS.md — FFXIV Gear Set Planner

Last updated: 2026-10-31

## What was built

An offline, local-first web app for planning FFXIV gear sets per job. Pure HTML/CSS/vanilla JS (no build step, no dependencies, no server, no accounts).

- `index.html` — single page UI with job selector, targets panel, slot-by-slot piece cards, and totals panel.
- `css/styles.css` — dark theme, responsive-ish layout.
- `js/core.js` — pure logic (data model, meld budget math, stat goal math, CSV export, sample PLD set). Also loads in Node for tests via a `module.exports` guard.
- `js/app.js` — DOM wiring, localStorage persistence under key `ffxiv-gear-planner-v1`, CSV downloads via Blob.
- `tests/core.test.mjs` — 13 Node tests for meld math and CSV export.
- `README.md` (credits Asdale Dynamics, LLC) and `LICENSE` (MIT, exact line `Copyright (c) 2026 Asdale Dynamics, LLC`).

Features: 12-slot piece planning (owned vs. to-buy), per-piece source tags (hunt / raid / alliance raid / crafted / purchased / other), per-piece materia meld plan (grades XII–IX, editable stat amounts and prices), meld gil budget with over/under status, set-average ILVL vs. target, per-stat goals vs. melded totals, notes, multiple jobs, sample Paladin set with clearly-labeled placeholder names, shopping-list CSV (unowned pieces only) and full-set CSV export (RFC-4180 quoting, CRLF).

## How to run

- Open `index.html` directly in any modern browser — works from `file://`. No install, no build.
- Data autosaves to browser localStorage. "Add Sample PLD Set" button re-adds the sample plan with a numbered name so it never overwrites.
- Tests: `node --test tests/` (Node.js required; tested with v20).

## Verification results

- `node --check js/core.js` and `node --check js/app.js` — syntax OK.
- `node --test tests/` — **13/13 pass, 0 fail** (meld math: stat totals, meld counts, grade/override amounts, cost totals, budget status, goal diffs, avg ILVL; CSV: quoting/escaping, CRLF, shopping list filters unowned only, full set covers all 12 slots).
- DOM smoke test (jsdom, run externally in /tmp): page bootstraps with no JS errors, sample PLD renders 12 piece cards / 10 planned melds / 7 totals tiles / 8 stat-goal inputs, add-meld button adds a meld (10→11 rows) and it persists to localStorage, source checkboxes render (12×6), CSV generated from live state matches expectations.
- Cross-checked: every `getElementById` target used by `app.js` exists in `index.html`.

## Known gaps / assumptions

- Item names/ILVLs in the sample set are intentional placeholders ("…(sample)") — the app does not ship a real item database; you type your own.
- Materia grade stat amounts and gil prices are sensible defaults for grades XII–IX; override the amount per meld in the UI, or edit `MATERIA_DEFAULTS` in `js/core.js` for prices.
- "Stat goals" compare only against planned meld totals (gear side-stat bonuses are not itemized); treat goals as meld-driven tracking.
- ILVL "target" progress is a simple average of planned pieces, not a weighted BiS score; no stat-weight priority (Crit > Direct > Det) math yet.
- Persistence is one browser profile's localStorage — no export/import of the whole plan as JSON yet (CSV only); clearing browser data clears plans.
- Download button uses Blob/`download` attribute, which works from `file://` in current Chrome/Firefox/Edge; if a browser blocks it, copy `js` CSV generation output manually (logic is pure and tested).
- Untested in Safari specifically; tested headless (jsdom) and via Node. No automated browser E2E in the repo.
- The shopping CSV's "sources" column joins labels with ` | `; commas/quotes inside any field are properly escaped per RFC-4180 (covered by tests).
