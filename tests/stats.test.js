import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { STATS_INFO, STATS_HERO_ORDER, MATCHUP_TENTHS, HERO_META } from '../src/data/stats.js';
import { decodeMatchups, matchupDelta, heroMeta } from '../src/lib/stats.js';

test('decodeMatchups turns tenths of a point into percentage points and skips gaps', () => {
  // eslint-disable-next-line no-sparse-arrays
  const decoded = decodeMatchups(['ling', 'fanny', 'saber'], [[, 12, -40], [-11, , 5], [39]]);
  assert.deepEqual(decoded, {
    ling: { fanny: 1.2, saber: -4 },
    fanny: { ling: -1.1, saber: 0.5 },
    saber: { ling: 3.9 },
  });
});

test('decodeMatchups ignores a hero matched against itself', () => {
  assert.deepEqual(decodeMatchups(['ling'], [[25]]), { ling: {} });
});

test('matchupDelta returns null when there is no data', () => {
  assert.equal(matchupDelta('ling', 'ling'), null);
  assert.equal(matchupDelta('ling', 'nobody'), null);
  assert.equal(matchupDelta('nobody', 'ling'), null);
});

test('heroMeta returns rates between 0 and 1, or null for unknown heroes', () => {
  const meta = heroMeta('ling');
  assert.ok(meta.winRate > 0 && meta.winRate < 1);
  assert.equal(heroMeta('nobody'), null);
});

test('stats cover every hero in the roster', () => {
  const heroIds = HEROES.map((hero) => hero.id).sort();
  assert.deepEqual([...STATS_HERO_ORDER].sort(), heroIds);
  assert.equal(MATCHUP_TENTHS.length, STATS_HERO_ORDER.length);
  heroIds.forEach((id) => assert.ok(HERO_META[id], `no win rates for ${id}`));
});

test('every hero has matchup data against most other heroes', () => {
  const decoded = decodeMatchups(STATS_HERO_ORDER, MATCHUP_TENTHS);
  STATS_HERO_ORDER.forEach((id) => {
    const known = Object.keys(decoded[id]).length;
    assert.ok(known >= 60, `${id} only has ${known} matchups`);
  });
});

test('matchup changes and rates are in realistic ranges', () => {
  MATCHUP_TENTHS.forEach((row) => row.forEach((value) => assert.ok(Math.abs(value) <= 300, `matchup change ${value / 10} points`)));
  Object.values(HERO_META).forEach((meta) => {
    ['winRate', 'banRate', 'pickRate'].forEach((key) => assert.ok(meta[key] >= 0 && meta[key] <= 1, `${key} ${meta[key]}`));
  });
});

test('STATS_INFO records the rank and date of the numbers', () => {
  assert.equal(STATS_INFO.rank, 'mythic');
  assert.ok(!Number.isNaN(Date.parse(STATS_INFO.updated)));
});
