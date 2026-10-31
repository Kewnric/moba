// JunglerOS draft board: enemy picks, bans, optionally your team, and the order slots get filled.
// Plain functions that return new drafts, shared by the Draft screen and the tests.
import { LANES } from '../data/heroes.js';
import { COMFORT_WEIGHTS, DEFAULT_COMFORT_WEIGHT } from './scoring.js';
import { DEFAULT_THEME, THEME_IDS } from '../data/themes.js';

export const TEAM_SIZE = 5;
export const BAN_OPTIONS = [0, 3, 4, 5];

const GROUPS = ['ally', 'enemy', 'allyBans', 'enemyBans'];
// Up to three bans per team come before the first pick; any more come after the first six picks.
const FIRST_BAN_WAVE = 3;

const emptySlots = (count) => Array(count).fill(null);
const replaceAt = (slots, index, value) => slots.map((slot, i) => (i === index ? value : slot));
const opponent = (team) => (team === 'ally' ? 'enemy' : 'ally');
const bansOf = (team) => `${team}Bans`;

export function createDraft({ bansPerTeam = 5, firstPick = 'ally' } = {}) {
  return {
    firstPick,
    bansPerTeam,
    ally: emptySlots(TEAM_SIZE),
    enemy: emptySlots(TEAM_SIZE),
    allyBans: emptySlots(bansPerTeam),
    enemyBans: emptySlots(bansPerTeam),
    enemyJungler: null,
    lockedJungler: null,
  };
}

export const unavailableIds = (draft) => GROUPS.flatMap((group) => draft[group].filter(Boolean));

export const isBanSlot = (slot) => Boolean(slot) && slot.group.endsWith('Bans');

// The enemy jungler stays marked only while that hero is still an enemy pick.
const keepEnemyJungler = (draft) =>
  (draft.enemyJungler && !draft.enemy.includes(draft.enemyJungler) ? { ...draft, enemyJungler: null } : draft);

// Puts a hero in a slot, unless that hero is already picked or banned in another slot.
export function setSlot(draft, { group, index }, heroId) {
  if (draft[group][index] === heroId) return draft;
  const takenElsewhere = GROUPS.some((other) =>
    draft[other].some((slot, i) => slot === heroId && !(other === group && i === index)));
  if (takenElsewhere) return draft;
  return keepEnemyJungler({ ...draft, [group]: replaceAt(draft[group], index, heroId) });
}

export const clearSlot = (draft, { group, index }) =>
  keepEnemyJungler({ ...draft, [group]: replaceAt(draft[group], index, null) });

export function setBansPerTeam(draft, count) {
  const resize = (bans) => Array.from({ length: count }, (_, i) => bans[i] || null);
  return { ...draft, bansPerTeam: count, allyBans: resize(draft.allyBans), enemyBans: resize(draft.enemyBans) };
}

export const setFirstPick = (draft, team) => ({ ...draft, firstPick: team });

// Marks which enemy is their jungler; marking the same hero again clears it. Only you ever set this.
export const toggleEnemyJungler = (draft, heroId) => ({ ...draft, enemyJungler: draft.enemyJungler === heroId ? null : heroId });

// Locks in the jungler you're playing, which turns the sheet into their game plan. Null goes back to choosing.
export const setLockedJungler = (draft, heroId) => ({ ...draft, lockedJungler: heroId || null });

export const clearAllyPicks = (draft) => ({ ...draft, ally: emptySlots(TEAM_SIZE) });

const isSameSlot = (a, b) => a.group === b.group && a.index === b.index;

// Moves the hero in one slot to another, swapping with any hero already there, across teams and bans.
export function moveBetweenSlots(draft, from, to) {
  const moving = draft[from.group][from.index];
  if (isSameSlot(from, to) || !moving) return draft;
  const displaced = draft[to.group][to.index] || null;

  const next = { ...draft };
  const writable = (group) => {
    if (next[group] === draft[group]) next[group] = [...draft[group]];
    return next[group];
  };
  writable(from.group)[from.index] = displaced;
  writable(to.group)[to.index] = moving;
  return keepEnemyJungler(next);
}

// The slot holding the hero added most recently and still there. Walks back through earlier versions of the
// draft, and without any history falls back to the last filled slot.
export function lastAddedSlot(draft, history = []) {
  let newer = draft;
  for (let step = history.length - 1; step >= 0; step -= 1) {
    const older = history[step];
    for (const group of GROUPS) {
      for (let index = 0; index < newer[group].length; index += 1) {
        const heroId = newer[group][index];
        if (heroId && older[group][index] !== heroId && draft[group][index] === heroId) return { group, index };
      }
    }
    newer = older;
  }
  for (const group of ['enemy', 'ally', 'enemyBans', 'allyBans']) {
    for (let index = draft[group].length - 1; index >= 0; index -= 1) {
      if (draft[group][index]) return { group, index };
    }
  }
  return null;
}

// Teammates whose only lane is jungle. When one of them is picked, you probably aren't the one jungling.
export const findAllyJunglers = (draft, lanesOf) =>
  draft.ally.filter((heroId) => {
    if (!heroId) return false;
    const lanes = lanesOf(heroId);
    return lanes.length === 1 && lanes[0] === LANES.JUNGLE;
  });

