import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createDraft,
  setSlot,
  clearSlot,
  unavailableIds,
  setBansPerTeam,
  setFirstPick,
  toggleEnemyJungler,
  setLockedJungler,
  clearAllyPicks,
  nextSlot,
  nextBanSlot,
  isDraft,
  moveBetweenSlots,
  DEFAULT_DRAFT_PREFERENCES,
  draftFromPreferences,
  isDraftPreferences,
  findAllyJunglers,
  normalizeDraftPreferences,
} from '../src/lib/draft.js';

const fill = (draft, group, ids) =>
  ids.reduce((next, id, index) => (id ? setSlot(next, { group, index }, id) : next), draft);

test('createDraft starts with five empty picks per team and the chosen number of bans', () => {
  const draft = createDraft({ bansPerTeam: 4, firstPick: 'enemy' });
  assert.deepEqual(draft.ally, [null, null, null, null, null]);
  assert.deepEqual(draft.enemy, [null, null, null, null, null]);
  assert.deepEqual(draft.allyBans, [null, null, null, null]);
  assert.deepEqual(draft.enemyBans, [null, null, null, null]);
  assert.equal(draft.enemyJungler, null);
  assert.equal(draft.firstPick, 'enemy');
});

test('createDraft defaults to Mythic bans with your team picking first', () => {
  const draft = createDraft();
  assert.equal(draft.bansPerTeam, 5);
  assert.equal(draft.firstPick, 'ally');
});

test('setSlot fills a slot without changing the previous draft', () => {
  const before = createDraft();
  const after = setSlot(before, { group: 'ally', index: 2 }, 'ling');
  assert.equal(after.ally[2], 'ling');
  assert.equal(before.ally[2], null);
});

test('setSlot refuses a hero already picked or banned anywhere else', () => {
  const draft = setSlot(createDraft(), { group: 'enemyBans', index: 0 }, 'ling');
  assert.equal(setSlot(draft, { group: 'ally', index: 0 }, 'ling'), draft);
});

test('setSlot replaces the hero already in that slot', () => {
  const draft = setSlot(createDraft(), { group: 'enemy', index: 0 }, 'ling');
  assert.equal(setSlot(draft, { group: 'enemy', index: 0 }, 'fanny').enemy[0], 'fanny');
});

test('unavailableIds lists every picked and banned hero', () => {
  let draft = fill(createDraft(), 'ally', ['tigreal']);
  draft = fill(draft, 'enemy', [null, 'ling']);
  draft = fill(draft, 'allyBans', ['fanny']);
  assert.deepEqual(unavailableIds(draft).sort(), ['fanny', 'ling', 'tigreal']);
});

test('clearSlot empties a slot and forgets that enemy was their jungler', () => {
  let draft = fill(createDraft(), 'enemy', ['chou']);
  draft = toggleEnemyJungler(draft, 'chou');
  draft = clearSlot(draft, { group: 'enemy', index: 0 });
  assert.equal(draft.enemy[0], null);
  assert.equal(draft.enemyJungler, null);
});

test('setLockedJungler locks in your pick, and null unlocks it', () => {
  const locked = setLockedJungler(createDraft(), 'ling');
  assert.equal(locked.lockedJungler, 'ling');
  assert.equal(setLockedJungler(locked, null).lockedJungler, null);
});

test('toggleEnemyJungler marks one enemy, and marking them again clears it', () => {
  let draft = fill(createDraft(), 'enemy', ['chou', 'ling']);
  draft = toggleEnemyJungler(draft, 'chou');
  assert.equal(draft.enemyJungler, 'chou');
  draft = toggleEnemyJungler(draft, 'ling');
  assert.equal(draft.enemyJungler, 'ling');
  assert.equal(toggleEnemyJungler(draft, 'ling').enemyJungler, null);
});

test('clearAllyPicks empties your team and leaves everything else', () => {
  let draft = fill(createDraft(), 'ally', ['ling', 'fanny']);
  draft = fill(draft, 'enemy', ['chou']);
  const next = clearAllyPicks(draft);
  assert.deepEqual(next.ally, [null, null, null, null, null]);
  assert.equal(next.enemy[0], 'chou');
});

