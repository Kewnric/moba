import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildExport, isSaveData, normalizeImport } from '../src/lib/saveData.js';
import { dataReducer } from '../src/lib/dataReducer.js';

// A frozen state throws if the reducer tries to change it in place.
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const savedState = () => deepFreeze({ version: 2, junglers: ['ling', 'fanny'], matchups: {}, comfort: { ling: 5 } });

test('isSaveData accepts comfort ratings from 1 to 5', () => {
  assert.equal(isSaveData(savedState()), true);
});

test('isSaveData still accepts saves without comfort ratings', () => {
  assert.equal(isSaveData({ version: 2, junglers: [], matchups: {} }), true);
});

test('isSaveData rejects comfort ratings outside 1 to 5', () => {
  assert.equal(isSaveData({ version: 2, junglers: [], matchups: {}, comfort: { ling: 9 } }), false);
  assert.equal(isSaveData({ version: 2, junglers: [], matchups: {}, comfort: 'ling' }), false);
});

test('buildExport includes comfort ratings', () => {
  assert.deepEqual(buildExport(savedState(), {}).comfort, { ling: 5 });
});

test('normalizeImport keeps comfort ratings for known heroes', () => {
  const { data, unmatched } = normalizeImport({
    app: 'JunglerOS',
    version: 2,
    junglers: ['ling'],
    matchups: {},
    comfort: { ling: 4, nobody: 3 },
    images: {},
  });
  assert.deepEqual(data.comfort, { ling: 4 });
  assert.deepEqual(unmatched, ['nobody']);
});

test('setComfort saves a rating without changing the previous state', () => {
  const before = savedState();
  const after = dataReducer(before, { type: 'setComfort', junglerId: 'fanny', comfort: 3 });
  assert.deepEqual(after.comfort, { ling: 5, fanny: 3 });
  assert.deepEqual(before.comfort, { ling: 5 });
});

test('setComfort with null removes the rating', () => {
  const after = dataReducer(savedState(), { type: 'setComfort', junglerId: 'ling', comfort: null });
  assert.equal(after.comfort, undefined);
});

test('setComfort ignores ratings outside 1 to 5', () => {
  const before = savedState();
  assert.equal(dataReducer(before, { type: 'setComfort', junglerId: 'fanny', comfort: 7 }), before);
});

test("removeJungler also drops that jungler's comfort rating", () => {
  const after = dataReducer(savedState(), { type: 'removeJungler', junglerId: 'ling' });
  assert.equal(after.comfort, undefined);
});
