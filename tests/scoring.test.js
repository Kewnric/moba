import { test } from 'vitest';
import assert from 'node:assert/strict';
import { banSuggestions, comfortScore, DEFAULT_COMFORT_WEIGHT, graphOptions, riskLevel, scoreJunglers, sortEntries } from '../src/lib/scoring.js';

const HERO_IDS = ['ling', 'fanny', 'karina', 'tigreal', 'miya', 'nana', 'saber', 'layla'];

const context = (overrides = {}) => ({
  junglerIds: ['ling', 'fanny'],
  enemyIds: [],
  enemyJunglerId: null,
  unavailableIds: [],
  tiersByJungler: {},
  matchups: {},
  comfort: {},
  comfortWeight: DEFAULT_COMFORT_WEIGHT,
  heroIds: HERO_IDS,
  ...overrides,
});

const mine = (entries) => Object.fromEntries(Object.entries(entries).map(([heroId, tier]) => [heroId, { tier, source: 'hero' }]));
const byId = (result) => Object.fromEntries(result.ranked.map((entry) => [entry.id, entry]));
const ids = (result) => result.ranked.map((entry) => entry.id);

test('a viability score uses only your tiers and comfort, 70/30 by default', () => {
  const ling = byId(scoreJunglers(context({
    enemyIds: ['tigreal', 'miya'],
    tiersByJungler: { ling: mine({ tigreal: 'S', miya: 'C' }) },
    comfort: { ling: 5 },
  }))).ling;
  assert.equal(ling.matchupScore, 62.5);
  assert.equal(ling.comfortScore, 100);
  assert.equal(ling.total, 73.8);
  assert.equal(ling.grade, 'A');
});

test('all-S matchups on your main score exactly 100, and all-D on a hero you rarely play score 0', () => {
  const result = byId(scoreJunglers(context({
    enemyIds: ['tigreal', 'miya'],
    tiersByJungler: { ling: mine({ tigreal: 'S', miya: 'S' }), fanny: mine({ tigreal: 'D', miya: 'D' }) },
    comfort: { ling: 5, fanny: 1 },
  })));
  assert.equal(result.ling.total, 100);
  assert.equal(result.fanny.total, 0);
  assert.equal(result.ling.grade, 'S');
  assert.equal(result.fanny.grade, 'D');
});

test('an unrated matchup and an unset comfort both count as the middle, and say so', () => {
  const ling = byId(scoreJunglers(context({ enemyIds: ['tigreal'] }))).ling;
  assert.equal(ling.total, 50);
  assert.equal(ling.comfort, null);
  assert.equal(ling.matchups[0].tier, null);
  assert.equal(ling.matchups[0].points, 50);
  assert.deepEqual(ling.coverage, { rated: 0, total: 1 });
});

test('a jungler with few ratings is not pushed below better-scoring ones', () => {
  const result = scoreJunglers(context({
    enemyIds: ['tigreal', 'miya', 'nana'],
    tiersByJungler: { fanny: mine({ tigreal: 'S' }), ling: mine({ tigreal: 'D', miya: 'D', nana: 'D' }) },
  }));
  assert.deepEqual(ids(result), ['fanny', 'ling']);
});

test('the comfort weight is yours to change', () => {
  const inputs = { enemyIds: ['tigreal'], tiersByJungler: { ling: mine({ tigreal: 'D' }) }, comfort: { ling: 5 } };
  assert.equal(byId(scoreJunglers(context({ ...inputs, comfortWeight: 0 }))).ling.total, 0);
  assert.equal(byId(scoreJunglers(context({ ...inputs, comfortWeight: 50 }))).ling.total, 50);
});

test('open counters are shown as risk and never change the score', () => {
  const quiet = byId(scoreJunglers(context({ enemyIds: ['tigreal'], tiersByJungler: { ling: mine({ tigreal: 'A' }) } }))).ling;
  const risky = byId(scoreJunglers(context({ enemyIds: ['tigreal'], tiersByJungler: { ling: mine({ tigreal: 'A', saber: 'D', nana: 'D', layla: 'C' }) } }))).ling;
  assert.equal(risky.total, quiet.total);
  assert.deepEqual(risky.risk.openCounters, ['nana', 'saber']);
  assert.deepEqual(risky.risk.openUnfavored, ['layla']);
  assert.equal(risky.risk.level, 'low');
  assert.equal(risky.risk.picksLeft, 4);
});

