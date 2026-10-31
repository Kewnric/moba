// Wraps saved-data changes with an undo history, so a wrong drag or a mistaken group rating can be taken back.
import { HERO_BY_ID } from '../data/heroes.js';
import { dataReducer } from './dataReducer.js';

export const MAX_UNDO = 30;

export const initialUndoable = (data) => ({ present: data, past: [] });

const hero = (heroId) => (HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].name : heroId);
const group = (data, groupId) => {
  const found = (data.skillGroups || []).find((item) => item.id === groupId);
  return found ? found.name : 'skill group';
};
const count = (items, noun) => `${items.length} ${noun}${items.length === 1 ? '' : 'es'}`;

// A short name for each change, shown on the Undo button.
function describeChange(action, data) {
  switch (action.type) {
    case 'setTier': return `${hero(action.junglerId)} vs ${hero(action.enemyId)}: ${action.tier}`;
    case 'clearTier': return `Unrate ${hero(action.enemyId)}`;
    case 'setTiers': return `${count(action.enemyIds, 'hero')} to ${action.tier}`;
    case 'clearTiers': return `Unrate ${count(action.enemyIds, 'hero')}`;
    case 'setNotes': return `Notes on ${hero(action.enemyId)}`;
    case 'setComfort': return `Comfort on ${hero(action.junglerId)}`;
    case 'addJungler': return `Add ${hero(action.junglerId)}`;
    case 'removeJungler': return `Remove ${hero(action.junglerId)}`;
    case 'setGroupTier': return `${group(data, action.groupId)}: ${action.tier}`;
    case 'clearGroupTier': return `Unrate ${group(data, action.groupId)}`;
    case 'addGroup': return `New group ${action.name}`;
    case 'updateGroup': return `Edit ${group(data, action.groupId)}`;
    case 'deleteGroup': return `Delete ${group(data, action.groupId)}`;
    case 'toggleGroupHero': return `${hero(action.heroId)} in ${group(data, action.groupId)}`;
    case 'addGroupHeroes': return `Add ${count(action.heroIds, 'hero')} to ${group(data, action.groupId)}`;
    case 'copyTierList': return `Copy ${hero(action.fromId)}'s tiers`;
    case 'clearTierList': return `Clear ${hero(action.junglerId)}'s tiers`;
    default: return 'Last change';
  }
}

export function undoableDataReducer(state, action) {
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    return { present: state.past[state.past.length - 1].data, past: state.past.slice(0, -1) };
  }
  const next = dataReducer(state.present, action);
  if (next === state.present) return state;
  if (action.type === 'load') return initialUndoable(next);
  return {
    present: next,
    past: [...state.past.slice(-(MAX_UNDO - 1)), { data: state.present, label: describeChange(action, state.present) }],
  };
}
