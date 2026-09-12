# JunglerOS

A Mobile Legends: Bang Bang draft helper for junglers. Enter the enemy lineup, rate how each of your junglers fares against each hero, and it recommends a pick.

## Run it

Use it online at https://kewnric.github.io/moba/, or open `index.html` in a browser. Keep `heroes.js` and `engine.js` in the same folder; the page loads them.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The app (React and Tailwind from CDNs, compiled in the browser) |
| `engine.js` | Draft logic: enemy slots, jungler ranking, safe saving |
| `heroes.js` | Roster of 133 heroes with their lanes, plus official portrait URLs |
| `tests/` | Node tests for `engine.js` and `heroes.js` |

## Tests

```bash
npm test
```

Needs Node 22 or newer. There's nothing to install.

## How picks are ranked

- A hero the enemy already picked is never suggested.
- Ratings count S 10 · A 7 · B 5 · C 3 · D 1. Unrated matchups are skipped, not counted as B.
- A jungler's score is its average rating, pulled toward 5 (even) when only a few matchups are rated.
- A jungler is recommended only when it's rated against at least half of the enemies entered. Otherwise the app shows "Not enough ratings" and the best partly rated options.

## Updating the roster

When a new hero releases, add them to their lane list(s) in `heroes.js` and add their portrait file to `IMAGE_FILES`, then run `npm test`.