// Ranked draft order: bans alternate from the first-pick team, picks go 1-2-2-2-2-1, and bans beyond
// the first three per team happen after the first six picks.
function draftSteps(draft) {
  const first = draft.firstPick;
  const second = opponent(first);
  const bans = (from, to) => {
    const steps = [];
    for (let i = from; i < to; i += 1) steps.push(bansOf(first), bansOf(second));
    return steps;
  };
  const firstWave = Math.min(FIRST_BAN_WAVE, draft.bansPerTeam);
  return [
    ...bans(0, firstWave),
    first, second, second, first, first, second,
    ...bans(firstWave, draft.bansPerTeam),
    second, first, first, second,
  ];
}

// The slot the next hero should go into, or null when the draft is full. In an enemy-only draft that's
// simply the next enemy pick. With both teams it follows ranked order, and bans are optional: once more
// picks are entered than come before a ban step, that ban step is skipped.
export function nextSlot(draft, { enemyOnly = false } = {}) {
  if (enemyOnly) {
    const index = draft.enemy.indexOf(null);
    return index === -1 ? null : { group: 'enemy', index };
  }
  const filled = Object.fromEntries(GROUPS.map((group) => [group, draft[group].filter(Boolean).length]));
  const picksFilled = filled.ally + filled.enemy;
  const needed = { ally: 0, enemy: 0, allyBans: 0, enemyBans: 0 };
  let picksBefore = 0;

  for (const group of draftSteps(draft)) {
    needed[group] += 1;
    if (group.endsWith('Bans')) {
      if (picksFilled > picksBefore) continue;
    } else {
      picksBefore += 1;
    }
    if (filled[group] < needed[group]) return { group, index: draft[group].indexOf(null) };
  }
  return null;
}

// The next empty ban slot, alternating teams, so bans can be entered in one go. Null when they're full.
export function nextBanSlot(draft) {
  const groups = [bansOf(draft.firstPick), bansOf(opponent(draft.firstPick))];
  for (let index = 0; index < draft.bansPerTeam; index += 1) {
    for (const group of groups) {
      if (!draft[group][index]) return { group, index };
    }
  }
  return null;
}

const isSlotList = (value, length) =>
  Array.isArray(value) && value.length === length && value.every((slot) => slot === null || typeof slot === 'string');

export const isDraft = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  (value.firstPick === 'ally' || value.firstPick === 'enemy') &&
  BAN_OPTIONS.includes(value.bansPerTeam) &&
  isSlotList(value.ally, TEAM_SIZE) &&
  isSlotList(value.enemy, TEAM_SIZE) &&
  isSlotList(value.allyBans, value.bansPerTeam) &&
  isSlotList(value.enemyBans, value.bansPerTeam);

// Settings remembered between sessions: how drafts start (your team, bans, first pick), how scores and the list
// work (comfort weight, your pool, safe picks), the color theme, and voice control (mic, language, taught words).
export const DEFAULT_DRAFT_PREFERENCES = {
  enemyOnly: true,
  banPhase: true,
  bansPerTeam: 5,
  firstPick: 'ally',
  comfortWeight: DEFAULT_COMFORT_WEIGHT,
  onlyPool: false,
  safeOnly: false,
  theme: DEFAULT_THEME,
  micDeviceId: '',
  voiceLang: 'en-US',
  voiceAliases: {},
};

const isOptional = (value, check) => value === undefined || check(value);
const isBoolean = (value) => typeof value === 'boolean';
const isTextMap = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every((item) => typeof item === 'string');

// Settings added later are optional, so preferences saved before them still load.
export const isDraftPreferences = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof value.banPhase === 'boolean' &&
  BAN_OPTIONS.includes(value.bansPerTeam) &&
  value.bansPerTeam > 0 &&
  (value.firstPick === 'ally' || value.firstPick === 'enemy') &&
  isOptional(value.enemyOnly, isBoolean) &&
  isOptional(value.onlyPool, isBoolean) &&
  isOptional(value.safeOnly, isBoolean) &&
  isOptional(value.comfortWeight, (weight) => COMFORT_WEIGHTS.includes(weight)) &&
  isOptional(value.theme, (theme) => THEME_IDS.includes(theme)) &&
  isOptional(value.micDeviceId, (id) => typeof id === 'string') &&
  isOptional(value.voiceLang, (lang) => typeof lang === 'string') &&
  isOptional(value.voiceAliases, isTextMap);

// Adds defaults for any setting missing from saved preferences, and drops settings that no longer exist.
export const normalizeDraftPreferences = (preferences) =>
  Object.fromEntries(Object.keys(DEFAULT_DRAFT_PREFERENCES).map((key) => [key, preferences && preferences[key] !== undefined ? preferences[key] : DEFAULT_DRAFT_PREFERENCES[key]]));

export const draftFromPreferences = ({ banPhase, bansPerTeam, firstPick }) =>
  createDraft({ bansPerTeam: banPhase ? bansPerTeam : 0, firstPick });
