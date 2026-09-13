import { HERO_META, MATCHUP_TENTHS, STATS_HERO_ORDER, SYNERGY_TENTHS } from '../data/stats.js';

// Expands a compact stats table into { heroId: { otherId: winRateChangeInPoints } }, skipping gaps
// and a hero's entry for itself.
export function decodeMatchups(order, rows) {
  const matchups = {};
  order.forEach((heroId, rowIndex) => {
    const row = rows[rowIndex] || [];
    const entries = {};
    order.forEach((otherId, columnIndex) => {
      const tenths = row[columnIndex];
      if (otherId !== heroId && typeof tenths === 'number') entries[otherId] = tenths / 10;
    });
    matchups[heroId] = entries;
  });
  return matchups;
}

export const MATCHUPS = decodeMatchups(STATS_HERO_ORDER, MATCHUP_TENTHS);
export const SYNERGY = decodeMatchups(STATS_HERO_ORDER, SYNERGY_TENTHS);

const lookup = (table, heroId, otherId) => {
  const entries = table[heroId];
  return entries && typeof entries[otherId] === 'number' ? entries[otherId] : null;
};

// How many percentage points heroId's win rate changes when facing enemyId, or null without data.
export const matchupDelta = (heroId, enemyId) => lookup(MATCHUPS, heroId, enemyId);

// How many percentage points heroId's win rate changes with allyId on the same team, or null without data.
export const synergyDelta = (heroId, allyId) => lookup(SYNERGY, heroId, allyId);

export const heroMeta = (heroId) => HERO_META[heroId] || null;
