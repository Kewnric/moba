import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  MAX_GAMES,
  addGame,
  createGameRecord,
  isGameRecord,
  isHistory,
  mergeHistory,
  removeGame,
  reviewRatings,
  summarizeHistory,
  tierFromWinRate,
} from '../src/lib/history.js';

const game = (id, result, playedId, enemy, { topPickId = null, playedAt = `2026-09-${String(10 + Number(id.slice(1))).padStart(2, '0')}T12:00:00.000Z` } = {}) => ({
  id,
  playedAt,
  result,
  playedId,
  topPickId,
  draft: { ally: [playedId, null, null, null, null], enemy },
});

test('createGameRecord copies the draft and stamps the time', () => {
  const draft = {
    firstPick: 'enemy',
    bansPerTeam: 3,
    ally: ['ling', 'tigreal', null, null, null],
    enemy: ['saber', null, null, null, null],
    allyBans: ['fanny', null, null],
    enemyBans: [null, null, null],
    enemyLanes: ['Jungling', null, null, null, null],
  };
  const record = createGameRecord({ draft, result: 'win', playedId: 'ling', topPickId: 'karina', id: 'abc', now: new Date('2026-09-13T08:30:00Z') });
  assert.deepEqual(record, { id: 'abc', playedAt: '2026-09-13T08:30:00.000Z', result: 'win', playedId: 'ling', topPickId: 'karina', draft });
  assert.notEqual(record.draft.ally, draft.ally);
});

test('createGameRecord makes a unique id when none is given', () => {
  const draft = { ally: ['ling'], enemy: [] };
  const a = createGameRecord({ draft, result: 'loss', playedId: 'ling' });
  const b = createGameRecord({ draft, result: 'loss', playedId: 'ling' });
  assert.notEqual(a.id, b.id);
  assert.equal(a.topPickId, null);
});

test('isGameRecord accepts saved games and rejects broken ones', () => {
  assert.equal(isGameRecord(game('g1', 'win', 'ling', ['saber'])), true);
  assert.equal(isGameRecord({ ...game('g1', 'win', 'ling', ['saber']), result: 'draw' }), false);
  assert.equal(isGameRecord({ ...game('g1', 'win', 'ling', ['saber']), playedAt: 'yesterday' }), false);
  assert.equal(isGameRecord({ ...game('g1', 'win', 'ling', ['saber']), draft: { ally: 'ling', enemy: [] } }), false);
  assert.equal(isHistory([game('g1', 'win', 'ling', ['saber'])]), true);
  assert.equal(isHistory({}), false);
});

test('addGame puts the newest game first and keeps at most the limit', () => {
  const history = [game('g2', 'win', 'ling', []), game('g1', 'loss', 'ling', [])];
  const next = addGame(history, game('g3', 'win', 'fanny', []), 2);
  assert.deepEqual(next.map((g) => g.id), ['g3', 'g2']);
  assert.equal(history.length, 2);
  assert.equal(MAX_GAMES, 500);
});

test('removeGame deletes one game by id', () => {
  const history = [game('g2', 'win', 'ling', []), game('g1', 'loss', 'ling', [])];
  assert.deepEqual(removeGame(history, 'g2').map((g) => g.id), ['g1']);
});

test('mergeHistory combines two histories without duplicates, newest first', () => {
  const merged = mergeHistory([game('g1', 'win', 'ling', []), game('g3', 'win', 'ling', [])], [game('g2', 'loss', 'ling', []), game('g1', 'win', 'ling', [])]);
  assert.deepEqual(merged.map((g) => g.id), ['g3', 'g2', 'g1']);
});

test('summarizeHistory counts results overall, by jungler and against the top pick', () => {
  const history = [
    game('g1', 'win', 'ling', [], { topPickId: 'ling' }),
    game('g2', 'loss', 'ling', [], { topPickId: 'fanny' }),
    game('g3', 'win', 'fanny', [], { topPickId: 'fanny' }),
    game('g4', 'win', 'ling', []),
  ];
  assert.deepEqual(summarizeHistory(history), {
    games: 4,
    wins: 3,
    losses: 1,
    winRate: 0.75,
    topPick: { games: 2, wins: 2, winRate: 1 },
    otherPick: { games: 1, wins: 0, winRate: 0 },
    byJungler: [
      { id: 'ling', games: 3, wins: 2, losses: 1, winRate: 2 / 3 },
      { id: 'fanny', games: 1, wins: 1, losses: 0, winRate: 1 },
    ],
  });
});

test('summarizeHistory of no games has no win rates', () => {
  const summary = summarizeHistory([]);
  assert.equal(summary.games, 0);
  assert.equal(summary.winRate, null);
  assert.equal(summary.topPick.winRate, null);
  assert.deepEqual(summary.byJungler, []);
});

test('tierFromWinRate maps results to tiers', () => {
  assert.deepEqual([0.8, 0.6, 0.5, 0.35, 0.1].map(tierFromWinRate), ['S', 'A', 'B', 'C', 'D']);
});

test('reviewRatings flags unrated matchups and ratings your results disagree with', () => {
  const history = [
    game('g1', 'loss', 'ling', ['saber', 'tigreal', 'miya']),
    game('g2', 'loss', 'ling', ['saber', 'tigreal', 'miya']),
    game('g3', 'win', 'ling', ['saber', 'tigreal', 'miya']),
    game('g4', 'loss', 'ling', ['saber', 'tigreal', 'miya']),
    game('g5', 'win', 'fanny', ['saber']),
  ];
  const ratings = { ling: { saber: { tier: 'A' }, tigreal: { tier: 'C' } } };
  assert.deepEqual(reviewRatings(history, ratings), [
    { junglerId: 'ling', enemyId: 'miya', games: 4, wins: 1, winRate: 0.25, tier: null, suggestedTier: 'D', verdict: 'unrated' },
    { junglerId: 'ling', enemyId: 'saber', games: 4, wins: 1, winRate: 0.25, tier: 'A', suggestedTier: 'D', verdict: 'mismatch' },
  ]);
});

test('reviewRatings needs enough games before suggesting anything', () => {
  const history = [game('g1', 'win', 'ling', ['saber']), game('g2', 'win', 'ling', ['saber'])];
  assert.deepEqual(reviewRatings(history, {}), []);
  assert.equal(reviewRatings(history, {}, { minGames: 2 }).length, 1);
});
