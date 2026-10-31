# JunglerOS

A Mobile Legends: Bang Bang draft sheet for junglers. Add the enemy picks as they lock in and JunglerOS ranks every jungler you play, scored only from your own tier lists and comfort. There are no win rates, no meta stats and nothing else behind the numbers.

## Use it

- **Online:** https://kewnric.github.io/moba/
- **Offline:** open `index.html` from this folder. It's a single self-contained file; hero portraits still need an internet connection.

## How scores work

Every number on the stat sheet comes from data you entered, and the sheet shows the math.

| Part | Value |
| --- | --- |
| Each enemy pick | Your tier for that matchup: S 100, A 75, B 50, C 25, D 0. Unrated counts as 50 (Even). |
| Matchups | The average of the enemy picks. A hero you mark **JG** as their jungler counts 1.5 times. |
| Comfort | Your 1 to 5 rating: 0, 25, 50, 75 or 100. Not set counts as 50. |
| **Viability** | Matchups × 70% + comfort × 30%. Change the split in Settings. |

The total rounds to a tier the same way: 88+ S, 63+ A, 38+ B, 13+ C, below that D.

**Risk never changes a score.** It's listed next to the score so you can plan around it: how many heroes you rated Countered (D) are still open, shown as None (0), Low (1-3), Medium (4-8) or High (9+). Once the enemy has five picks, it drops to none.

Nothing is ranked or recommended until the first enemy pick, because there's nothing to score against yet.

## Draft

- The draft is **enemy-only** by default. Turn on **Your team** to add your team's slots and follow ranked pick order. Turning it off clears your team's picks; Undo brings them back.
- Tap a slot, then tap a hero. You can also type a name and press Enter to add the top match. On phones the hero list opens as a full-screen sheet.
- With a mouse you can drag a hero onto any slot, drag between slots to move or swap heroes, and drag a slot back onto the hero list to remove it.
- **Bans** are optional. Tap a ban slot to enter them in one go; while you do, the list suggests the heroes that counter the most junglers you play. Banned heroes are never suggested.
- **They have** lists the skill groups in the enemy lineup.
- **Enemy picks stay as five slots, pinned at the top** while you scroll. Under them, the **stat sheet** starts with a hexagon of your options: your six best junglers, each corner showing the hero's name above their score. Tap a corner to see that jungler. Below that are the ID card with the total, every enemy score with where it came from, your notes and the risk. Tap a letter on the sheet to fix a rating on the spot.
- **All junglers** lists everyone, not just the top few, with their score, risk and a tier chip per enemy. Sort by best score, lowest risk, comfort or name, filter by role, **My pool** or **Safe picks** (hides any jungler with a D against this lineup), or switch to **Tiers** for a live tier list of this draft. Tap a jungler to open them on the sheet. If they're outside your top six, they take the hexagon's last corner.
- **Lock in** a jungler to swap the sheet for their **game plan**: your tips and notes for each enemy, what they bring, and what can still counter you. **Change pick** goes back.
- After the game, tap **Won** or **Lost** on the sheet to log the jungler shown there.
- On PC, start typing anywhere to search and press Enter to add the top match. Keys 1 to 5 choose an enemy slot, and Ctrl+Z undoes.

## Voice control

Turn on **Voice** on the draft board and say hero names to fill slots. It needs a browser with speech recognition, such as Chrome or Edge.

| Say | What happens |
| --- | --- |
| Lancelot, or "they picked Lancelot" | Fills the next slot |
| Lancelot and Ling | Fills two slots |
| Ban Lancelot | Fills the next ban |
| Undo | Takes back the last change |
| Erase, or "remove last" | Removes the last hero added |
| Remove Ling | Removes that hero |
| Lancelot is their jungler | Marks them JG |
| Lock in, or "lock in Ling" | Opens the game plan |
| Unlock | Goes back to choosing |
| New draft | Starts a fresh draft |
| Stop listening | Turns voice off |

Speech recognition spells hero names as whatever English it hears ("Aldo card" for Alucard, "Argos" for Argus), so anything that isn't an everyday word goes to the hero it sounds closest to. When a guess might be wrong, or nothing is close enough to act on, **Did you mean** buttons show the nearest heroes. Tapping one fixes the pick and remembers that phrase. Everyday words and normal sentences are ignored.

For voice, use the online version. Browsers don't remember mic permission for a page opened from a file, so the file version asks each time you turn voice on. Your tier lists are saved separately for each, so export a backup from one and restore it in the other.

Where the browser offers one, **Settings > Voice and mic** can download an offline voice pack. It listens on your device and is told every hero's name first.

While voice is on, your browser sends mic audio to its own speech service to turn it into text. JunglerOS doesn't record or keep any of it.

**Settings > Voice and mic** has a mic tester: choose your mic, see which one is in use, and watch a live volume bar move as you talk. **Try a command** shows what it understood without touching your draft.

## Tier lists

Each jungler has its own S to D board.

