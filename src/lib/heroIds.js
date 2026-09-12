import { HEROES } from '../data/heroes.js';

// A hero id is the lowercase name with every run of other characters turned into one dash.
export const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Lowercase letters and digits only, so "Chang'e", "chang e" and "CHANGE" all compare equal.
export const compactName = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ID_BY_COMPACT_NAME = new Map(HEROES.map((hero) => [compactName(hero.name), hero.id]));

// Finds a hero's id from a name in any spelling ("Yi Sun-shin", "chang e", "XBorg").
export const findHeroId = (name) => {
  const key = compactName(name);
  return (key && ID_BY_COMPACT_NAME.get(key)) || null;
};
