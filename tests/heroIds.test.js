import { test } from 'vitest';
import assert from 'node:assert/strict';
import { findHeroId, slugify } from '../src/lib/heroIds.js';

test('slugify turns hero names into url-safe ids', () => {
  assert.equal(slugify('Yi Sun-Shin'), 'yi-sun-shin');
  assert.equal(slugify("Chang'e"), 'chang-e');
  assert.equal(slugify('X.Borg'), 'x-borg');
  assert.equal(slugify('Popol and Kupa'), 'popol-and-kupa');
});

test('findHeroId matches names regardless of case, spacing and punctuation', () => {
  assert.equal(findHeroId('Yi Sun-shin'), 'yi-sun-shin');
  assert.equal(findHeroId('chang e'), 'chang-e');
  assert.equal(findHeroId('XBorg'), 'x-borg');
  assert.equal(findHeroId('  Ling '), 'ling');
});

test('findHeroId returns null for names that are not heroes', () => {
  assert.equal(findHeroId('Gusion2'), null);
  assert.equal(findHeroId(''), null);
  assert.equal(findHeroId(undefined), null);
});
