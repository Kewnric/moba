import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LANES } from '../src/data/heroes.js';
import { scoreJunglers, SCORE_PARTS, MAX_RISK } from '../src/lib/scoring.js';

const HERO_INFO = {
  ling: { roles: ['Assassin'], specialities: ['Chase', 'Burst'] },
  fanny: { roles: ['Assassin'], specialities: ['Chase', 'Finisher'] },
  karina: { roles: ['Assassin'], specialities: ['Finisher', 'Magic Damage'] },
  baxia: { roles: ['Tank'], specialities: ['Support', 'Damage'] },
  saber: { roles: ['Assassin'], specialities: ['Charge', 'Finisher'] },
  tigreal: { roles: ['Tank'], specialities: ['Crowd Control', 'Initiator'] },
  miya: { roles: ['Marksman'], specialities: ['Damage'] },
  nana: { roles: ['Mage'], specialities: ['Poke', 'Crowd Control'] },
  layla: { roles: ['Marksman'], specialities: ['Damage'] },
};

const context = (overrides = {}) => ({
  junglerIds: ['ling', 'fanny'],
  enemies: [],
  allyIds: [],
  unavailableIds: [],
  ratings: {},
  comfort: {},
  onlyPool: false,
  matchupStats: {},
  meta: {},
  heroInfo: (heroId) => HERO_INFO[heroId] || null,
  ...overrides,
});

