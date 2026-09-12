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
| `src/lib/storage.js` | Browser saving that falls back safely when data is unreadable |
| `src/data/heroes.js` | All 133 heroes, their lanes and official portrait URLs |
| `tests/` | Tests for the draft logic, saving and hero data |

## How picks are ranked

- A hero the enemy already picked is never suggested.
- Ratings count S 10 · A 7 · B 5 · C 3 · D 1. Unrated matchups are skipped, not counted as B.
- A jungler's score is its average rating, pulled toward 5 (even) when only a few matchups are rated.
- A jungler is recommended only when it's rated against at least half of the enemies entered. Otherwise the app shows "Not enough ratings" and the best partly rated options.

## Updating the roster

When a new hero releases, add them to their lane list(s) in `src/data/heroes.js` and add their portrait file to `IMAGE_FILES`. Then run `npm test` and `npm run build`.
