import { isTier } from '../data/tiers.js';

// Every change to saved data goes through here. Each action returns new objects and never edits the
// previous state, so React always sees the change and earlier states stay intact.

// How comfortable you are playing a jungler, from 1 (rarely) to 5 (main).
export const isComfortRating = (value) => Number.isInteger(value) && value >= 1 && value <= 5;

const withoutKey = (object, key) => {
  const { [key]: _removed, ...rest } = object;
  return rest;
};

// Replaces one matchup entry, dropping it (and a jungler left with no entries) once it's empty.
function updateEntry(state, junglerId, enemyId, update) {
  const junglerMatchups = state.matchups[junglerId] || {};
  const entry = update(junglerMatchups[enemyId] || {});
  const nextJungler = Object.keys(entry).length
    ? { ...junglerMatchups, [enemyId]: entry }
    : withoutKey(junglerMatchups, enemyId);
  const matchups = Object.keys(nextJungler).length
    ? { ...state.matchups, [junglerId]: nextJungler }
    : withoutKey(state.matchups, junglerId);
  return { ...state, matchups };
}

// Comfort ratings are left out of the save entirely when there are none.
const withComfort = (state, comfort) =>
  (Object.keys(comfort).length ? { ...state, comfort } : withoutKey(state, 'comfort'));

const setText = (field, text) => (entry) => {
  const trimmed = (text || '').trim();
  return trimmed ? { ...entry, [field]: trimmed } : withoutKey(entry, field);
};

export function dataReducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.data;
    case 'setTier':
      if (!isTier(action.tier)) return state;
      return updateEntry(state, action.junglerId, action.enemyId, (entry) => ({ ...entry, tier: action.tier }));
    case 'clearTier':
      return updateEntry(state, action.junglerId, action.enemyId, (entry) => withoutKey(entry, 'tier'));
    case 'setQuickNote':
      return updateEntry(state, action.junglerId, action.enemyId, setText('quickNote', action.text));
    case 'setComment':
      return updateEntry(state, action.junglerId, action.enemyId, setText('comment', action.text));
    case 'setComfort': {
      if (action.comfort !== null && !isComfortRating(action.comfort)) return state;
      const current = state.comfort || {};
      const next = action.comfort === null
        ? withoutKey(current, action.junglerId)
        : { ...current, [action.junglerId]: action.comfort };
      return withComfort(state, next);
    }
    case 'addJungler':
      if (state.junglers.includes(action.junglerId)) return state;
      return { ...state, junglers: [...state.junglers, action.junglerId] };
    case 'removeJungler': {
      const next = {
        ...state,
        junglers: state.junglers.filter((id) => id !== action.junglerId),
        matchups: withoutKey(state.matchups, action.junglerId),
      };
      return state.comfort ? withComfort(next, withoutKey(state.comfort, action.junglerId)) : next;
    }
    default:
      return state;
  }
}
