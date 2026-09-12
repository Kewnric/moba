import { HERO_META, MATCHUP_TENTHS, STATS_HERO_ORDER } from '../data/stats.js';

// Expands the compact stats table into { heroId: { enemyId: winRateChangeInPoints } }, skipping gaps
// and a hero's entry against itself.
export function decodeMatchups(order, rows) {
  const matchups = {};
  order.forEach((heroId, rowIndex) => {
    const row = rows[rowIndex] || [];
    const entries = {};
    order.forEach((enemyId, columnIndex) => {
      const tenths = row[columnIndex];
      if (enemyId !== heroId && typeof tenths === 'number') entries[enemyId] = tenths / 10;
    });
    matchups[heroId] = entries;
  });
  return matchups;
}

export const MATCHUPS = decodeMatchups(STATS_HERO_ORDER, MATCHUP_TENTHS);

// How many percentage points heroId's win rate changes when facing enemyId, or null without data.
export const matchupDelta = (heroId, enemyId) => {
  const entries = MATCHUPS[heroId];
  return entries && typeof entries[enemyId] === 'number' ? entries[enemyId] : null;
};

export const heroMeta = (heroId) => HERO_META[heroId] || null;