test('setBansPerTeam keeps the bans that still fit', () => {
  let draft = fill(createDraft({ bansPerTeam: 5 }), 'allyBans', ['ling', null, null, null, 'fanny']);
  draft = setBansPerTeam(draft, 3);
  assert.equal(draft.bansPerTeam, 3);
  assert.deepEqual(draft.allyBans, ['ling', null, null]);
  assert.deepEqual(draft.enemyBans, [null, null, null]);
});

test('setFirstPick switches which team picks first', () => {
  assert.equal(setFirstPick(createDraft(), 'enemy').firstPick, 'enemy');
});

const LANES_OF = {
  balmond: ['Exp Lane', 'Jungling'],
  ling: ['Jungling'],
  fanny: ['Jungling'],
  saber: ['Roaming', 'Jungling'],
  chou: ['Roaming', 'Exp Lane'],
  tigreal: ['Roaming'],
};
const lanesOf = (heroId) => LANES_OF[heroId] || [];

test('nextSlot starts with the first ban of the team that picks first', () => {
  assert.deepEqual(nextSlot(createDraft()), { group: 'allyBans', index: 0 });
  assert.deepEqual(nextSlot(createDraft({ firstPick: 'enemy' })), { group: 'enemyBans', index: 0 });
});

test('nextSlot alternates the first three bans, then moves to the first pick', () => {
  let draft = fill(createDraft(), 'allyBans', ['a1']);
  assert.deepEqual(nextSlot(draft), { group: 'enemyBans', index: 0 });
  draft = fill(draft, 'enemyBans', ['e1', 'e2', 'e3']);
  draft = fill(draft, 'allyBans', ['a1', 'a2', 'a3']);
  assert.deepEqual(nextSlot(draft), { group: 'ally', index: 0 });
});

test('nextSlot follows the 1-2-2-2-2-1 pick order', () => {
  let draft = createDraft({ bansPerTeam: 0 });
  const order = [];
  for (let step = 0; step < 10; step += 1) {
    const slot = nextSlot(draft);
    order.push(slot.group);
    draft = setSlot(draft, slot, `hero-${step}`);
  }
  assert.deepEqual(order, ['ally', 'enemy', 'enemy', 'ally', 'ally', 'enemy', 'enemy', 'ally', 'ally', 'enemy']);
  assert.equal(nextSlot(draft), null);
});

test('nextSlot runs the last two bans after the first six picks', () => {
  let draft = fill(createDraft({ bansPerTeam: 5 }), 'allyBans', ['a1', 'a2', 'a3']);
  draft = fill(draft, 'enemyBans', ['e1', 'e2', 'e3']);
  draft = fill(draft, 'ally', ['p1', 'p2', 'p3']);
  draft = fill(draft, 'enemy', ['p4', 'p5', 'p6']);
  assert.deepEqual(nextSlot(draft), { group: 'allyBans', index: 3 });
});

test('nextSlot skips bans nobody entered once picks have moved past them', () => {
  let draft = fill(createDraft({ bansPerTeam: 5 }), 'ally', ['p1']);
  assert.deepEqual(nextSlot(draft), { group: 'enemy', index: 0 });
  draft = fill(draft, 'ally', ['p1', 'p2', 'p3', 'p4']);
  draft = fill(draft, 'enemy', ['p5', 'p6', 'p7']);
  assert.deepEqual(nextSlot(draft), { group: 'enemy', index: 3 });
});

test('nextSlot fills gaps left by picks entered out of order', () => {
  const draft = fill(createDraft({ bansPerTeam: 0 }), 'enemy', [null, null, 'ling']);
  assert.deepEqual(nextSlot(draft), { group: 'ally', index: 0 });
});

