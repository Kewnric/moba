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
