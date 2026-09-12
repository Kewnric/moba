const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildHeroList,
  addToFirstEmptySlot,
  placeInSlot,
  moveSlot,
  rankJunglers,
  createSafeStorage,
} = require('../engine.js');

const hero = (name) => ({ id: name, name, roles: [] });
const names = (ranked) => ranked.map((entry) => entry.name);

test('buildHeroList keeps every role a hero is listed under', () => {
  const heroes = buildHeroList({ 'Exp Lane': ['Balmond', 'Chou'], Jungling: ['Balmond'] });
  assert.deepEqual(heroes, [
    { id: 'Balmond', name: 'Balmond', roles: ['Exp Lane', 'Jungling'] },
    { id: 'Chou', name: 'Chou', roles: ['Exp Lane'] },
  ]);
});

test('addToFirstEmptySlot fills the first empty slot', () => {
  assert.deepEqual(addToFirstEmptySlot([hero('Ling'), null, null], hero('Tigreal')), [hero('Ling'), hero('Tigreal'), null]);
});

test('addToFirstEmptySlot ignores a hero already in the lineup', () => {
  const slots = [hero('Ling'), null];
  assert.equal(addToFirstEmptySlot(slots, hero('Ling')), slots);
});

test('addToFirstEmptySlot leaves a full lineup unchanged', () => {
  const slots = [hero('Ling'), hero('Tigreal')];
  assert.equal(addToFirstEmptySlot(slots, hero('Fanny')), slots);
});

test('placeInSlot puts a hero into the chosen slot without mutating the original', () => {
  const slots = [hero('Ling'), null, null];
  assert.deepEqual(placeInSlot(slots, 2, hero('Tigreal')), [hero('Ling'), null, hero('Tigreal')]);
  assert.deepEqual(slots, [hero('Ling'), null, null]);
});

test('placeInSlot refuses a hero who is already in a different slot', () => {
  const slots = [hero('Ling'), null];
  assert.equal(placeInSlot(slots, 1, hero('Ling')), slots);
});

test('placeInSlot replaces the hero in an occupied slot', () => {
  assert.deepEqual(placeInSlot([hero('Ling'), hero('Tigreal')], 1, hero('Fanny')), [hero('Ling'), hero('Fanny')]);
});

test('moveSlot swaps two occupied slots instead of deleting one', () => {
  assert.deepEqual(moveSlot([hero('Ling'), hero('Tigreal'), null], 0, 1), [hero('Tigreal'), hero('Ling'), null]);
});

test('moveSlot moves a hero into an empty slot', () => {
  assert.deepEqual(moveSlot([hero('Ling'), null], 0, 1), [null, hero('Ling')]);
});

test('rankJunglers returns nothing until an enemy is entered', () => {
  assert.deepEqual(rankJunglers(['Ling'], [], {}), { ranked: [], recommended: null });
});

test('rankJunglers never suggests a jungler the enemy already picked', () => {
  const { ranked } = rankJunglers(['Ling', 'Fanny'], ['Ling'], {});
  assert.deepEqual(names(ranked), ['Fanny']);
});

test('rankJunglers recommends nobody when no matchups are rated', () => {
  const { ranked, recommended } = rankJunglers(['Balmond', 'Ling'], ['Tigreal'], {});
  assert.equal(recommended, null);
  assert.equal(ranked.length, 2);
  assert.ok(ranked.every((entry) => entry.rated === 0));
});

test('rankJunglers pulls a single rating toward even', () => {
  const { ranked } = rankJunglers(['Ling'], ['Tigreal'], { Ling: { Tigreal: { tier: 'S' } } });
  assert.ok(Math.abs(ranked[0].score - 20 / 3) < 1e-9);
  assert.equal(ranked[0].rated, 1);
  assert.equal(ranked[0].total, 1);
});

test('rankJunglers ranks a well-rated jungler above an unrated one, even when rated low', () => {
  const data = { Ling: { Tigreal: { tier: 'C' }, Miya: { tier: 'C' } } };
  const { ranked, recommended } = rankJunglers(['Fanny', 'Ling'], ['Tigreal', 'Miya'], data);
  assert.deepEqual(names(ranked), ['Ling', 'Fanny']);
  assert.equal(recommended.name, 'Ling');
});

test('rankJunglers needs at least half the enemies rated before recommending', () => {
  const enemies = ['Tigreal', 'Miya', 'Nana'];
  const oneRated = rankJunglers(['Ling'], enemies, { Ling: { Tigreal: { tier: 'A' } } });
  assert.equal(oneRated.recommended, null);
  const twoRated = rankJunglers(['Ling'], enemies, { Ling: { Tigreal: { tier: 'A' }, Miya: { tier: 'A' } } });
  assert.equal(twoRated.recommended.name, 'Ling');
});

test('rankJunglers does not let one great rating beat a well-covered jungler', () => {
  const enemies = ['Tigreal', 'Miya', 'Nana', 'Chou', 'Layla'];
  const data = {
    Hayabusa: { Tigreal: { tier: 'S' } },
    Ling: { Tigreal: { tier: 'A' }, Miya: { tier: 'A' }, Nana: { tier: 'A' } },
  };
  const { ranked, recommended } = rankJunglers(['Hayabusa', 'Ling'], enemies, data);
  assert.deepEqual(names(ranked), ['Ling', 'Hayabusa']);
  assert.equal(recommended.name, 'Ling');
});

test('rankJunglers ignores tiers it does not recognise', () => {
  const { ranked } = rankJunglers(['Ling'], ['Tigreal'], { Ling: { Tigreal: { tier: 'X' } } });
  assert.equal(ranked[0].rated, 0);
  assert.equal(ranked[0].score, 5);
});

test('rankJunglers counts a repeated enemy once', () => {
  const { ranked } = rankJunglers(['Ling'], ['Tigreal', 'Tigreal'], { Ling: { Tigreal: { tier: 'S' } } });
  assert.equal(ranked[0].total, 1);
  assert.equal(ranked[0].rated, 1);
});

test('rankJunglers breaks score ties by rated matchups, then by name', () => {
  const enemies = ['Tigreal', 'Miya'];
  const data = {
    Ling: { Tigreal: { tier: 'B' }, Miya: { tier: 'B' } },
    Fanny: { Tigreal: { tier: 'B' } },
    Alucard: { Tigreal: { tier: 'B' } },
  };
  const { ranked } = rankJunglers(['Fanny', 'Ling', 'Alucard'], enemies, data);
  assert.deepEqual(names(ranked), ['Ling', 'Alucard', 'Fanny']);
});

const memoryStorage = (initial = {}) => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { items.set(key, String(value)); },
    removeItem: (key) => { items.delete(key); },
  };
};

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
});

test('createSafeStorage reports a failed write', () => {
  const errors = [];
  const full = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
  const store = createSafeStorage(() => full, (error) => errors.push(error));
  assert.equal(store.write('images', { Ling: 'data:' }), false);
  assert.equal(errors.length, 1);
});
