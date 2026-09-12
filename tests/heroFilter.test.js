import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HEROES, LANES } from '../src/data/heroes.js';
import { filterHeroes } from '../src/lib/heroFilter.js';

const names = (heroes) => heroes.map((hero) => hero.name);

test('filterHeroes returns every hero when nothing is filtered', () => {
  assert.equal(filterHeroes(HEROES).length, HEROES.length);
});

test('filterHeroes by lane includes heroes who also play other lanes', () => {
  const junglers = names(filterHeroes(HEROES, { lane: LANES.JUNGLE }));
  assert.ok(junglers.includes('Balmond'));
  assert.ok(!junglers.includes('Tigreal'));
});

test('filterHeroes search ignores case, spaces and punctuation', () => {
  assert.deepEqual(names(filterHeroes(HEROES, { search: 'chang e' })), ["Chang'e"]);
  assert.deepEqual(names(filterHeroes(HEROES, { search: 'XBORG' })), ['X.Borg']);
  assert.ok(names(filterHeroes(HEROES, { search: 'yi sun' })).includes('Yi Sun-Shin'));
});

test('filterHeroes hides heroes by id', () => {
  assert.ok(!names(filterHeroes(HEROES, { search: 'ling', hideIds: ['ling'] })).includes('Ling'));
});

test('filterHeroes combines lane and search', () => {
  assert.deepEqual(names(filterHeroes(HEROES, { lane: LANES.ROAM, search: 'tig' })), ['Tigreal']);
});
