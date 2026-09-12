# JunglerOS

A Mobile Legends: Bang Bang draft helper for junglers. Enter the enemy lineup, rate how each of your junglers fares against each hero, and it recommends a pick.

## Use it

- **Online:** https://kewnric.github.io/moba/
- **Offline:** open `index.html` from this folder. It's a single self-contained file; hero portraits still need an internet connection.

## Develop

```bash
npm install
npm run dev
```

`npm run dev` starts a live-reloading dev server. Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the Vitest tests in `tests/` |
| `npm run build` | Bundles `src/` into one file and writes it to `index.html` |

`index.html` in the repo root is generated. Change the files in `src/`, run `npm run build`, and commit the new `index.html` together with your change. CI fails if the two don't match, because GitHub Pages serves that file straight from `main`.

Needs Node 22 or newer.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/App.jsx` | App shell: saved data, navigation and dialogs |
| `src/views/` | The Draft Lab, Database, Assets and Data Hub screens |
| `src/components/` | Hero pool, avatars, radar chart, dialogs and the crash screen |
| `src/lib/engine.js` | Draft logic: enemy slots and jungler ranking |
| `src/lib/dataReducer.js` | Every change to your roster, ratings and notes |
| `src/lib/saveData.js` | Saved-data format, upgrades from older saves, backup import and export |
| `src/lib/storage.js` | Browser saving that falls back safely when data is unreadable |
| `src/lib/heroIds.js` | Hero ids and name lookup |
| `src/data/heroes.js` | All 133 heroes: id, lanes, official roles and specialities, portrait |
| `tests/` | Tests for the draft logic, saved data and hero data |

## How picks are ranked

- A hero the enemy already picked is never suggested.
- Ratings count S 10 · A 7 · B 5 · C 3 · D 1. Unrated matchups are skipped, not counted as B.
- A jungler's score is its average rating, pulled toward 5 (even) when only a few matchups are rated.
- A jungler is recommended only when it's rated against at least half of the enemies entered. Otherwise the app shows "Not enough ratings" and the best partly rated options.

## Your saved data

Your roster, ratings, notes and custom icons are saved in the browser you use JunglerOS in. Data Hub exports them to a backup file and restores backups from any version of the app.

Saves are keyed by hero id, not display name. The first time this version opens, it upgrades an older name-based save automatically, leaves the old copy in place, and lists any names that didn't match a hero.

## Updating the roster

When a new hero releases, add a row for them in `src/data/heroes.js`. The `id` is the hero's name in lowercase with dashes (for example `yi-sun-shin`). Never change an existing id, because saved ratings use it. Then run `npm test` and `npm run build`.
