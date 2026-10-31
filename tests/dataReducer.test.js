import { test } from 'vitest';
import assert from 'node:assert/strict';
import { dataReducer } from '../src/lib/dataReducer.js';

// A frozen state throws if the reducer tries to change it in place.
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const savedState = () => deepFreeze({
  version: 2,
  junglers: ['ling', 'fanny'],
  matchups: { ling: { tigreal: { tier: 'A', quickNote: 'Kite ult' } } },
});

test('setTier rates a matchup without changing the previous state', () => {
  const before = savedState();
  const after = dataReducer(before, { type: 'setTier', junglerId: 'fanny', enemyId: 'miya', tier: 'S' });
  assert.deepEqual(after.matchups.fanny, { miya: { tier: 'S' } });
  assert.equal(before.matchups.fanny, undefined);
});

test('setTier keeps the notes already on a matchup', () => {
  const after = dataReducer(savedState(), { type: 'setTier', junglerId: 'ling', enemyId: 'tigreal', tier: 'C' });
  assert.deepEqual(after.matchups.ling.tigreal, { tier: 'C', quickNote: 'Kite ult' });
});

test('setTier ignores tiers that do not exist', () => {
  const before = savedState();
  assert.equal(dataReducer(before, { type: 'setTier', junglerId: 'ling', enemyId: 'miya', tier: 'X' }), before);
});

test('clearTier unrates a matchup but keeps its notes', () => {
  const after = dataReducer(savedState(), { type: 'clearTier', junglerId: 'ling', enemyId: 'tigreal' });
  assert.deepEqual(after.matchups.ling, { tigreal: { quickNote: 'Kite ult' } });
});

test('clearTier removes a matchup that has nothing else saved', () => {
  const rated = dataReducer(savedState(), { type: 'setTier', junglerId: 'fanny', enemyId: 'miya', tier: 'S' });
  const after = dataReducer(rated, { type: 'clearTier', junglerId: 'fanny', enemyId: 'miya' });
  assert.equal(after.matchups.fanny, undefined);
});

test('setQuickNote saves a tip without rating the matchup', () => {
  const after = dataReducer(savedState(), { type: 'setQuickNote', junglerId: 'fanny', enemyId: 'miya', text: 'Dodge arrows' });
  assert.deepEqual(after.matchups.fanny, { miya: { quickNote: 'Dodge arrows' } });
});

test('setQuickNote with blank text deletes the tip', () => {
  const after = dataReducer(savedState(), { type: 'setQuickNote', junglerId: 'ling', enemyId: 'tigreal', text: '   ' });
  assert.deepEqual(after.matchups.ling.tigreal, { tier: 'A' });
});

test('setComment saves a long note on the matchup', () => {
  const after = dataReducer(savedState(), { type: 'setComment', junglerId: 'ling', enemyId: 'tigreal', text: 'Wait for his ult first' });
  assert.deepEqual(after.matchups.ling.tigreal, { tier: 'A', quickNote: 'Kite ult', comment: 'Wait for his ult first' });
});

test('addJungler adds a hero to the roster once', () => {
  const once = dataReducer(savedState(), { type: 'addJungler', junglerId: 'hirara' });
  assert.deepEqual(once.junglers, ['ling', 'fanny', 'hirara']);
  assert.equal(dataReducer(once, { type: 'addJungler', junglerId: 'hirara' }), once);
});

test('removeJungler drops the hero and their ratings', () => {
  const after = dataReducer(savedState(), { type: 'removeJungler', junglerId: 'ling' });
  assert.deepEqual(after.junglers, ['fanny']);
  assert.equal(after.matchups.ling, undefined);
});

test('load replaces all saved data', () => {
  const next = { version: 2, junglers: ['hirara'], matchups: {} };
  assert.equal(dataReducer(savedState(), { type: 'load', data: next }), next);
});

test('unknown actions leave the state unchanged', () => {
  const before = savedState();
  assert.equal(dataReducer(before, { type: 'nope' }), before);
});

const withGroups = () => deepFreeze({
  version: 2,
  junglers: ['ling', 'fanny'],
  matchups: { ling: { tigreal: { tier: 'A', quickNote: 'Kite ult' }, miya: { tier: 'D' } }, fanny: { nana: { tier: 'S', comment: 'Easy' }, ling: { tier: 'C' } } },
  skillGroups: [{ id: 'blink', name: 'Blink', category: 'Movement', heroIds: ['harley'] }],
  groupRatings: { ling: { blink: 'C' } },
});

test('setGroupTier and clearGroupTier rate a group for one jungler', () => {
  const rated = dataReducer(withGroups(), { type: 'setGroupTier', junglerId: 'fanny', groupId: 'blink', tier: 'A' });
  assert.deepEqual(rated.groupRatings, { ling: { blink: 'C' }, fanny: { blink: 'A' } });
  const cleared = dataReducer(rated, { type: 'clearGroupTier', junglerId: 'ling', groupId: 'blink' });
  assert.deepEqual(cleared.groupRatings, { fanny: { blink: 'A' } });
});

test('setGroupTier ignores unknown groups and tiers', () => {
  const before = withGroups();
  assert.equal(dataReducer(before, { type: 'setGroupTier', junglerId: 'ling', groupId: 'nope', tier: 'A' }), before);
  assert.equal(dataReducer(before, { type: 'setGroupTier', junglerId: 'ling', groupId: 'blink', tier: 'X' }), before);
});

