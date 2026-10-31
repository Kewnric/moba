import { test } from 'vitest';
import assert from 'node:assert/strict';
import { initialUndoable, undoableDataReducer, MAX_UNDO } from '../src/lib/undoableData.js';

const data = () => ({
  version: 2,
  junglers: ['ling'],
  matchups: {},
  skillGroups: [{ id: 'blink', name: 'Blink skills', category: 'Movement', heroIds: [] }],
  groupRatings: {},
});

test('undo takes back the last change and names it', () => {
  const start = initialUndoable(data());
  const rated = undoableDataReducer(start, { type: 'setTier', junglerId: 'ling', enemyId: 'tigreal', tier: 'A' });
  assert.equal(rated.present.matchups.ling.tigreal.tier, 'A');
  assert.match(rated.past[0].label, /Ling vs Tigreal/);
  const undone = undoableDataReducer(rated, { type: 'undo' });
  assert.equal(undone.present, start.present);
  assert.deepEqual(undone.past, []);
});

test('group ratings can be undone too', () => {
  const rated = undoableDataReducer(initialUndoable(data()), { type: 'setGroupTier', junglerId: 'ling', groupId: 'blink', tier: 'D' });
  assert.match(rated.past[0].label, /Blink skills/);
  assert.deepEqual(undoableDataReducer(rated, { type: 'undo' }).present.groupRatings, {});
});

test('a change that does nothing adds no undo step', () => {
  const start = initialUndoable(data());
  assert.equal(undoableDataReducer(start, { type: 'setTier', junglerId: 'ling', enemyId: 'tigreal', tier: 'X' }), start);
});

test('undo with nothing to take back changes nothing', () => {
  const start = initialUndoable(data());
  assert.equal(undoableDataReducer(start, { type: 'undo' }), start);
});

test('loading a backup clears the undo steps', () => {
  const rated = undoableDataReducer(initialUndoable(data()), { type: 'setTier', junglerId: 'ling', enemyId: 'tigreal', tier: 'A' });
  const next = { ...data(), junglers: ['fanny'] };
  const loaded = undoableDataReducer(rated, { type: 'load', data: next });
  assert.equal(loaded.present, next);
  assert.deepEqual(loaded.past, []);
});

test('only the most recent steps are kept', () => {
  let state = initialUndoable(data());
  for (let i = 0; i < MAX_UNDO + 5; i += 1) {
    state = undoableDataReducer(state, { type: 'setComfort', junglerId: 'ling', comfort: (i % 5) + 1 });
  }
  assert.equal(state.past.length, MAX_UNDO);
});
