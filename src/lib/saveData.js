import { HEROES, HERO_BY_ID, LANES } from '../data/heroes.js';
import { isComfortRating } from './dataReducer.js';
import { findHeroId } from './heroIds.js';
import { isPlainObject, isStringArray } from './storage.js';

// Saved data, version 2: { version, junglers: [heroId], matchups: { junglerId: { enemyId: entry } },
// comfort?: { junglerId: 1-5 } } where an entry holds any of { tier, quickNote, comment }.
// Custom icons are saved separately by hero id.

export const SAVE_VERSION = 2;

export const STORAGE_KEYS = {
  data: 'jungleros_data_v2',
  images: 'jungleros_images_v2',
  // Name-based saves from before hero ids. They're left in place after upgrading, as a fallback.
  legacyMatchups: 'moba_matchup_data_v1',
  legacyJunglers: 'moba_jungler_list_v1',
  legacyImages: 'moba_custom_images_v1',
};

export const DEFAULT_JUNGLERS = HEROES.filter((hero) => hero.lanes.includes(LANES.JUNGLE)).map((hero) => hero.id);

export const emptyData = () => ({ version: SAVE_VERSION, junglers: [...DEFAULT_JUNGLERS], matchups: {} });

const isComfortMap = (value) => isPlainObject(value) && Object.values(value).every(isComfortRating);

export const isSaveData = (value) =>
  isPlainObject(value) &&
  value.version === SAVE_VERSION &&
  isStringArray(value.junglers) &&
  isPlainObject(value.matchups) &&
  (value.comfort === undefined || isComfortMap(value.comfort));

// Rebuilds roster, matchups, comfort and icons with every hero key passed through toId. Keys that
// aren't heroes are left out and listed in `unmatched`. A missing roster falls back to the defaults.
function convertKeys({ junglers, matchups, comfort, images }, toId) {
  const unmatched = [];
  const idFor = (key) => {
    const id = toId(key);
    if (!id && !unmatched.includes(key)) unmatched.push(key);
    return id;
  };

  const junglerIds = Array.isArray(junglers)
    ? [...new Set(junglers.map(idFor).filter(Boolean))]
    : [...DEFAULT_JUNGLERS];

  const matchupsById = {};
  Object.entries(isPlainObject(matchups) ? matchups : {}).forEach(([junglerKey, entries]) => {
    const junglerId = idFor(junglerKey);
    if (!junglerId || !isPlainObject(entries)) return;
    const converted = {};
    Object.entries(entries).forEach(([enemyKey, entry]) => {
      const enemyId = idFor(enemyKey);
      if (enemyId && isPlainObject(entry)) converted[enemyId] = { ...entry };
    });
    if (Object.keys(converted).length) matchupsById[junglerId] = { ...(matchupsById[junglerId] || {}), ...converted };
  });

  const comfortById = {};
  Object.entries(isPlainObject(comfort) ? comfort : {}).forEach(([heroKey, rating]) => {
    const heroId = idFor(heroKey);
    if (heroId && isComfortRating(rating)) comfortById[heroId] = rating;
  });

  const imagesById = {};
  Object.entries(isPlainObject(images) ? images : {}).forEach(([heroKey, image]) => {
    const heroId = idFor(heroKey);
    if (heroId && typeof image === 'string') imagesById[heroId] = image;
  });

  const data = { version: SAVE_VERSION, junglers: junglerIds, matchups: matchupsById };
  if (Object.keys(comfortById).length) data.comfort = comfortById;
  return { data, images: imagesById, unmatched };
}

export const migrateV1 = ({ matchupData, junglerList, customImages } = {}) =>
  convertKeys({ junglers: junglerList, matchups: matchupData, images: customImages }, findHeroId);

const knownHeroId = (id) => (HERO_BY_ID[id] ? id : null);

export const buildExport = (data, images) => ({
  app: 'JunglerOS',
  version: SAVE_VERSION,
  exportedAt: new Date().toISOString(),
  junglers: data.junglers,
  matchups: data.matchups,
  comfort: data.comfort || {},
  images,
});

// Turns a backup file (current format or the old name-based one) into saved data.
export function normalizeImport(file) {
  if (isPlainObject(file) && file.app === 'JunglerOS' && file.version === SAVE_VERSION) {
    return convertKeys({ junglers: file.junglers, matchups: file.matchups, comfort: file.comfort, images: file.images }, knownHeroId);
  }
  if (isPlainObject(file) && (file.matchupData || file.junglerList)) {
    return migrateV1(file);
  }
  throw new Error('This file is not a JunglerOS backup.');
}

// Reads saved data, upgrading an old name-based save the first time this version runs.
export function loadSave(storage) {
  const data = storage.read(STORAGE_KEYS.data, null, isSaveData);
  if (data) {
    return { data, images: storage.read(STORAGE_KEYS.images, {}, isPlainObject), unmatched: [], migrated: false };
  }

  const legacy = {
    matchupData: storage.read(STORAGE_KEYS.legacyMatchups, null, isPlainObject),
    junglerList: storage.read(STORAGE_KEYS.legacyJunglers, null, isStringArray),
    customImages: storage.read(STORAGE_KEYS.legacyImages, null, isPlainObject),
  };
  if (!legacy.matchupData && !legacy.junglerList && !legacy.customImages) {
    return { data: emptyData(), images: {}, unmatched: [], migrated: false };
  }

  const upgraded = migrateV1(legacy);
  storage.write(STORAGE_KEYS.data, upgraded.data);
  storage.write(STORAGE_KEYS.images, upgraded.images);
  return { ...upgraded, migrated: true };
}

// Deletes every JunglerOS save, old and new, including unreadable-data backups. Other sites' data stays.
export function clearSave(storage) {
  Object.values(STORAGE_KEYS).forEach((key) => {
    storage.remove(key);
    storage.remove(`${key}_corrupt_backup`);
  });
}

export const countRatings = (matchups) =>
  Object.values(matchups).reduce(
    (total, entries) => total + Object.values(entries).filter((entry) => entry && entry.tier).length,
    0,
  );
