import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rankJunglers } from '../src/lib/engine.js';

const ids = (ranked) => ranked.map((entry) => entry.id);

test('rankJunglers returns nothing until an enemy is entered', () => {
  assert.deepEqual(rankJunglers(['ling'], [], {}), { ranked: [], recommended: null });
});

test('rankJunglers never suggests a jungler the enemy already picked', () => {
  const { ranked } = rankJunglers(['ling', 'fanny'], ['ling'], {});
  assert.deepEqual(ids(ranked), ['fanny']);
});

test('rankJunglers never suggests a hero your team picked or anyone banned', () => {
  const { ranked } = rankJunglers(['ling', 'fanny', 'hayabusa', 'karina'], ['tigreal'], {}, ['fanny', 'hayabusa']);
  assert.deepEqual(ids(ranked), ['karina', 'ling']);
});

test('rankJunglers recommends nobody when no matchups are rated', () => {
  const { ranked, recommended } = rankJunglers(['balmond', 'ling'], ['tigreal'], {});
  assert.equal(recommended, null);
  assert.equal(ranked.length, 2);
  assert.ok(ranked.every((entry) => entry.rated === 0));
});

test('rankJunglers pulls a single rating toward even', () => {
  const { ranked } = rankJunglers(['ling'], ['tigreal'], { ling: { tigreal: { tier: 'S' } } });
  assert.ok(Math.abs(ranked[0].score - 20 / 3) < 1e-9);
  assert.equal(ranked[0].rated, 1);
  assert.equal(ranked[0].total, 1);
});

test('rankJunglers ranks a well-rated jungler above an unrated one, even when rated low', () => {
  const data = { ling: { tigreal: { tier: 'C' }, miya: { tier: 'C' } } };
  const { ranked, recommended } = rankJunglers(['fanny', 'ling'], ['tigreal', 'miya'], data);
  assert.deepEqual(ids(ranked), ['ling', 'fanny']);
  assert.equal(recommended.id, 'ling');
});

test('rankJunglers needs at least half the enemies rated before recommending', () => {
  const enemies = ['tigreal', 'miya', 'nana'];
  const oneRated = rankJunglers(['ling'], enemies, { ling: { tigreal: { tier: 'A' } } });
  assert.equal(oneRated.recommended, null);
  const twoRated = rankJunglers(['ling'], enemies, { ling: { tigreal: { tier: 'A' }, miya: { tier: 'A' } } });
  assert.equal(twoRated.recommended.id, 'ling');
});

test('rankJunglers does not let one great rating beat a well-covered jungler', () => {
  const enemies = ['tigreal', 'miya', 'nana', 'chou', 'layla'];
  const data = {
    hayabusa: { tigreal: { tier: 'S' } },
    ling: { tigreal: { tier: 'A' }, miya: { tier: 'A' }, nana: { tier: 'A' } },
  };
  const { ranked, recommended } = rankJunglers(['hayabusa', 'ling'], enemies, data);
  assert.deepEqual(ids(ranked), ['ling', 'hayabusa']);
  assert.equal(recommended.id, 'ling');
});

test('rankJunglers ignores tiers it does not recognise', () => {
  const { ranked } = rankJunglers(['ling'], ['tigreal'], { ling: { tigreal: { tier: 'X' } } });
  assert.equal(ranked[0].rated, 0);
  assert.equal(ranked[0].score, 5);
});

test('rankJunglers counts a repeated enemy once', () => {
  const { ranked } = rankJunglers(['ling'], ['tigreal', 'tigreal'], { ling: { tigreal: { tier: 'S' } } });
  assert.equal(ranked[0].total, 1);
  assert.equal(ranked[0].rated, 1);
});

test('rankJunglers breaks score ties by rated matchups, then by id', () => {
  const enemies = ['tigreal', 'miya'];
  const data = {
    ling: { tigreal: { tier: 'B' }, miya: { tier: 'B' } },
    fanny: { tigreal: { tier: 'B' } },
    alucard: { tigreal: { tier: 'B' } },
  };
  const { ranked } = rankJunglers(['fanny', 'ling', 'alucard'], enemies, data);
  assert.deepEqual(ids(ranked), ['ling', 'alucard', 'fanny']);
});