test('nextSlot uses a single ban wave with three bans or fewer', () => {
  let draft = fill(createDraft({ bansPerTeam: 3, firstPick: 'enemy' }), 'enemyBans', ['e1', 'e2', 'e3']);
  draft = fill(draft, 'allyBans', ['a1', 'a2']);
  assert.deepEqual(nextSlot(draft), { group: 'allyBans', index: 2 });
});

test('in an enemy-only draft the next slot is always the next enemy pick', () => {
  let draft = createDraft({ bansPerTeam: 5 });
  assert.deepEqual(nextSlot(draft, { enemyOnly: true }), { group: 'enemy', index: 0 });
  draft = fill(draft, 'enemy', ['a', null, 'c']);
  assert.deepEqual(nextSlot(draft, { enemyOnly: true }), { group: 'enemy', index: 1 });
  draft = fill(draft, 'enemy', ['a', 'b', 'c', 'd', 'e']);
  assert.equal(nextSlot(draft, { enemyOnly: true }), null);
});

test('nextBanSlot alternates teams from the first-pick team until the bans are full', () => {
  let draft = createDraft({ bansPerTeam: 3, firstPick: 'enemy' });
  assert.deepEqual(nextBanSlot(draft), { group: 'enemyBans', index: 0 });
  draft = fill(draft, 'enemyBans', ['a']);
  assert.deepEqual(nextBanSlot(draft), { group: 'allyBans', index: 0 });
  draft = fill(draft, 'allyBans', ['b', 'c', 'd']);
  draft = fill(draft, 'enemyBans', ['a', 'e', 'f']);
  assert.equal(nextBanSlot(draft), null);
});

test('moveBetweenSlots moves a hero into an empty slot', () => {
  const draft = fill(createDraft(), 'ally', ['ling']);
  const next = moveBetweenSlots(draft, { group: 'ally', index: 0 }, { group: 'ally', index: 3 });
  assert.deepEqual(next.ally, [null, null, null, 'ling', null]);
  assert.deepEqual(draft.ally, ['ling', null, null, null, null]);
});

test('moveBetweenSlots swaps two filled slots, even across teams and bans', () => {
  let draft = fill(createDraft(), 'ally', ['ling']);
  draft = fill(draft, 'enemyBans', ['fanny']);
  const next = moveBetweenSlots(draft, { group: 'ally', index: 0 }, { group: 'enemyBans', index: 0 });
  assert.equal(next.ally[0], 'fanny');
  assert.equal(next.enemyBans[0], 'ling');
});

test('moveBetweenSlots forgets their jungler when that hero leaves the enemy picks', () => {
  let draft = fill(createDraft(), 'enemy', ['chou']);
  draft = toggleEnemyJungler(draft, 'chou');
  const next = moveBetweenSlots(draft, { group: 'enemy', index: 0 }, { group: 'enemyBans', index: 0 });
  assert.equal(next.enemyBans[0], 'chou');
  assert.equal(next.enemy[0], null);
  assert.equal(next.enemyJungler, null);
});

test('moveBetweenSlots returns the same draft for the same slot or an empty source', () => {
  const draft = fill(createDraft(), 'ally', ['ling']);
  assert.equal(moveBetweenSlots(draft, { group: 'ally', index: 0 }, { group: 'ally', index: 0 }), draft);
  assert.equal(moveBetweenSlots(draft, { group: 'ally', index: 1 }, { group: 'ally', index: 2 }), draft);
});

test('draft preferences default to enemy-only, a 5-ban phase, 30 percent comfort and the Ink theme', () => {
  const { enemyOnly, banPhase, bansPerTeam, firstPick, comfortWeight, onlyPool, safeOnly, theme, micDeviceId, voiceLang, voiceAliases } = DEFAULT_DRAFT_PREFERENCES;
  assert.deepEqual({ enemyOnly, banPhase, bansPerTeam, firstPick, comfortWeight, onlyPool, safeOnly, theme }, { enemyOnly: true, banPhase: true, bansPerTeam: 5, firstPick: 'ally', comfortWeight: 30, onlyPool: false, safeOnly: false, theme: 'ink' });
  assert.deepEqual({ micDeviceId, voiceLang, voiceAliases }, { micDeviceId: '', voiceLang: 'en-US', voiceAliases: {} });
});

