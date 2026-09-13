// Recorded games: the draft, the jungler you played, whether you won, and what JunglerOS ranked first.
// Plain functions shared by the app and the tests in tests/.
import { TIERS, isTier } from '../data/tiers.js';

export const MAX_GAMES = 500;
const RESULTS = ['win', 'loss'];

const isSlotList = (value) => Array.isArray(value) && value.every((slot) => slot === null || typeof slot === 'string');
const rate = (wins, games) => (games ? wins / games : null);

export const isGameRecord = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.playedAt === 'string' &&
  !Number.isNaN(Date.parse(value.playedAt)) &&
  RESULTS.includes(value.result) &&
  typeof value.playedId === 'string' &&
  (value.topPickId === null || typeof value.topPickId === 'string') &&
  Boolean(value.draft) &&
  typeof value.draft === 'object' &&
  isSlotList(value.draft.ally) &&
  isSlotList(value.draft.enemy);

export const isHistory = (value) => Array.isArray(value) && value.every(isGameRecord);

let sequence = 0;

// topPickId is the jungler JunglerOS ranked first for the final enemy lineup, with your own slot empty.
export function createGameRecord({ draft, result, playedId, topPickId = null, id, now = new Date() }) {
  sequence += 1;
  return {
    id: id || `${now.getTime().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    playedAt: now.toISOString(),
    result,
    playedId,
    topPickId: topPickId || null,
    draft: Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])),
  };
}

export const addGame = (history, record, limit = MAX_GAMES) =>
  [record, ...history.filter((game) => game.id !== record.id)].slice(0, limit);

export const removeGame = (history, id) => history.filter((game) => game.id !== id);

export function mergeHistory(current, imported) {
  const byId = new Map(current.map((game) => [game.id, game]));
  imported.forEach((game) => { if (!byId.has(game.id)) byId.set(game.id, game); });
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, MAX_GAMES);
}

export function summarizeHistory(history) {
  const wins = history.filter((game) => game.result === 'win').length;
  const tracked = history.filter((game) => game.topPickId);
  const tally = (games) => {
    const won = games.filter((game) => game.result === 'win').length;
    return { games: games.length, wins: won, winRate: rate(won, games.length) };
  };

  const byJunglerMap = new Map();
  history.forEach((game) => {
    const entry = byJunglerMap.get(game.playedId) || { id: game.playedId, games: 0, wins: 0, losses: 0 };
    entry.games += 1;
    if (game.result === 'win') entry.wins += 1; else entry.losses += 1;
    byJunglerMap.set(game.playedId, entry);
  });
  const byJungler = Array.from(byJunglerMap.values())
    .map((entry) => ({ ...entry, winRate: rate(entry.wins, entry.games) }))
    .sort((a, b) => (b.games - a.games) || (b.winRate - a.winRate) || a.id.localeCompare(b.id));

  return {
    games: history.length,
    wins,
    losses: history.length - wins,
    winRate: rate(wins, history.length),
    topPick: tally(tracked.filter((game) => game.playedId === game.topPickId)),
    otherPick: tally(tracked.filter((game) => game.playedId !== game.topPickId)),
    byJungler,
  };
}

export const tierFromWinRate = (winRate) => {
  if (winRate >= 0.7) return 'S';
  if (winRate >= 0.55) return 'A';
  if (winRate >= 0.45) return 'B';
  if (winRate >= 0.3) return 'C';
  return 'D';
};

// Matchups you've played at least minGames times that are unrated, or rated two or more tiers away
// from what your results suggest.
export function reviewRatings(history, ratings, { minGames = 3 } = {}) {
  const pairs = new Map();
  history.forEach((game) => {
    new Set(game.draft.enemy.filter(Boolean)).forEach((enemyId) => {
      const key = `${game.playedId}|${enemyId}`;
      const pair = pairs.get(key) || { junglerId: game.playedId, enemyId, games: 0, wins: 0 };
      pair.games += 1;
      if (game.result === 'win') pair.wins += 1;
      pairs.set(key, pair);
    });
  });

  return Array.from(pairs.values())
    .filter((pair) => pair.games >= minGames)
    .map((pair) => {
      const winRate = pair.wins / pair.games;
      const suggestedTier = tierFromWinRate(winRate);
      const entry = ratings[pair.junglerId] && ratings[pair.junglerId][pair.enemyId];
      const tier = entry && isTier(entry.tier) ? entry.tier : null;
      const verdict = !tier ? 'unrated'
        : Math.abs(TIERS.indexOf(tier) - TIERS.indexOf(suggestedTier)) >= 2 ? 'mismatch' : null;
      return { ...pair, winRate, tier, suggestedTier, verdict };
    })
    .filter((pair) => pair.verdict)
    .sort((a, b) => (b.games - a.games) || a.junglerId.localeCompare(b.junglerId) || a.enemyId.localeCompare(b.enemyId));
}
