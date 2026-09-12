import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createSafeStorage, isPlainObject, isStringArray } from '../src/lib/storage.js';
import { memoryStorage } from './helpers/memoryStorage.js';

test('createSafeStorage reads saved JSON', () => {
  const store = createSafeStorage(() => memoryStorage({ list: '["Ling"]' }));
  assert.deepEqual(store.read('list', []), ['Ling']);
});

test('createSafeStorage falls back and backs up data it cannot parse', () => {
  const storage = memoryStorage({ matchups: '{broken' });
  const errors = [];
  const store = createSafeStorage(() => storage, (error) => errors.push(error));
  assert.deepEqual(store.read('matchups', {}), {});
  assert.equal(storage.getItem('matchups_corrupt_backup'), '{broken');
  assert.equal(errors.length, 1);
});

test('createSafeStorage falls back when saved data has the wrong shape', () => {
  const store = createSafeStorage(() => memoryStorage({ list: '{"not":"a list"}' }), () => {});
  assert.deepEqual(store.read('list', ['Ling'], Array.isArray), ['Ling']);
});

test('createSafeStorage falls back when storage is blocked', () => {
  const store = createSafeStorage(() => { throw new Error('SecurityError'); }, () => {});
  assert.deepEqual(store.read('list', ['Ling']), ['Ling']);
  assert.equal(store.write('list', ['Fanny']), false);
  assert.equal(store.remove('list'), false);
});

test('createSafeStorage reports a failed write', () => {
  const errors = [];
  const full = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
  const store = createSafeStorage(() => full, (error) => errors.push(error));
  assert.equal(store.write('images', { Ling: 'data:' }), false);
  assert.equal(errors.length, 1);
});

test('createSafeStorage removes a saved key', () => {
  const storage = memoryStorage({ list: '["Ling"]' });
  const store = createSafeStorage(() => storage);
  assert.equal(store.remove('list'), true);
  assert.equal(storage.getItem('list'), null);
});

test('isPlainObject accepts objects but not arrays or null', () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
});

test('isStringArray accepts only arrays of strings', () => {
  assert.equal(isStringArray(['Ling', 'Fanny']), true);
  assert.equal(isStringArray(['Ling', 3]), false);
  assert.equal(isStringArray('Ling'), false);
});