const enemy = (heroId, lane = null) => ({ heroId, lane });
const byId = (result) => Object.fromEntries(result.ranked.map((entry) => [entry.id, entry]));
const ids = (result) => result.ranked.map((entry) => entry.id);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} is not ${expected}`);

test('score parts add up to 100 and a jungler with no information scores 50', () => {
  assert.deepEqual(SCORE_PARTS, { matchup: 45, teamFit: 20, comfort: 20, meta: 15 });
  assert.equal(MAX_RISK, 10);
  const ling = byId(scoreJunglers(context())).ling;
  assert.deepEqual(ling.parts, { matchup: 22.5, teamFit: 10, comfort: 10, meta: 7.5, risk: 0 });
  assert.equal(ling.total, 50);
});

test('with no enemy picks it ranks early picks but recommends nobody', () => {
  const result = scoreJunglers(context());
  assert.equal(result.mode, 'blind');
  assert.equal(result.recommended, null);
  assert.equal(result.ranked.length, 2);
});

test('never ranks a hero that either team picked or anyone banned', () => {
  const result = scoreJunglers(context({ junglerIds: ['ling', 'fanny', 'karina', 'baxia'], enemies: [enemy('fanny')], allyIds: ['baxia'], unavailableIds: ['karina'] }));
  assert.equal(result.mode, 'counter');
  assert.deepEqual(ids(result), ['ling']);
});

test('your tier rating counts fully against an enemy', () => {
  const ling = byId(scoreJunglers(context({ enemies: [enemy('tigreal')], ratings: { ling: { tigreal: { tier: 'S' } } } }))).ling;
  near(ling.parts.matchup, 45 * 0.75);
  assert.deepEqual(ling.coverage, { rated: 1, known: 1, total: 1 });
  assert.equal(ling.details.matchups[0].source, 'you');
});

test('matchup details include your quick tip and long note', () => {
  const ratings = { ling: { tigreal: { tier: 'A', quickNote: 'Kite his ult', comment: 'Wait for his ult before diving' } } };
  const [matchup] = byId(scoreJunglers(context({ enemies: [enemy('tigreal')], ratings }))).ling.details.matchups;
  assert.equal(matchup.quickNote, 'Kite his ult');
  assert.equal(matchup.comment, 'Wait for his ult before diving');
});

test('win-rate stats fill in matchups you have not rated, at half weight', () => {
  const ling = byId(scoreJunglers(context({ enemies: [enemy('tigreal')], matchupStats: { ling: { tigreal: 5 } } }))).ling;
  near(ling.parts.matchup, 45 * (1 / 1.5));
  assert.deepEqual(ling.coverage, { rated: 0, known: 1, total: 1 });
  assert.equal(ling.details.matchups[0].source, 'stats');
  assert.equal(ling.details.matchups[0].delta, 5);
});

test('your rating replaces the stats for the same matchup', () => {
  const ling = byId(scoreJunglers(context({
    enemies: [enemy('tigreal')],
    ratings: { ling: { tigreal: { tier: 'D' } } },
    matchupStats: { ling: { tigreal: 5 } },
  }))).ling;
  near(ling.parts.matchup, 45 * 0.25);
  assert.equal(ling.details.matchups[0].source, 'you');
});

test('the enemy jungler counts one and a half times', () => {
  const ling = byId(scoreJunglers(context({
    enemies: [enemy('tigreal', LANES.ROAM), enemy('saber', LANES.JUNGLE)],
    ratings: { ling: { tigreal: { tier: 'D' }, saber: { tier: 'S' } } },
  }))).ling;
  near(ling.parts.matchup, 45 * (2 / 3.5));
  assert.deepEqual(ling.details.matchups.map((m) => m.weight), [1, 1.5]);
  assert.equal(ling.total, 53.2);
});

test('a jungler is recommended once half the enemies have a rating or stats', () => {
  const result = scoreJunglers(context({
    enemies: [enemy('tigreal'), enemy('miya'), enemy('nana')],
    ratings: { fanny: { tigreal: { tier: 'S' } } },
    matchupStats: { ling: { tigreal: 2, miya: 2 } },
  }));
  const entries = byId(result);
  assert.equal(entries.ling.confident, true);
  assert.equal(entries.fanny.confident, false);
  assert.ok(entries.fanny.total > entries.ling.total);
  assert.deepEqual(ids(result), ['ling', 'fanny']);
  assert.equal(result.recommended.id, 'ling');
});

test('team fit stays neutral until two allies are picked', () => {
  const entries = byId(scoreJunglers(context({ junglerIds: ['ling', 'baxia'], allyIds: ['miya'] })));
  assert.equal(entries.ling.parts.teamFit, 10);
  assert.equal(entries.baxia.parts.teamFit, 10);
});

test('team fit rewards a frontline your team is missing', () => {
  const entries = byId(scoreJunglers(context({ junglerIds: ['ling', 'baxia'], allyIds: ['miya', 'nana'] })));
  near(entries.baxia.parts.teamFit, 20 * 0.75);
  near(entries.ling.parts.teamFit, 20 * 0.35);
  assert.ok(entries.baxia.details.teamFit.reasons.some((reason) => /frontline/i.test(reason)));
});

test('team fit rewards magic damage when your team has none', () => {
  const entries = byId(scoreJunglers(context({ junglerIds: ['ling', 'karina'], allyIds: ['tigreal', 'miya'] })));
  near(entries.karina.parts.teamFit, 20 * 0.75);
  near(entries.ling.parts.teamFit, 20 * 0.4);
  assert.ok(entries.karina.details.teamFit.reasons.some((reason) => /magic/i.test(reason)));
});

test('team fit adds synergy with a teammate already picked', () => {
  const ling = byId(scoreJunglers(context({ junglerIds: ['ling'], allyIds: ['angela'], synergyStats: { ling: { angela: 1.5 } } }))).ling;
  near(ling.parts.teamFit, 20 * 0.625);
  assert.deepEqual(ling.details.teamFit.synergy, [{ allyId: 'angela', delta: 1.5 }]);
});

test('synergy is capped, so a clashing teammate costs at most a quarter of team fit', () => {
  const ling = byId(scoreJunglers(context({ junglerIds: ['ling'], allyIds: ['hayabusa'], synergyStats: { ling: { hayabusa: -16 } } }))).ling;
  near(ling.parts.teamFit, 20 * 0.25);
  assert.deepEqual(ling.details.teamFit.synergy, [{ allyId: 'hayabusa', delta: -16 }]);
});

test('synergy averages across teammates on top of team composition', () => {
  const ling = byId(scoreJunglers(context({ junglerIds: ['ling'], allyIds: ['tigreal', 'nana'], synergyStats: { ling: { tigreal: 3, nana: -1 } } }))).ling;
  near(ling.parts.teamFit, 20 * (0.5 + (1 / 3) * 0.25));
  assert.ok(ling.details.teamFit.reasons.some((reason) => /already has/i.test(reason)));
});

test('team fit lists no synergy without stats for your teammates', () => {
  const ling = byId(scoreJunglers(context({ junglerIds: ['ling'], allyIds: ['angela'] }))).ling;
  assert.deepEqual(ling.details.teamFit.synergy, []);
  assert.equal(ling.parts.teamFit, 10);
});

test('comfort turns a 1 to 5 rating into up to 20 points', () => {
  const entries = byId(scoreJunglers(context({ junglerIds: ['ling', 'fanny', 'karina'], comfort: { ling: 5, fanny: 1 } })));
  assert.equal(entries.ling.parts.comfort, 20);
  assert.equal(entries.fanny.parts.comfort, 0);
  assert.equal(entries.karina.parts.comfort, 10);
});

test('only my pool keeps the junglers you gave a comfort rating', () => {
  const result = scoreJunglers(context({ comfort: { fanny: 3 }, onlyPool: true }));
  assert.deepEqual(ids(result), ['fanny']);
});

test('meta gives up to 15 points from win rate', () => {
  const entries = byId(scoreJunglers(context({
    junglerIds: ['ling', 'fanny', 'karina', 'baxia'],
    meta: { ling: { winRate: 0.55 }, fanny: { winRate: 0.45 }, karina: { winRate: 0.53 } },
  })));
  assert.equal(entries.ling.parts.meta, 15);
  assert.equal(entries.fanny.parts.meta, 0);
  near(entries.karina.parts.meta, 12);
  assert.equal(entries.baxia.parts.meta, 7.5);
});

test('counter-pick risk subtracts points while strong counters are still open', () => {
  const entries = byId(scoreJunglers(context({ matchupStats: { ling: { saber: -4, natalia: -3.5, gloo: 3 } } })));
  assert.equal(entries.ling.parts.risk, 4);
  assert.deepEqual(entries.ling.details.risk.counterIds, ['saber', 'natalia']);
  assert.equal(entries.fanny.parts.risk, 0);
  assert.equal(entries.ling.total, 46);
});

test('counter-pick risk skips counters already taken and shrinks as the enemy fills picks', () => {
  const ling = byId(scoreJunglers(context({
    enemies: [enemy('tigreal'), enemy('miya'), enemy('nana'), enemy('layla')],
    unavailableIds: ['saber'],
    matchupStats: { ling: { saber: -4, natalia: -3.5 } },
  }))).ling;
  near(ling.parts.risk, 0.4);
  assert.deepEqual(ling.details.risk.counterIds, ['natalia']);
});

test('my-ratings mode ignores win-rate stats for matchups, synergy, meta and counters', () => {
  const ling = byId(scoreJunglers(context({
    ratingSource: 'mine',
    enemies: [enemy('tigreal'), enemy('miya')],
    allyIds: ['angela'],
    ratings: { ling: { tigreal: { tier: 'S' } } },
    matchupStats: { ling: { miya: 5, saber: -4 } },
    synergyStats: { ling: { angela: 1.5 } },
    meta: { ling: { winRate: 0.55 } },
  }))).ling;
  near(ling.parts.matchup, 45 * 0.75);
  assert.equal(ling.details.matchups[1].source, null);
  assert.deepEqual(ling.coverage, { rated: 1, known: 1, total: 2 });
  assert.equal(ling.parts.teamFit, 10);
  assert.deepEqual(ling.details.teamFit.synergy, []);
  assert.equal(ling.parts.meta, 7.5);
  assert.equal(ling.details.winRate, null);
  assert.equal(ling.parts.risk, 0);
});

test('stats mode ignores your tier ratings, counts stats at full weight and keeps comfort', () => {
  const ling = byId(scoreJunglers(context({
    ratingSource: 'stats',
    enemies: [enemy('tigreal')],
    ratings: { ling: { tigreal: { tier: 'D' } } },
    matchupStats: { ling: { tigreal: 5 } },
    comfort: { ling: 5 },
  }))).ling;
  near(ling.parts.matchup, 45 * 0.75);
  assert.equal(ling.details.matchups[0].source, 'stats');
  assert.deepEqual(ling.coverage, { rated: 0, known: 1, total: 1 });
  assert.equal(ling.parts.comfort, 20);
});

test('in both mode your rating overrides the stats for counter-pick risk', () => {
  const ling = byId(scoreJunglers(context({
    matchupStats: { ling: { saber: -4, natalia: -3.5 } },
    ratings: { ling: { saber: { tier: 'B' }, nana: { tier: 'D' } } },
  }))).ling;
  assert.equal(ling.parts.risk, 4);
  assert.deepEqual(ling.details.risk.counterIds, ['nana', 'natalia']);
});

test('my-ratings mode counts open heroes you rated D as counters', () => {
  const ling = byId(scoreJunglers(context({
    ratingSource: 'mine',
    ratings: { ling: { nana: { tier: 'D' }, saber: { tier: 'C' } } },
    matchupStats: { ling: { natalia: -5 } },
  }))).ling;
  assert.equal(ling.parts.risk, 2);
  assert.deepEqual(ling.details.risk.counterIds, ['nana']);
});

test('an unknown rating source behaves like both', () => {
  const ling = byId(scoreJunglers(context({ ratingSource: 'nonsense', enemies: [enemy('tigreal')], matchupStats: { ling: { tigreal: 5 } } }))).ling;
  near(ling.parts.matchup, 45 * (1 / 1.5));
  assert.equal(ling.details.matchups[0].source, 'stats');
});

test('ties are ranked by id', () => {
  assert.deepEqual(ids(scoreJunglers(context({ junglerIds: ['ling', 'fanny'] }))), ['fanny', 'ling']);
});
