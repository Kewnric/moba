import { isTier } from './engine.js';

// Every change to saved data goes through here. Each action returns new objects and never edits the
// previous state, so React always sees the change and earlier states stay intact.

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
    case 'addJungler':
      if (state.junglers.includes(action.junglerId)) return state;
      return { ...state, junglers: [...state.junglers, action.junglerId] };
    case 'removeJungler':
      return {
        ...state,
        junglers: state.junglers.filter((id) => id !== action.junglerId),
        matchups: withoutKey(state.matchups, action.junglerId),
      };
    default:
      return state;
  }
}
