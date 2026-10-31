import { isTier } from '../data/tiers.js';
import { makeGroupId } from './skillGroups.js';

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

const groupsOf = (state) => state.skillGroups || [];

function setGroupRatings(state, junglerId, ratings) {
  const groupRatings = Object.keys(ratings).length
    ? { ...(state.groupRatings || {}), [junglerId]: ratings }
    : withoutKey(state.groupRatings || {}, junglerId);
  return { ...state, groupRatings };
}

// Removes every tier a jungler has, keeping any notes written on the matchups.
const withoutTiers = (entries) => Object.fromEntries(
  Object.entries(entries)
    .map(([enemyId, entry]) => [enemyId, withoutKey(entry, 'tier')])
    .filter(([, entry]) => Object.keys(entry).length > 0),
);

const withMatchupsFor = (state, junglerId, entries) => ({
  ...state,
  matchups: Object.keys(entries).length ? { ...state.matchups, [junglerId]: entries } : withoutKey(state.matchups, junglerId),
});

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
        ...(state.groupRatings ? { groupRatings: withoutKey(state.groupRatings, action.junglerId) } : {}),
      };
      return state.comfort ? withComfort(next, withoutKey(state.comfort, action.junglerId)) : next;
    }
    case 'setGroupTier': {
      if (!isTier(action.tier) || !groupsOf(state).some((group) => group.id === action.groupId)) return state;
      const ratings = (state.groupRatings || {})[action.junglerId] || {};
      return setGroupRatings(state, action.junglerId, { ...ratings, [action.groupId]: action.tier });
    }
    case 'clearGroupTier': {
      const ratings = (state.groupRatings || {})[action.junglerId] || {};
      return setGroupRatings(state, action.junglerId, withoutKey(ratings, action.groupId));
    }
    case 'addGroup': {
      const name = (action.name || '').trim();
      if (!name) return state;
      const groups = groupsOf(state);
      const group = {
        id: action.id || makeGroupId(name, groups),
        name,
        category: (action.category || '').trim() || 'Other',
        heroIds: action.heroIds || [],
      };
      return { ...state, skillGroups: [...groups, group] };
    }
    case 'updateGroup': {
      const name = action.name === undefined ? undefined : action.name.trim();
      if (name === '') return state;
      return {
        ...state,
        skillGroups: groupsOf(state).map((group) => (group.id !== action.groupId ? group : {
          ...group,
          ...(name === undefined ? {} : { name }),
          ...(action.category === undefined ? {} : { category: action.category.trim() || 'Other' }),
        })),
      };
    }
    case 'deleteGroup': {
      const groupRatings = Object.fromEntries(
        Object.entries(state.groupRatings || {})
          .map(([junglerId, ratings]) => [junglerId, withoutKey(ratings, action.groupId)])
          .filter(([, ratings]) => Object.keys(ratings).length > 0),
      );
      return { ...state, skillGroups: groupsOf(state).filter((group) => group.id !== action.groupId), groupRatings };
    }
    case 'toggleGroupHero':
      return {
        ...state,
        skillGroups: groupsOf(state).map((group) => {
          if (group.id !== action.groupId) return group;
          const inGroup = group.heroIds.includes(action.heroId);
          return { ...group, heroIds: inGroup ? group.heroIds.filter((id) => id !== action.heroId) : [...group.heroIds, action.heroId] };
        }),
      };
    case 'copyTierList': {
      if (action.fromId === action.toId) return state;
      const copied = {};
      Object.entries(state.matchups[action.fromId] || {}).forEach(([enemyId, entry]) => {
        if (enemyId !== action.toId && isTier(entry.tier)) copied[enemyId] = entry.tier;
      });
      const entries = withoutTiers(state.matchups[action.toId] || {});
      Object.entries(copied).forEach(([enemyId, tier]) => { entries[enemyId] = { ...(entries[enemyId] || {}), tier }; });
      const next = withMatchupsFor(state, action.toId, entries);
      return setGroupRatings(next, action.toId, { ...((state.groupRatings || {})[action.fromId] || {}) });
    }
    case 'clearTierList': {
      const next = withMatchupsFor(state, action.junglerId, withoutTiers(state.matchups[action.junglerId] || {}));
      return setGroupRatings(next, action.junglerId, {});
    }
    default:
      return state;
  }
}
