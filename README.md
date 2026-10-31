# FFXIV Gear Set Planner

An offline, local-first web app for planning Final Fantasy XIV gear sets, one job at a time. Plan pieces slot-by-slot, tag where each piece comes from (hunt, raid, crafted, purchased…), lay out a materia meld plan with cost math, track ILVL and stat goals, and export a shopping list to CSV. Everything is saved in your browser's localStorage — no account, no server, nothing leaves your machine.

Part of the [Asdale Dynamics, LLC](https://dylanasdale.github.io) set of FFXIV companion tools:

- **ffxiv-gear-planner-webapp** (this app) — per-job gear, melds, budgets, shopping lists
- `ffxiv-collection-board-webapp` — mounts, minions, and collectibles
- `ffxiv-weekly-lockout-tracker` — weekly duty lockout limits

## Features

- **Slot-by-slot planning** for all 12 gear slots (weapon through Ring 2), including items you own vs. still need.
- **Materia meld plan with budget math**: add melds per piece (grade XII–IX with editable stat amounts), see the total melded stats per stat, and track your gil cost against a budget cap with live over/under status.
- **Source tags per piece**: hunt, raid, alliance raid, crafted, purchased, other — tick whichever apply.
- **Stat-goal notes and ILVL targets**: set an ILVL target and per-stat meld goals; the totals panel shows your current position vs. goal per stat.
- **Per-job plans**: create any number of job tabs, each stored separately. A sample **Paladin** set is included (placeholder item names — edit them freely).
- **CSV exports**: a *shopping list* (unowned pieces only) and a *full set* dump, both standard CSV with proper quoting, ready for spreadsheets.
- **Fully offline**: one folder of plain HTML/JS/CSS. Works from `file://` with no build step, no npm, no network.

## How to run

No build, no install:

1. Download or clone this folder.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari) — even directly from disk (`file://`).

Everything you type autosaves to localStorage. The sample PLD set loads the first time you open the app.

> Tip: if a part of your browser blocks `file://` storage, serve the folder with any static server (e.g. `python3 -m http.server`) — but plain `file://` is supported and tested.

## Materia defaults (all editable per meld)

| Grade | Default stat amount | Default price (gil) |
|-------|--------------------|--------------------:|
| XII   | 36                 | 5,000               |
| XI    | 32                 | 2,500               |
| X     | 30                 | 1,200               |
| IX    | 24                 | 600                |

These are sensible placeholders, not market truth — override the stat amount (and prices by editing `js/core.js`) to match your server.

## Tests

You need Node.js (18+). Run:

```
node --test tests/
```

13 tests cover the meld math (stat totals, costs, budget over/under, goal diffs) and the CSV export (quoting/escaping, unowned-only shopping list, CRLF formatting).

## Tech

- Pure HTML + CSS + vanilla JavaScript, three files (`index.html`, `css/styles.css`, `js/core.js`, `js/app.js`).
- No dependencies, no accounts, no telemetry, no secrets. All data stays in your browser.
- CSV output is RFC-4180-style with CRLF line endings and quote-escaping.

## Credits & License

Built by Asdale Dynamics, LLC — [dylanasdale.github.io](https://dylanasdale.github.io). Released under the MIT License; see [LICENSE](LICENSE).

*FFXIV is a trademark of Square Enix Co., Ltd. This is an unofficial fan tool with no affiliation or endorsement; it collects no data and talks to no game servers.*
