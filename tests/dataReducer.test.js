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