- Drag a **skill group** onto a tier, or tap its letter, to rate every hero in it at once. Drag a hero to rate just that hero.
- A hero's tier comes from your direct rating first, then its groups. In two rated groups, the worse tier wins. Dashed heroes get their tier from a group.
- Adding a hero to a group later rates that hero for every jungler who has rated the group.
- Tap a hero to open its matchup: tier, quick tip and long note.
- **Copy from** starts a jungler from another jungler's list, which is handy when they play alike. **Clear** resets the list and keeps your notes.
- **Select** several heroes, then tap a tier or drag any one of them to move them all. Ctrl+click also starts a selection.
- **Undo** (or Ctrl+Z) takes back the last change to your tier lists, comfort, notes or skill groups.
- **Set comfort** shows every jungler's comfort on one screen.
- A jungler never gets a rating against themselves.

## Skills

Skill groups are yours to shape. A new save starts with the ones you asked for:

| Category | Group | Heroes |
| --- | --- | --- |
| Movement | Blink skills | Harley, Roger, Moskov |
| Movement | Dash skills | Hirara, Obsidia |
| Evasion | I-frame skills | Hirara, Roger, Lancelot |
| Threat | Close-range burst | Paquito, Eudora |

Create, rename, recategorize or delete groups, tap heroes in and out, and set one tier per jungler for a whole group from the same screen. A hero can be in as many groups as you like. **Bulk add** fills a group with every hero of a role, speciality or lane in one go; it only fills the list and never rates anyone.

## History

- Your record, win rate, and each jungler's record.
- Your win rate on the top pick compared with other picks.
- Your record against each skill group, toughest first.
- **Tiers to review**: after 3 games with the same jungler against the same enemy, matchups you haven't rated, or rated two or more tiers away from your results, are listed with a one-tap fix. Win rates map to tiers as 70%+ S, 55%+ A, 45%+ B, 30%+ C, below that D.
- Up to 500 games are kept.

## Themes

Ink, Midnight, Jungle, Crimson, Violet and Manga Paper. Switch from the top bar on PC or in Settings. Tier colors stay the same in every theme.

## Your saved data

Your roster, tier lists, skill groups, notes, comfort and game history are saved in the browser you use JunglerOS in. Settings exports them to a compact JSON backup named with the date and time. A backup from any version can be restored: you see what it contains first, then **Merge** it into your data (the backup wins where both rate the same thing) or **Replace** your data.

Saves from older versions upgrade automatically and keep all their ratings, and get the starter skill groups once. Delete those groups and they stay deleted.

## Develop

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm test` | Runs the Vitest tests in `tests/` |
| `npm run build` | Bundles `src/` into one file and writes it to `index.html` |

`index.html` in the repo root is generated. Change the files in `src/`, run `npm run build`, and commit the new `index.html` together with your change. CI fails if the two don't match, because GitHub Pages serves that file straight from `main`.

Needs Node 22 or newer.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/App.jsx` | App shell: saved data, scoring, navigation and dialogs |
| `src/views/` | The Draft, Tier lists, Skills, History and Settings screens |
| `src/components/` | Draft board, stat sheet, hexagon chart, ranking, hero picker, dialogs and shared controls |
| `src/lib/scoring.js` | Viability, risk, sorting and ban suggestions |
| `src/lib/skillGroups.js` | Which tier a jungler really has against a hero, given ratings and groups |
| `src/lib/draft.js` | Draft board: picks, bans and pick order |
| `src/lib/dataReducer.js` | Every change to your roster, ratings, groups, notes and comfort |
| `src/lib/saveData.js` | Saved-data format, upgrades from older saves, backup import and export |
| `src/lib/voice.js` | Turns what was heard into draft actions |
| `src/lib/heroSounds.js` | Finds the hero that something heard sounds closest to |
| `src/lib/mic.js` | Mic level maths for the mic tester |
| `src/lib/undoableData.js` | Undo history for saved-data changes |
| `src/lib/backupFile.js` | Backup file names, compact writing, and size and type checks before reading |
| `src/lib/history.js` | Recorded games, records by jungler and tiers to review |
| `src/lib/storage.js` | Browser saving that falls back safely when data is unreadable |
| `src/data/heroes.js` | All 133 heroes: id, lanes, official roles and specialities, portrait |
| `src/data/skillGroups.js` | Starter skill groups and name ideas |
| `src/data/heroAliases.js` | How speech recognition tends to spell each hero |
| `src/data/commonWords.js` | Everyday words that are never a guess at a hero |
| `src/data/themes.js` | The color theme list; the colors are in `src/index.css` |
| `src/data/tiers.js` | Tier labels, points and colors |
| `tests/` | Tests for scoring, skill groups, the draft board, saved data and hero data |

## Updating the roster

When a new hero releases, add a row for them in `src/data/heroes.js`. The `id` is the hero's name in lowercase with dashes (for example `yi-sun-shin`). Never change an existing id, because saved ratings use it. Then run `npm test` and `npm run build`.

## Credits

Hero portraits and game data © Moonton (Mobile Legends: Bang Bang). JunglerOS is a fan-made tool and isn't affiliated with Moonton.