test('addGroup creates a group with a unique id and refuses a blank name', () => {
  const next = dataReducer(withGroups(), { type: 'addGroup', name: ' Blink ', category: ' Movement ' });
  assert.deepEqual(next.skillGroups[1], { id: 'blink-2', name: 'Blink', category: 'Movement', heroIds: [] });
  const before = withGroups();
  assert.equal(dataReducer(before, { type: 'addGroup', name: '   ' }), before);
});

test('updateGroup renames and recategorizes, and refuses a blank name', () => {
  const next = dataReducer(withGroups(), { type: 'updateGroup', groupId: 'blink', name: 'Teleports', category: 'Mobility' });
  assert.equal(next.skillGroups[0].name, 'Teleports');
  assert.equal(next.skillGroups[0].category, 'Mobility');
  const before = withGroups();
  assert.equal(dataReducer(before, { type: 'updateGroup', groupId: 'blink', name: ' ' }), before);
});

test('toggleGroupHero adds and removes a hero', () => {
  const added = dataReducer(withGroups(), { type: 'toggleGroupHero', groupId: 'blink', heroId: 'moskov' });
  assert.deepEqual(added.skillGroups[0].heroIds, ['harley', 'moskov']);
  const removed = dataReducer(added, { type: 'toggleGroupHero', groupId: 'blink', heroId: 'harley' });
  assert.deepEqual(removed.skillGroups[0].heroIds, ['moskov']);
});

test('deleteGroup also removes every rating of that group', () => {
  const next = dataReducer(withGroups(), { type: 'deleteGroup', groupId: 'blink' });
  assert.deepEqual(next.skillGroups, []);
  assert.deepEqual(next.groupRatings, {});
});

test("copyTierList replaces tiers and group ratings but keeps the target's own notes", () => {
  const next = dataReducer(withGroups(), { type: 'copyTierList', fromId: 'ling', toId: 'fanny' });
  assert.deepEqual(next.matchups.fanny, { nana: { comment: 'Easy' }, tigreal: { tier: 'A' }, miya: { tier: 'D' } });
  assert.deepEqual(next.groupRatings.fanny, { blink: 'C' });
  assert.deepEqual(next.matchups.ling.tigreal, { tier: 'A', quickNote: 'Kite ult' });
});

test('copyTierList skips a rating of the target against themselves', () => {
  const next = dataReducer(withGroups(), { type: 'copyTierList', fromId: 'fanny', toId: 'ling' });
  assert.deepEqual(next.matchups.ling, { tigreal: { quickNote: 'Kite ult' }, nana: { tier: 'S' } });
});

test('clearTierList removes tiers and group ratings but keeps notes', () => {
  const next = dataReducer(withGroups(), { type: 'clearTierList', junglerId: 'ling' });
  assert.deepEqual(next.matchups.ling, { tigreal: { quickNote: 'Kite ult' } });
  assert.deepEqual(next.groupRatings, {});
});

test('removeJungler also drops their group ratings', () => {
  const next = dataReducer(withGroups(), { type: 'removeJungler', junglerId: 'ling' });
  assert.deepEqual(next.groupRatings, {});
});

test('setTiers rates several heroes in one step, keeping notes, and skips the jungler itself', () => {
  const next = dataReducer(withGroups(), { type: 'setTiers', junglerId: 'ling', enemyIds: ['tigreal', 'nana', 'ling'], tier: 'S' });
  assert.deepEqual(next.matchups.ling.tigreal, { tier: 'S', quickNote: 'Kite ult' });
  assert.deepEqual(next.matchups.ling.nana, { tier: 'S' });
  assert.equal(next.matchups.ling.ling, undefined);
});

test('setTiers ignores tiers that do not exist', () => {
  const before = withGroups();
  assert.equal(dataReducer(before, { type: 'setTiers', junglerId: 'ling', enemyIds: ['nana'], tier: 'X' }), before);
});

test('clearTiers unrates several heroes in one step, keeping notes', () => {
  const next = dataReducer(withGroups(), { type: 'clearTiers', junglerId: 'ling', enemyIds: ['tigreal', 'miya'] });
  assert.deepEqual(next.matchups.ling, { tigreal: { quickNote: 'Kite ult' } });
});

test('addGroupHeroes adds many heroes once and sets no ratings', () => {
  const next = dataReducer(withGroups(), { type: 'addGroupHeroes', groupId: 'blink', heroIds: ['harley', 'moskov', 'nana'] });
  assert.deepEqual(next.skillGroups[0].heroIds, ['harley', 'moskov', 'nana']);
  assert.deepEqual(next.matchups, withGroups().matchups);
  assert.deepEqual(next.groupRatings, withGroups().groupRatings);
});

test('setNotes saves both notes in one step and removes blank ones', () => {
  const next = dataReducer(withGroups(), { type: 'setNotes', junglerId: 'ling', enemyId: 'tigreal', quickNote: '', comment: 'Wait for ult' });
  assert.deepEqual(next.matchups.ling.tigreal, { tier: 'A', comment: 'Wait for ult' });
});