test('risk skips counters that are already picked or banned, and lists the ones you are facing', () => {
  const ling = byId(scoreJunglers(context({
    enemyIds: ['saber'],
    unavailableIds: ['nana'],
    tiersByJungler: { ling: mine({ saber: 'D', nana: 'D', layla: 'D' }) },
  }))).ling;
  assert.deepEqual(ling.risk.openCounters, ['layla']);
  assert.deepEqual(ling.risk.facing, ['saber']);
});

test('once all five enemies are in there is nothing left to be counter-picked by', () => {
  const ling = byId(scoreJunglers(context({
    enemyIds: ['tigreal', 'miya', 'nana', 'saber', 'layla'],
    tiersByJungler: { ling: mine({ karina: 'D', tigreal: 'D' }) },
  }))).ling;
  assert.deepEqual(ling.risk.openCounters, []);
  assert.equal(ling.risk.level, 'none');
  assert.equal(ling.risk.picksLeft, 0);
  assert.deepEqual(ling.risk.facing, ['tigreal']);
});

test('riskLevel steps from none to high', () => {
  assert.deepEqual([0, 1, 3, 4, 8, 9].map(riskLevel), ['none', 'low', 'low', 'medium', 'medium', 'high']);
});

test('a marked enemy jungler counts one and a half times', () => {
  const ling = byId(scoreJunglers(context({
    enemyIds: ['tigreal', 'saber'],
    enemyJunglerId: 'saber',
    tiersByJungler: { ling: mine({ tigreal: 'D', saber: 'S' }) },
  }))).ling;
  assert.equal(ling.matchupScore, 60);
  assert.deepEqual(ling.matchups.map((matchup) => matchup.weight), [1, 1.5]);
});

test('no jungler weight applies until you mark one', () => {
  const ling = byId(scoreJunglers(context({
    enemyIds: ['tigreal', 'saber'],
    tiersByJungler: { ling: mine({ tigreal: 'D', saber: 'S' }) },
  }))).ling;
  assert.equal(ling.matchupScore, 50);
});

test('matchups carry where a rating came from and your notes', () => {
  const [fromGroup, fromHero] = byId(scoreJunglers(context({
    enemyIds: ['tigreal', 'miya'],
    tiersByJungler: { ling: { tigreal: { tier: 'C', source: 'group', groupId: 'blink', groupName: 'Blink skills' }, miya: { tier: 'A', source: 'hero' } } },
    matchups: { ling: { miya: { tier: 'A', quickNote: 'Dodge arrows', comment: 'Wait for ult' } } },
  }))).ling.matchups;
  assert.equal(fromGroup.source, 'group');
  assert.equal(fromGroup.groupName, 'Blink skills');
  assert.equal(fromHero.source, 'hero');
  assert.equal(fromHero.quickNote, 'Dodge arrows');
  assert.equal(fromHero.comment, 'Wait for ult');
});

test('with no enemy picks it ranks by your ratings against every open hero, and keeps no top pick hidden', () => {
  const result = scoreJunglers(context({
    tiersByJungler: { ling: mine({ tigreal: 'S', miya: 'S', nana: 'S', saber: 'S', layla: 'S', karina: 'S', fanny: 'S' }) },
    comfort: { ling: 3, fanny: 3 },
  }));
  assert.equal(result.mode, 'blind');
  assert.equal(byId(result).ling.matchupScore, 100);
  assert.equal(byId(result).fanny.matchupScore, 50);
  assert.equal(result.top.id, 'ling');
});

test('heroes taken by the enemy or banned move to the unavailable list', () => {
  const result = scoreJunglers(context({ junglerIds: ['ling', 'fanny', 'karina'], enemyIds: ['fanny'], unavailableIds: ['karina'] }));
  assert.deepEqual(ids(result), ['ling']);
  assert.deepEqual(result.unavailable.map((entry) => entry.id).sort(), ['fanny', 'karina']);
});

