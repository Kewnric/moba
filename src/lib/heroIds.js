import { HEROES } from '../data/heroes.js';

// A hero id is the lowercase name with every run of other characters turned into one dash.
export const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const compact = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ID_BY_COMPACT_NAME = new Map(HEROES.map((hero) => [compact(hero.name), hero.id]));

// Finds a hero's id from a name in any spelling ("Yi Sun-shin", "chang e", "XBorg").
export const findHeroId = (name) => {
  const key = compact(name);
  return (key && ID_BY_COMPACT_NAME.get(key)) || null;
};
