import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULT_JUNGLERS,
  addNewDefaultJunglers,
  buildExport,
  isSaveData,
  mergeSaveData,
  normalizeImport,
} from '../src/lib/saveData.js';

// A frozen value throws if a function tries to change it in place.
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

test('addNewDefaultJunglers adds junglers released since an older save was made', () => {
  const { data, added } = addNewDefaultJunglers(deepFreeze({ version: 2, junglers: ['ling'], matchups: {} }));
  assert.deepEqual(added, ['hirara']);
  assert.deepEqual(data.junglers, ['ling', 'hirara']);
  assert.deepEqual(data.knownDefaults, DEFAULT_JUNGLERS);
});

test('addNewDefaultJunglers does not bring back a default jungler you removed', () => {
  const saved = deepFreeze({ version: 2, junglers: ['ling'], matchups: {}, knownDefaults: [...DEFAULT_JUNGLERS] });
  const { data, added } = addNewDefaultJunglers(saved);
  assert.equal(data, saved);
  assert.deepEqual(added, []);
});

test('addNewDefaultJunglers skips new junglers already in the roster', () => {
  const { data, added } = addNewDefaultJunglers(deepFreeze({ version: 2, junglers: ['hirara', 'ling'], matchups: {} }));
  assert.deepEqual(added, []);
  assert.deepEqual(data.junglers, ['hirara', 'ling']);
  assert.deepEqual(data.knownDefaults, DEFAULT_JUNGLERS);
});

test('isSaveData accepts a list of known default junglers and rejects a broken one', () => {
  assert.equal(isSaveData({ version: 2, junglers: [], matchups: {}, knownDefaults: ['ling'] }), true);
  assert.equal(isSaveData({ version: 2, junglers: [], matchups: {}, knownDefaults: 'ling' }), false);
});

test('backups keep known default junglers and game history', () => {
  const saved = { version: 2, junglers: ['ling'], matchups: {}, knownDefaults: ['ling', 'nobody'] };
  const game = { id: 'g1', playedAt: '2026-09-13T10:00:00.000Z', result: 'win', playedId: 'ling', topPickId: null, draft: { ally: ['ling'], enemy: ['tigreal'] } };
  const file = JSON.parse(JSON.stringify(buildExport(saved, [game, { broken: true }])));
  const { data, history } = normalizeImport(file);
  assert.deepEqual(data.knownDefaults, ['ling']);
  assert.deepEqual(history, [game]);
});

test('normalizeImport keeps at most 500 games, newest first', () => {
  const games = Array.from({ length: 501 }, (_, i) => ({
    id: `g${i}`,
    playedAt: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(),
    result: 'win',
    playedId: 'ling',
    topPickId: null,
    draft: { ally: ['ling'], enemy: [] },
  }));
  const { history } = normalizeImport({ app: 'JunglerOS', version: 2, junglers: ['ling'], matchups: {}, history: games });
  assert.equal(history.length, 500);
  assert.equal(history[0].id, 'g500');
  assert.equal(history[499].id, 'g1');
});

test('normalizeImport of an old name-based backup has no game history', () => {
  assert.deepEqual(normalizeImport({ junglerList: ['Ling'], matchupData: {} }).history, []);
});

test('mergeSaveData combines rosters, ratings, notes and comfort, preferring the backup', () => {
  const current = deepFreeze({
    version: 2,
    junglers: ['ling', 'fanny'],
    matchups: { ling: { tigreal: { tier: 'A', quickNote: 'Kite his ult' } } },
    comfort: { ling: 5 },
    knownDefaults: ['ling'],
  });
  const imported = deepFreeze({
    version: 2,
    junglers: ['fanny', 'hirara'],
    matchups: { ling: { tigreal: { tier: 'C' }, miya: { tier: 'S' } }, hirara: { nana: { tier: 'B' } } },
    comfort: { fanny: 3, ling: 2 },
    knownDefaults: ['hirara'],
  });
  assert.deepEqual(mergeSaveData(current, imported), {
    version: 2,
    junglers: ['ling', 'fanny', 'hirara'],
    matchups: {
      ling: { tigreal: { tier: 'C', quickNote: 'Kite his ult' }, miya: { tier: 'S' } },
      hirara: { nana: { tier: 'B' } },
    },
    comfort: { ling: 2, fanny: 3 },
    knownDefaults: ['ling', 'hirara'],
  });
});

test('mergeSaveData leaves out comfort and known defaults when neither side has them', () => {
  const merged = mergeSaveData({ version: 2, junglers: ['ling'], matchups: {} }, { version: 2, junglers: [], matchups: {} });
  assert.deepEqual(merged, { version: 2, junglers: ['ling'], matchups: {} });
});