test('ties go to the more comfortable jungler, then more ratings, then name', () => {
  const comfortTie = scoreJunglers(context({ comfortWeight: 0, enemyIds: ['tigreal'], comfort: { ling: 5, fanny: 2 } }));
  assert.deepEqual(ids(comfortTie), ['ling', 'fanny']);
  assert.deepEqual(ids(scoreJunglers(context({ enemyIds: ['tigreal'] }))), ['fanny', 'ling']);
});

test('only my pool keeps the junglers you gave a comfort rating', () => {
  assert.deepEqual(ids(scoreJunglers(context({ comfort: { fanny: 3 }, onlyPool: true }))), ['fanny']);
});

test('comfortScore maps 1 to 5 onto 0 to 100, and unset to the middle', () => {
  assert.deepEqual([1, 2, 3, 4, 5, undefined].map(comfortScore), [0, 25, 50, 75, 100, 50]);
});

test('sortEntries sorts by viability, lowest risk, comfort or name', () => {
  const entries = [
    { id: 'ling', total: 60, comfort: 2, risk: { openCounters: ['a', 'b'], facing: [] } },
    { id: 'fanny', total: 80, comfort: null, risk: { openCounters: ['a', 'b', 'c'], facing: [] } },
    { id: 'karina', total: 40, comfort: 5, risk: { openCounters: [], facing: ['a'] } },
  ];
  const order = (key) => sortEntries(entries, key, (id) => id).map((entry) => entry.id);
  assert.deepEqual(order('viability'), ['fanny', 'ling', 'karina']);
  assert.deepEqual(order('risk'), ['karina', 'ling', 'fanny']);
  assert.deepEqual(order('comfort'), ['karina', 'fanny', 'ling']);
  assert.deepEqual(order('name'), ['fanny', 'karina', 'ling']);
});

test('sorting by viability keeps the ranked order for ties', () => {
  const entries = [
    { id: 'zilong', total: 50, comfort: null, risk: { openCounters: [], facing: [] } },
    { id: 'aamon', total: 50, comfort: null, risk: { openCounters: [], facing: [] } },
  ];
  assert.deepEqual(sortEntries(entries, 'viability', (id) => id).map((entry) => entry.id), ['zilong', 'aamon']);
});

const ranked = (...idList) => idList.map((id) => ({ id }));

test('the graph shows your six best options in ranked order', () => {
  const options = graphOptions(ranked('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'), null);
  assert.deepEqual(options.map((entry) => entry.id), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('a jungler opened from lower in the list takes the last corner of the graph', () => {
  const options = graphOptions(ranked('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'), 'h');
  assert.deepEqual(options.map((entry) => entry.id), ['a', 'b', 'c', 'd', 'e', 'h']);
});

test('the graph leaves the order alone when the opened jungler is already on it', () => {
  const options = graphOptions(ranked('a', 'b', 'c'), 'b');
  assert.deepEqual(options.map((entry) => entry.id), ['a', 'b', 'c']);
});

test('banSuggestions lists open heroes that counter the most of your pool', () => {
  const suggestions = banSuggestions({
    junglerIds: ['ling', 'fanny', 'karina'],
    tiersByJungler: {
      ling: mine({ saber: 'D', nana: 'C' }),
      fanny: mine({ saber: 'D', miya: 'D', nana: 'C' }),
      karina: mine({ saber: 'D' }),
    },
    comfort: { ling: 5, fanny: 3, karina: 1 },
    takenIds: ['miya'],
  });
  assert.deepEqual(suggestions.map((item) => item.heroId), ['saber', 'nana']);
  assert.deepEqual(suggestions[0].counters, ['ling', 'fanny']);
});

test('banSuggestions uses your whole roster until you set any comfort', () => {
  const suggestions = banSuggestions({
    junglerIds: ['ling', 'fanny'],
    tiersByJungler: { fanny: mine({ saber: 'D' }) },
    comfort: {},
    takenIds: [],
  });
  assert.deepEqual(suggestions.map((item) => item.heroId), ['saber']);
});
