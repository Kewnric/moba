// JunglerOS draft board: both teams' picks and bans, enemy lanes, and the order slots get filled.
// Plain functions that return new drafts, shared by the Draft Lab and the tests.
import { LANES } from '../data/heroes.js';

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
    enemyLanes: emptySlots(TEAM_SIZE),
  };
}

export const unavailableIds = (draft) => GROUPS.flatMap((group) => draft[group].filter(Boolean));

// Puts a hero in a slot, unless that hero is already picked or banned in another slot.
export function setSlot(draft, { group, index }, heroId) {
  if (draft[group][index] === heroId) return draft;
  const takenElsewhere = GROUPS.some((other) =>
    draft[other].some((slot, i) => slot === heroId && !(other === group && i === index)));
  if (takenElsewhere) return draft;
  return { ...draft, [group]: replaceAt(draft[group], index, heroId) };
}

export function clearSlot(draft, { group, index }) {
  const next = { ...draft, [group]: replaceAt(draft[group], index, null) };
  if (group === 'enemy') next.enemyLanes = replaceAt(draft.enemyLanes, index, null);
  return next;
}

export function setBansPerTeam(draft, count) {
  const resize = (bans) => Array.from({ length: count }, (_, i) => bans[i] || null);
  return { ...draft, bansPerTeam: count, allyBans: resize(draft.allyBans), enemyBans: resize(draft.enemyBans) };
}

export const setFirstPick = (draft, team) => ({ ...draft, firstPick: team });

// Sets the lane an enemy plays; null goes back to guessing it.
export const setEnemyLane = (draft, index, lane) => ({ ...draft, enemyLanes: replaceAt(draft.enemyLanes, index, lane || null) });

const isSameSlot = (a, b) => a.group === b.group && a.index === b.index;

// Moves the hero in one slot to another, swapping with any hero already there, across teams and bans.
// A lane you set stays with its enemy hero, and is dropped when that hero leaves the enemy picks.
export function moveBetweenSlots(draft, from, to) {
  const moving = draft[from.group][from.index];
  if (isSameSlot(from, to) || !moving) return draft;
  const displaced = draft[to.group][to.index] || null;
  const laneAt = (slot) => (slot.group === 'enemy' ? draft.enemyLanes[slot.index] : null);

  const next = { ...draft };
  const writable = (group) => {
    if (next[group] === draft[group]) next[group] = [...draft[group]];
    return next[group];
  };
  writable(from.group)[from.index] = displaced;
  writable(to.group)[to.index] = moving;

  const lanes = [...draft.enemyLanes];
  if (from.group === 'enemy') lanes[from.index] = displaced && to.group === 'enemy' ? laneAt(to) : null;
  if (to.group === 'enemy') lanes[to.index] = from.group === 'enemy' ? laneAt(from) : null;
  next.enemyLanes = lanes;
  return next;
}

// Keeps the lanes you set and guesses the rest: heroes with fewer possible lanes choose first, each
// taking the first of their lanes nobody has yet, or their main lane when all of them are taken.
export function resolveEnemyLanes(draft, lanesOf) {
  const lanes = draft.enemy.map((heroId, index) => (heroId ? draft.enemyLanes[index] : null));
  const claimed = new Set(lanes.filter(Boolean));
  draft.enemy
    .map((heroId, index) => ({ heroId, index, options: heroId ? lanesOf(heroId) : [] }))
    .filter(({ heroId, index }) => heroId && !lanes[index])
    .sort((a, b) => a.options.length - b.options.length || a.index - b.index)
    .forEach(({ index, options }) => {
      const lane = options.find((option) => !claimed.has(option)) || options[0] || null;
      lanes[index] = lane;
      if (lane) claimed.add(lane);
    });
  return lanes;
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

// The slot the next hero should go into, or null when the draft is full. Bans are optional: once more
// picks are entered than come before a ban step, that ban step is skipped.
export function nextSlot(draft) {
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

const isSlotList = (value, length) =>
  Array.isArray(value) && value.length === length && value.every((slot) => slot === null || typeof slot === 'string');

export const isDraft = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  (value.firstPick === 'ally' || value.firstPick === 'enemy') &&
  BAN_OPTIONS.includes(value.bansPerTeam) &&
  isSlotList(value.ally, TEAM_SIZE) &&
  isSlotList(value.enemy, TEAM_SIZE) &&
  isSlotList(value.enemyLanes, TEAM_SIZE) &&
  isSlotList(value.allyBans, value.bansPerTeam) &&
  isSlotList(value.enemyBans, value.bansPerTeam);

// Draft settings remembered between drafts: whether there's a ban phase, how many bans each team gets
// when there is one, and which team picks first in a new draft.
export const DEFAULT_DRAFT_PREFERENCES = { banPhase: true, bansPerTeam: 5, firstPick: 'ally' };

export const isDraftPreferences = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof value.banPhase === 'boolean' &&
  BAN_OPTIONS.includes(value.bansPerTeam) &&
  value.bansPerTeam > 0 &&
  (value.firstPick === 'ally' || value.firstPick === 'enemy');

export const draftFromPreferences = ({ banPhase, bansPerTeam, firstPick }) =>
  createDraft({ bansPerTeam: banPhase ? bansPerTeam : 0, firstPick });
