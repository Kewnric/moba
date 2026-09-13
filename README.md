# JunglerOS

A Mobile Legends: Bang Bang draft helper for junglers. Enter both teams' picks and bans, and it recommends the jungler to play: from your own matchup ratings, Mythic win-rate stats, your team's composition, and the heroes you're comfortable on. Record each game's result and History shows which of your ratings your results disagree with.

## Use it

- **Online:** https://kewnric.github.io/moba/
- **Offline:** open `index.html` from this folder. It's a single self-contained file; hero portraits still need an internet connection.

## Using the draft board

- Tap a slot, then tap a hero. You can also type a name and press Enter to add the top match.
- The highlighted slot moves on in ranked draft order: bans alternate starting with the team that picks first, picks go 1-2-2-2-2-1, and with more than three bans per team the extra bans come after the first six picks. You don't have to enter bans; they're skipped once picks move past them.
- **Settings** sets who picks first and how many bans each team gets.
- Each enemy's lane is guessed automatically. Change it with the menu under their slot.
- **Undo** reverses the last change and **New** starts a fresh draft. A refresh keeps the draft in the same tab.
- **Only my pool** limits the ranking to junglers you gave a comfort rating in Ratings.
- **After the game**, pick the hero you played and tap **Won** or **Lost** to save the draft to History.

## How picks are ranked

Each available jungler gets a score out of 100:

| Part | Up to | What it measures |
| --- | --- | --- |
| Matchups | 45 | How it does against every enemy pick. Your tier ratings (S best, D worst) count fully. Matchups you haven't rated use Mythic win-rate stats at half weight, where +5 points or more is the best case. The enemy jungler counts 1.5 times. |
| Team fit | 20 | Once two teammates have picked: extra points for bringing a frontline, magic damage or crowd control your team is missing. Mythic duo win rates with the teammates already picked add or remove up to 5 points. |
| Comfort | 20 | Your 1–5 comfort rating on that jungler. Unrated junglers get the middle. |
| Meta | 15 | Mythic win rate over the last 15 days. 55% or higher gets full points; 45% or lower gets none. |
| Counter-pick risk | −10 | 2 points for each still-open hero that drops this jungler's win rate by 3 points or more, shrinking as the enemy fills its picks. |

- Heroes picked by either team or banned are never suggested.
- A jungler is recommended once half the enemy picks have a rating or stats behind them.
- Before the enemy picks anything, Draft Lab ranks safe early picks instead.

## History

- Your overall record and win rate, and each jungler's record.
- Your win rate when you played the **top pick** compared with other picks. The top pick is the jungler JunglerOS ranked first for the final enemy lineup, with your own slot left open.
- **Ratings to review**: once you've played the same jungler against the same enemy at least 3 times, matchups you haven't rated, or rated two or more tiers away from your results, are listed with a one-tap fix. Win rates map to tiers as 70%+ S, 55%+ A, 45%+ B, 30%+ C, below that D.
- Recent games, each of which you can delete. Up to 500 games are kept.

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
| `npm run update-stats` | Downloads fresh Mythic matchup, teammate and win-rate stats into `src/data/stats.js` |

`index.html` in the repo root is generated. Change the files in `src/`, run `npm run build`, and commit the new `index.html` together with your change. CI fails if the two don't match, because GitHub Pages serves that file straight from `main`.

Needs Node 22 or newer.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/App.jsx` | App shell: saved data, scoring, navigation and dialogs |
| `src/views/` | The Draft Lab, Database, History, Assets and Data Hub screens |
| `src/components/` | Draft board, recommendation, result recorder, hero pool, avatars, dialogs and the crash screen |
| `src/lib/history.js` | Recorded games, records by jungler and ratings to review |
| `src/lib/scoring.js` | The score out of 100 and the reasons behind it |
| `src/lib/draft.js` | Draft board: picks, bans, pick order and enemy lanes |
| `src/lib/dataReducer.js` | Every change to your roster, ratings, notes and comfort |
| `src/lib/saveData.js` | Saved-data format, upgrades from older saves, backup import and export |
| `src/lib/stats.js` | Reads the matchup and win-rate snapshot |
| `src/lib/storage.js` | Browser saving that falls back safely when data is unreadable |
| `src/data/heroes.js` | All 133 heroes: id, lanes, official roles and specialities, portrait |
| `src/data/stats.js` | Generated Mythic stats snapshot |
| `scripts/update-stats.mjs` | Refreshes `src/data/stats.js` |
| `tests/` | Tests for scoring, the draft board, saved data and hero data |

## Your saved data

Your roster, ratings, notes, comfort ratings, custom icons and game history are saved in the browser you use JunglerOS in. Data Hub exports them to a backup file and restores backups from any version of the app. Before a restore changes anything, it shows what the file contains and lets you **Merge** it into your data (the backup wins where both rate the same matchup) or **Replace** your data.

Saves are keyed by hero id, not display name. The first time this version opens, it upgrades an older name-based save automatically, leaves the old copy in place, and lists any names that didn't match a hero. When a new default jungler is added to JunglerOS, it's added to your roster once; junglers you removed stay removed.

## Updating the roster and stats

When a new hero releases, add a row for them in `src/data/heroes.js`. The `id` is the hero's name in lowercase with dashes (for example `yi-sun-shin`). Never change an existing id, because saved ratings use it. Then run `npm run update-stats`, `npm test` and `npm run build`.

Stats can come from another rank or window: `STATS_RANK=legend STATS_DAYS=30 npm run update-stats`.

## Credits

Matchup and win-rate stats are powered by the [Rone Arena API](https://arena.rone.dev). Game data © Moonton (Mobile Legends: Bang Bang). API maintained by ridwaanhall / RoneAI. JunglerOS is a fan-made tool and isn't affiliated with Moonton.
