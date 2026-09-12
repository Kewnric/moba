// JunglerOS draft logic: hero lists, enemy slots and jungler ranking. No React or browser code,
// so the app and the tests in tests/ run exactly the same functions.

export const TIER_WEIGHTS = { S: 10, A: 7, B: 5, C: 3, D: 1 };
const NEUTRAL_WEIGHT = TIER_WEIGHTS.B;
// Every jungler starts with this many imaginary "even" matchups, so one lucky rating can't carry it.
const PRIOR_MATCHUPS = 2;
// Share of the entered enemies a jungler must be rated against before it can be recommended.
export const MIN_COVERAGE = 0.5;

export function buildHeroList(rawByRole) {
  const byName = new Map();
  Object.entries(rawByRole).forEach(([role, names]) => {
    names.forEach((name) => {
      if (!byName.has(name)) byName.set(name, { id: name, name, roles: [] });
      const hero = byName.get(name);
      if (!hero.roles.includes(role)) hero.roles.push(role);
    });
  });
  return Array.from(byName.values());
}

const isInSlots = (slots, hero, ignoreIndex = -1) =>
  slots.some((slot, index) => index !== ignoreIndex && slot && slot.name === hero.name);

export function addToFirstEmptySlot(slots, hero) {
  const index = slots.findIndex((slot) => !slot);
  if (index === -1 || isInSlots(slots, hero)) return slots;
  const next = slots.slice();
  next[index] = hero;
  return next;
}

export function placeInSlot(slots, index, hero) {
  if (isInSlots(slots, hero, index)) return slots;
  const next = slots.slice();
  next[index] = hero;
  return next;
}

export function moveSlot(slots, from, to) {
  if (from === to) return slots;
  const next = slots.slice();
  next[from] = slots[to] || null;
  next[to] = slots[from] || null;
  return next;
}

export function rankJunglers(junglerNames, enemyNames, matchupData) {
  const enemies = Array.from(new Set(enemyNames.filter(Boolean)));
  if (enemies.length === 0) return { ranked: [], recommended: null };

  const ranked = Array.from(new Set(junglerNames))
    .filter((name) => !enemies.includes(name))
    .map((name) => {
      const data = (matchupData && matchupData[name]) || {};
      let points = 0;
      let rated = 0;
      enemies.forEach((enemy) => {
        const tier = data[enemy] && data[enemy].tier;
        if (Object.prototype.hasOwnProperty.call(TIER_WEIGHTS, tier)) {
          points += TIER_WEIGHTS[tier];
          rated += 1;
        }
      });
      const coverage = rated / enemies.length;
      return {
        name,
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
      a.name.localeCompare(b.name));

  return { ranked, recommended: ranked.length && ranked[0].confident ? ranked[0] : null };
}
