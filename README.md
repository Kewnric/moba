# JunglerOS

A Mobile Legends: Bang Bang draft helper for junglers. Enter both teams' picks and bans, and it recommends the jungler to play: from your own matchup ratings, Mythic win-rate stats, your team's composition, and the heroes you're comfortable on. Record each game's result and History shows which of your ratings your results disagree with.

## Use it

- **Online:** https://kewnric.github.io/moba/
- **Offline:** open `index.html` from this folder. It's a single self-contained file; hero portraits still need an internet connection.

## Using the draft board

- Tap a slot, then tap a hero. You can also type a name and press Enter to add the top match.
- With a mouse you can also drag a hero onto any slot, drag between slots to move or swap heroes, and drag a slot back onto the hero list to remove it.
- The highlighted slot moves on in ranked draft order: bans alternate starting with the team that picks first, picks go 1-2-2-2-2-1, and with more than three bans per team the extra bans come after the first six picks. You don't have to enter bans; they're skipped once picks move past them.
- The **Bans** switch turns the ban phase on or off, and JunglerOS remembers your choice. **Settings** on the board sets who picks first and how many bans each team gets; the Settings tab sets the defaults for new drafts.
- Each enemy's lane is guessed automatically. Change it with the menu under their slot.
- **Undo** reverses the last change and **New** starts a fresh draft. A refresh keeps the draft in the same tab.
- **Only my pool** limits the ranking to junglers you gave a comfort rating in Ratings.
- The recommendation lists your long notes for the enemies in the draft, and warns you when a teammate who only plays jungle has already picked.
- **After the game**, pick the hero you played and tap **Won** or **Lost** to save the draft to History.

## Rating matchups

- In **Ratings**, choose a jungler, then pick a tier and tap heroes to rate them, or drag heroes onto a tier row. The whole row, label included, accepts the drop.
- Drag a rated hero back onto the unrated list, or use **Unrate**, to remove its rating.
- Set a 1–5 **Comfort** rating for junglers you play; they make up your pool.

## How picks are ranked

Each available jungler gets a score out of 100:

| Part | Up to | What it measures |
| --- | --- | --- |
| Matchups | 45 | How it does against every enemy pick. Your tier ratings (S best, D worst) count fully. Matchups you haven't rated use Mythic win-rate stats at half weight, where +5 points or more is the best case. The enemy jungler counts 1.5 times. |
| Team fit | 20 | Once two teammates have picked: extra points for bringing a frontline, magic damage or crowd control your team is missing. Mythic duo win rates with the teammates already picked add or remove up to 5 points. |
| Comfort | 20 | Your 1–5 comfort rating on that jungler. Unrated junglers get the middle. |
| Meta | 15 | Mythic win rate over the last 15 days. 55% or higher gets full points; 45% or lower gets none. |
| Counter-pick risk | −10 | 2 points for each still-open hero that drops this jungler's win rate by 3 points or more, shrinking as the enemy fills its picks. |

- **Use** on the recommendation (also in Settings) switches what the score is based on:
  - **My ratings**: only your tier ratings. Win-rate stats, duo synergy and meta are off (meta counts as the middle for everyone), and counter-pick risk comes from open heroes you rated D.
  - **Both** (default): the table above. Where you rated a matchup, your rating also replaces the stats for counter-pick risk.
  - **Mythic stats**: only the stats, at full weight. Your tier ratings are off.
  - Comfort counts in every mode, because it's about what you can play rather than who counters whom.
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
| `src/views/` | The Draft, Ratings, History and Settings screens |
| `src/components/` | Draft board, recommendation, result recorder, hero pool, avatars, dialogs and the crash screen |
| `src/lib/history.js` | Recorded games, records by jungler and ratings to review |
| `src/lib/scoring.js` | The score out of 100 and the reasons behind it |
| `src/lib/draft.js` | Draft board: picks, bans, pick order and enemy lanes |
| `src/lib/dataReducer.js` | Every change to your roster, ratings, notes and comfort |
| `src/lib/saveData.js` | Saved-data format, upgrades from older saves, backup import and export |
| `src/lib/backupFile.js` | Backup file names, compact writing, and size and type checks before reading |
| `src/lib/stats.js` | Reads the matchup and win-rate snapshot |
| `src/lib/storage.js` | Browser saving that falls back safely when data is unreadable |
| `src/data/heroes.js` | All 133 heroes: id, lanes, official roles and specialities, portrait |
| `src/data/stats.js` | Generated Mythic stats snapshot |
| `scripts/update-stats.mjs` | Refreshes `src/data/stats.js` |
| `tests/` | Tests for scoring, the draft board, saved data and hero data |

## Your saved data

Your roster, ratings, notes, comfort ratings and game history are saved in the browser you use JunglerOS in. The Settings tab exports them to a compact JSON backup named with the date and time (a fully rated roster with 500 games is about 1.5 MB). It restores backups from any version of the app. Before reading a file, it checks that the file is a `.json` under 5 MB. Before a restore changes anything, it shows what the file contains and lets you **Merge** it into your data (the backup wins where both rate the same matchup) or **Replace** your data. A restore keeps the newest 500 games.

Heroes always show their official portraits. Custom icons from older versions are deleted from the browser, and skipped when an older backup is restored.

Saves are keyed by hero id, not display name. The first time this version opens, it upgrades an older name-based save automatically, leaves the old copy in place, and lists any names that didn't match a hero. When a new default jungler is added to JunglerOS, it's added to your roster once; junglers you removed stay removed.

## Updating the roster and stats

When a new hero releases, add a row for them in `src/data/heroes.js`. The `id` is the hero's name in lowercase with dashes (for example `yi-sun-shin`). Never change an existing id, because saved ratings use it. Then run `npm run update-stats`, `npm test` and `npm run build`.

Stats can come from another rank or window: `STATS_RANK=legend STATS_DAYS=30 npm run update-stats`.

## Credits

Matchup and win-rate stats are powered by the [Rone Arena API](https://arena.rone.dev). Game data © Moonton (Mobile Legends: Bang Bang). API maintained by ridwaanhall / RoneAI. JunglerOS is a fan-made tool and isn't affiliated with Moonton.
