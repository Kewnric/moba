import { compactName } from './heroIds.js';

// Filters a hero list by lane, by a forgiving name search, and by ids to leave out.
export function filterHeroes(heroes, { lane = 'All', search = '', hideIds = [] } = {}) {
  const query = compactName(search);
  const hidden = new Set(hideIds);
  return heroes.filter((hero) =>
    (lane === 'All' || hero.lanes.includes(lane)) &&
    !hidden.has(hero.id) &&
    (!query || compactName(hero.name).includes(query)));
}

const heroesByLabel = (heroes, labelsOf) => {
  const labels = new Map();
  heroes.forEach((hero) => {
    labelsOf(hero).forEach((label) => {
      if (!labels.has(label)) labels.set(label, []);
      labels.get(label).push(hero.id);
    });
  });
  return Array.from(labels, ([label, heroIds]) => ({ value: label, label, heroIds }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// The game's own labels, for filling a skill group quickly. These only say who to add to a list; they never rate anyone.
export const bulkAddOptions = (heroes) => [
  { label: 'Role', options: heroesByLabel(heroes, (hero) => hero.roles) },
  { label: 'Speciality', options: heroesByLabel(heroes, (hero) => hero.specialities) },
  { label: 'Lane', options: heroesByLabel(heroes, (hero) => hero.lanes) },
];