test('isDraftPreferences checks the settings added later only when they are saved', () => {
  const old = { banPhase: true, bansPerTeam: 5, firstPick: 'ally', ratingSource: 'mine' };
  assert.equal(isDraftPreferences(old), true);
  assert.equal(isDraftPreferences({ ...old, enemyOnly: 'yes' }), false);
  assert.equal(isDraftPreferences({ ...old, comfortWeight: 33 }), false);
  assert.equal(isDraftPreferences({ ...old, comfortWeight: 40 }), true);
  assert.equal(isDraftPreferences({ ...old, theme: 'jungle' }), true);
  assert.equal(isDraftPreferences({ ...old, theme: 'nope' }), false);
  assert.equal(isDraftPreferences({ ...old, voiceAliases: 'nope' }), false);
  assert.equal(isDraftPreferences({ ...old, voiceAliases: { funny: 'fanny' } }), true);
});

test('normalizeDraftPreferences fills in new settings and drops the old rating source', () => {
  assert.deepEqual(
    normalizeDraftPreferences({ banPhase: false, bansPerTeam: 4, firstPick: 'enemy', ratingSource: 'both' }),
    { ...DEFAULT_DRAFT_PREFERENCES, banPhase: false, bansPerTeam: 4, firstPick: 'enemy' },
  );
});

test('draftFromPreferences uses the saved ban count and first pick', () => {
  const draft = draftFromPreferences({ banPhase: true, bansPerTeam: 3, firstPick: 'enemy' });
  assert.equal(draft.bansPerTeam, 3);
  assert.deepEqual(draft.allyBans, [null, null, null]);
  assert.equal(draft.firstPick, 'enemy');
});

test('draftFromPreferences leaves out bans when the ban phase is off', () => {
  const draft = draftFromPreferences({ banPhase: false, bansPerTeam: 4, firstPick: 'ally' });
  assert.equal(draft.bansPerTeam, 0);
  assert.deepEqual(draft.allyBans, []);
  assert.deepEqual(nextSlot(draft), { group: 'ally', index: 0 });
});

test('isDraftPreferences accepts saved preferences and rejects broken ones', () => {
  assert.equal(isDraftPreferences(DEFAULT_DRAFT_PREFERENCES), true);
  assert.equal(isDraftPreferences({ banPhase: false, bansPerTeam: 4, firstPick: 'enemy' }), true);
  assert.equal(isDraftPreferences({ banPhase: 'yes', bansPerTeam: 4, firstPick: 'enemy' }), false);
  assert.equal(isDraftPreferences({ banPhase: true, bansPerTeam: 0, firstPick: 'ally' }), false);
  assert.equal(isDraftPreferences({ banPhase: true, bansPerTeam: 5, firstPick: 'both' }), false);
  assert.equal(isDraftPreferences(null), false);
});

test('findAllyJunglers lists teammates who only play jungle', () => {
  const draft = fill(createDraft(), 'ally', ['tigreal', 'ling', 'balmond']);
  assert.deepEqual(findAllyJunglers(draft, lanesOf), ['ling']);
});

test('findAllyJunglers is empty when no teammate is a dedicated jungler', () => {
  assert.deepEqual(findAllyJunglers(fill(createDraft(), 'ally', ['chou', 'saber']), lanesOf), []);
  assert.deepEqual(findAllyJunglers(createDraft(), lanesOf), []);
});

test('isDraft accepts a saved draft and rejects broken ones', () => {
  assert.equal(isDraft(createDraft()), true);
  assert.equal(isDraft(JSON.parse(JSON.stringify(fill(createDraft(), 'ally', ['ling'])))), true);
  assert.equal(isDraft({ ...createDraft(), ally: ['ling'] }), false);
  assert.equal(isDraft({ ...createDraft(), bansPerTeam: 2 }), false);
  assert.equal(isDraft(null), false);
});
