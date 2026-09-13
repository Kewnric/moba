import { HEROES, HERO_BY_ID, LANES } from '../data/heroes.js';
import { isComfortRating } from './dataReducer.js';
import { findHeroId } from './heroIds.js';
import { isGameRecord, isHistory } from './history.js';
import { isPlainObject, isStringArray } from './storage.js';

// Saved data, version 2: { version, junglers: [heroId], matchups: { junglerId: { enemyId: entry } },
// comfort?: { junglerId: 1-5 }, knownDefaults?: [heroId] } where an entry holds any of
// { tier, quickNote, comment }. Custom icons and game history are saved under their own keys.

export const SAVE_VERSION = 2;

export const STORAGE_KEYS = {
  data: 'jungleros_data_v2',
  images: 'jungleros_images_v2',
  history: 'jungleros_history_v1',
  // Name-based saves from before hero ids. They're left in place after upgrading, as a fallback.
  legacyMatchups: 'moba_matchup_data_v1',
  legacyJunglers: 'moba_jungler_list_v1',
  legacyImages: 'moba_custom_images_v1',
};

export const DEFAULT_JUNGLERS = HEROES.filter((hero) => hero.lanes.includes(LANES.JUNGLE)).map((hero) => hero.id);

// Junglers added to the defaults after the first release. Saves without `knownDefaults` were made
// before these existed, so they get offered once.
const JUNGLERS_ADDED_AFTER_V1 = ['hirara'];
const LEGACY_DEFAULT_JUNGLERS = DEFAULT_JUNGLERS.filter((id) => !JUNGLERS_ADDED_AFTER_V1.includes(id));

export const emptyData = () => ({
  version: SAVE_VERSION,
  junglers: [...DEFAULT_JUNGLERS],
  matchups: {},
  knownDefaults: [...DEFAULT_JUNGLERS],
});

const isComfortMap = (value) => isPlainObject(value) && Object.values(value).every(isComfortRating);

export const isSaveData = (value) =>
  isPlainObject(value) &&
  value.version === SAVE_VERSION &&
  isStringArray(value.junglers) &&
  isPlainObject(value.matchups) &&
  (value.comfort === undefined || isComfortMap(value.comfort)) &&
  (value.knownDefaults === undefined || isStringArray(value.knownDefaults));

// Adds default junglers released since this save last saw the defaults (such as Hirara), without
// bringing back junglers you removed. Returns the same data object when nothing changes.
export function addNewDefaultJunglers(data) {
  const known = data.knownDefaults || LEGACY_DEFAULT_JUNGLERS;
  const unseen = DEFAULT_JUNGLERS.filter((id) => !known.includes(id));
  if (data.knownDefaults && !unseen.length) return { data, added: [] };
  const added = unseen.filter((id) => !data.junglers.includes(id));
  return {
    data: {
      ...data,
      junglers: [...data.junglers, ...added],
      knownDefaults: [...DEFAULT_JUNGLERS, ...known.filter((id) => !DEFAULT_JUNGLERS.includes(id))],
    },
    added,
  };
}

// Rebuilds roster, matchups, comfort and icons with every hero key passed through toId. Keys that
// aren't heroes are left out and listed in `unmatched`. A missing roster falls back to the defaults.
function convertKeys({ junglers, matchups, comfort, knownDefaults, images }, toId) {
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
  // Bookkeeping only, so heroes that no longer exist are dropped without being reported.
  if (Array.isArray(knownDefaults)) data.knownDefaults = [...new Set(knownDefaults.map(toId).filter(Boolean))];
  return { data, images: imagesById, unmatched };
}

export const migrateV1 = ({ matchupData, junglerList, customImages } = {}) =>
  convertKeys({ junglers: junglerList, matchups: matchupData, images: customImages }, findHeroId);

const knownHeroId = (id) => (HERO_BY_ID[id] ? id : null);

export const buildExport = (data, images, history = []) => ({
  app: 'JunglerOS',
  version: SAVE_VERSION,
  exportedAt: new Date().toISOString(),
  junglers: data.junglers,
  matchups: data.matchups,
  comfort: data.comfort || {},
  ...(data.knownDefaults ? { knownDefaults: data.knownDefaults } : {}),
  images,
  history,
});

// Turns a backup file (current format or the old name-based one) into saved data, icons and games.
export function normalizeImport(file) {
  if (isPlainObject(file) && file.app === 'JunglerOS' && file.version === SAVE_VERSION) {
    const converted = convertKeys(
      { junglers: file.junglers, matchups: file.matchups, comfort: file.comfort, knownDefaults: file.knownDefaults, images: file.images },
      knownHeroId,
    );
    return { ...converted, history: Array.isArray(file.history) ? file.history.filter(isGameRecord) : [] };
  }
  if (isPlainObject(file) && (file.matchupData || file.junglerList)) {
    return { ...migrateV1(file), history: [] };
  }
  throw new Error('This file is not a JunglerOS backup.');
}

// Combines a backup with your current data. Rosters and known defaults are joined; for the same
// matchup the backup's tier and notes replace yours field by field; the backup's comfort ratings win.
export function mergeSaveData(current, imported) {
  const junglers = [...current.junglers, ...imported.junglers.filter((id) => !current.junglers.includes(id))];

  const matchups = { ...current.matchups };
  Object.entries(imported.matchups).forEach(([junglerId, entries]) => {
    const merged = { ...(matchups[junglerId] || {}) };
    Object.entries(entries).forEach(([enemyId, entry]) => { merged[enemyId] = { ...(merged[enemyId] || {}), ...entry }; });
    matchups[junglerId] = merged;
  });

  const comfort = { ...(current.comfort || {}), ...(imported.comfort || {}) };
  const currentKnown = current.knownDefaults || [];
  const knownDefaults = [...currentKnown, ...(imported.knownDefaults || []).filter((id) => !currentKnown.includes(id))];

  const data = { version: SAVE_VERSION, junglers, matchups };
  if (Object.keys(comfort).length) data.comfort = comfort;
  if (knownDefaults.length) data.knownDefaults = knownDefaults;
  return data;
}

// Reads saved data, icons and games. Upgrades an old name-based save the first time this version runs,
// and adds default junglers released since the save was made.
export function loadSave(storage) {
  const history = storage.read(STORAGE_KEYS.history, [], isHistory);
  const saved = storage.read(STORAGE_KEYS.data, null, isSaveData);
  let loaded;

  if (saved) {
    loaded = { data: saved, images: storage.read(STORAGE_KEYS.images, {}, isPlainObject), unmatched: [], migrated: false };
  } else {
    const legacy = {
      matchupData: storage.read(STORAGE_KEYS.legacyMatchups, null, isPlainObject),
      junglerList: storage.read(STORAGE_KEYS.legacyJunglers, null, isStringArray),
      customImages: storage.read(STORAGE_KEYS.legacyImages, null, isPlainObject),
    };
    if (!legacy.matchupData && !legacy.junglerList && !legacy.customImages) {
      return { data: emptyData(), images: {}, history, unmatched: [], migrated: false, addedJunglers: [] };
    }
    const upgraded = migrateV1(legacy);
    storage.write(STORAGE_KEYS.images, upgraded.images);
    loaded = { ...upgraded, migrated: true };
  }

  const { data, added } = addNewDefaultJunglers(loaded.data);
  if (loaded.migrated || data !== loaded.data) storage.write(STORAGE_KEYS.data, data);
  return { ...loaded, data, history, addedJunglers: added };
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
