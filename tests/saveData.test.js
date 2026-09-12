import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createSafeStorage } from '../src/lib/storage.js';
import {
  STORAGE_KEYS,
  DEFAULT_JUNGLERS,
  migrateV1,
  normalizeImport,
  buildExport,
  loadSave,
  clearSave,
} from '../src/lib/saveData.js';
import { memoryStorage } from './helpers/memoryStorage.js';

const storageWith = (items) => {
  const raw = memoryStorage(items);
  return { raw, store: createSafeStorage(() => raw, () => {}) };
};

test('DEFAULT_JUNGLERS lists every hero in the Jungling lane', () => {
  assert.equal(DEFAULT_JUNGLERS.length, 36);
  assert.ok(DEFAULT_JUNGLERS.includes('hirara'));
  assert.ok(DEFAULT_JUNGLERS.includes('popol-and-kupa'));
});

test('migrateV1 converts hero names to ids', () => {
  const { data, images, unmatched } = migrateV1({
    junglerList: ['Ling', 'Yi Sun-Shin'],
    matchupData: {
      Ling: { Tigreal: { tier: 'A', quickNote: 'Kite' } },
      'Yi Sun-Shin': { "Chang'e": { tier: 'S' } },
    },
    customImages: { Ling: 'data:image/jpeg;base64,AAA' },
  });
  assert.deepEqual(data, {
    version: 2,
    junglers: ['ling', 'yi-sun-shin'],
    matchups: { ling: { tigreal: { tier: 'A', quickNote: 'Kite' } }, 'yi-sun-shin': { 'chang-e': { tier: 'S' } } },
  });
  assert.deepEqual(images, { ling: 'data:image/jpeg;base64,AAA' });
  assert.deepEqual(unmatched, []);
});

test('migrateV1 skips names that are not heroes and reports them', () => {
  const { data, unmatched } = migrateV1({
    junglerList: ['Ling', 'gusion2'],
    matchupData: { gusion2: { Tigreal: { tier: 'A' } }, Ling: { Nobody: { tier: 'B' } } },
    customImages: {},
  });
  assert.deepEqual(data.junglers, ['ling']);
  assert.deepEqual(data.matchups, {});
  assert.deepEqual(unmatched, ['gusion2', 'Nobody']);
});

test('migrateV1 uses the default roster when no roster was saved', () => {
  const { data } = migrateV1({ matchupData: {}, customImages: {} });
  assert.deepEqual(data.junglers, DEFAULT_JUNGLERS);
});

test('buildExport labels the file with the app name and version', () => {
  const file = buildExport({ version: 2, junglers: [], matchups: {} }, {});
  assert.equal(file.app, 'JunglerOS');
  assert.equal(file.version, 2);
  assert.ok(!Number.isNaN(Date.parse(file.exportedAt)));
});

test('normalizeImport reads a version 2 export', () => {
  const saved = { version: 2, junglers: ['ling'], matchups: { ling: { tigreal: { tier: 'S' } } } };
  const file = JSON.parse(JSON.stringify(buildExport(saved, { ling: 'data:x' })));
  const { data, images, unmatched } = normalizeImport(file);
  assert.deepEqual(data, saved);
  assert.deepEqual(images, { ling: 'data:x' });
  assert.deepEqual(unmatched, []);
});

test('normalizeImport drops unknown hero ids from a version 2 file', () => {
  const { data, unmatched } = normalizeImport({
    app: 'JunglerOS',
    version: 2,
    junglers: ['ling', 'nobody'],
    matchups: { ling: { nobody: { tier: 'A' }, miya: { tier: 'B' } } },
    images: {},
  });
  assert.deepEqual(data.junglers, ['ling']);
  assert.deepEqual(data.matchups, { ling: { miya: { tier: 'B' } } });
  assert.deepEqual(unmatched, ['nobody']);
});

test('normalizeImport upgrades an old name-based backup', () => {
  const { data } = normalizeImport({ version: '1.3', junglerList: ['Fanny'], matchupData: { Fanny: { Miya: { tier: 'B' } } } });
  assert.deepEqual(data.junglers, ['fanny']);
  assert.deepEqual(data.matchups, { fanny: { miya: { tier: 'B' } } });
});

test('normalizeImport rejects files that are not JunglerOS backups', () => {
  assert.throws(() => normalizeImport({ hello: 'world' }), /not a JunglerOS backup/);
  assert.throws(() => normalizeImport(null), /not a JunglerOS backup/);
});

test('loadSave returns defaults when nothing is saved', () => {
  const { store } = storageWith({});
  const result = loadSave(store);
  assert.deepEqual(result.data, { version: 2, junglers: DEFAULT_JUNGLERS, matchups: {} });
  assert.deepEqual(result.images, {});
  assert.equal(result.migrated, false);
  assert.deepEqual(result.unmatched, []);
});

test('loadSave upgrades an old save once and keeps the old keys', () => {
  const { raw, store } = storageWith({
    [STORAGE_KEYS.legacyMatchups]: JSON.stringify({ Ling: { Tigreal: { tier: 'A' } } }),
    [STORAGE_KEYS.legacyJunglers]: JSON.stringify(['Ling']),
    [STORAGE_KEYS.legacyImages]: JSON.stringify({ Ling: 'data:x' }),
  });
  const result = loadSave(store);
  assert.equal(result.migrated, true);
  assert.deepEqual(result.data.matchups, { ling: { tigreal: { tier: 'A' } } });
  assert.deepEqual(result.images, { ling: 'data:x' });
  assert.deepEqual(JSON.parse(raw.getItem(STORAGE_KEYS.data)), result.data);
  assert.deepEqual(JSON.parse(raw.getItem(STORAGE_KEYS.images)), { ling: 'data:x' });
  assert.notEqual(raw.getItem(STORAGE_KEYS.legacyMatchups), null);
  assert.equal(loadSave(store).migrated, false);
});

test('loadSave prefers the version 2 save over old keys', () => {
  const saved = { version: 2, junglers: ['fanny'], matchups: {} };
  const { store } = storageWith({
    [STORAGE_KEYS.data]: JSON.stringify(saved),
    [STORAGE_KEYS.legacyJunglers]: JSON.stringify(['Ling']),
  });
  assert.deepEqual(loadSave(store).data, saved);
});

test('loadSave ignores a version 2 save with the wrong shape', () => {
  const { store } = storageWith({ [STORAGE_KEYS.data]: JSON.stringify({ version: 2, junglers: 'ling' }) });
  assert.deepEqual(loadSave(store).data.junglers, DEFAULT_JUNGLERS);
});

test('clearSave removes only JunglerOS saves and their backups', () => {
  const { raw, store } = storageWith({
    [STORAGE_KEYS.data]: '{}',
    [`${STORAGE_KEYS.data}_corrupt_backup`]: '{',
    [STORAGE_KEYS.legacyMatchups]: '{}',
    otherApp: 'keep me',
  });
  clearSave(store);
  assert.equal(raw.getItem(STORAGE_KEYS.data), null);
  assert.equal(raw.getItem(`${STORAGE_KEYS.data}_corrupt_backup`), null);
  assert.equal(raw.getItem(STORAGE_KEYS.legacyMatchups), null);
  assert.equal(raw.getItem('otherApp'), 'keep me');
});
