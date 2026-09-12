// JunglerOS draft logic: enemy slots and jungler ranking, with heroes referred to by id. No React or
// browser code, so the app and the tests in tests/ run exactly the same functions.

export const TIER_WEIGHTS = { S: 10, A: 7, B: 5, C: 3, D: 1 };
const NEUTRAL_WEIGHT = TIER_WEIGHTS.B;
// Every jungler starts with this many imaginary "even" matchups, so one lucky rating can't carry it.
const PRIOR_MATCHUPS = 2;
// Share of the entered enemies a jungler must be rated against before it can be recommended.
export const MIN_COVERAGE = 0.5;

export const isTier = (tier) => Object.prototype.hasOwnProperty.call(TIER_WEIGHTS, tier);

export function addToFirstEmptySlot(slots, heroId) {
  const index = slots.findIndex((slot) => !slot);
  if (index === -1 || slots.includes(heroId)) return slots;
  const next = slots.slice();
  next[index] = heroId;
  return next;
}

export function placeInSlot(slots, index, heroId) {
  if (slots.some((slot, i) => i !== index && slot === heroId)) return slots;
  const next = slots.slice();
  next[index] = heroId;
  return next;
}

export function moveSlot(slots, from, to) {
  if (from === to) return slots;
  const next = slots.slice();
  next[from] = slots[to] || null;
  next[to] = slots[from] || null;
  return next;
}

export function rankJunglers(junglerIds, enemyIds, matchups) {
  const enemies = Array.from(new Set(enemyIds.filter(Boolean)));
  if (enemies.length === 0) return { ranked: [], recommended: null };

  const ranked = Array.from(new Set(junglerIds))
    .filter((id) => !enemies.includes(id))
    .map((id) => {
      const data = (matchups && matchups[id]) || {};
      let points = 0;
      let rated = 0;
      enemies.forEach((enemyId) => {
        const tier = data[enemyId] && data[enemyId].tier;
        if (isTier(tier)) {
          points += TIER_WEIGHTS[tier];
          rated += 1;
        }
      });
      const coverage = rated / enemies.length;
      return {
        id,
        score: (points + PRIOR_MATCHUPS * NEUTRAL_WEIGHT) / (rated + PRIOR_MATCHUPS),
        rated,
        total: enemies.length,
        coverage,
        confident: rated > 0 && coverage >= MIN_COVERAGE,
        data,
      };
    })
    .sort((a, b) =>
      (b.confident - a.confident) ||
      (b.score - a.score) ||
      (b.rated - a.rated) ||
      a.id.localeCompare(b.id));

  return { ranked, recommended: ranked.length && ranked[0].confident ? ranked[0] : null };
}
