// Skill groups: named lists of heroes that share a skill, such as blinks or i-frames. Rating a group for a
// jungler rates every hero in it. Plain functions shared by the app and the tests.
import { DEFAULT_SKILL_GROUPS } from '../data/skillGroups.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { TIERS, isTier } from '../data/tiers.js';
import { isPlainObject } from './storage.js';

const worseThan = (tier, other) => TIERS.indexOf(tier) > TIERS.indexOf(other);

// What a jungler's group ratings say about each hero. In two rated groups, the worse tier wins, because
// one skill you can't deal with is enough to lose the matchup.
function tiersFromGroups(skillGroups, junglerGroupRatings) {
  const tiers = {};
  skillGroups.forEach((group) => {
    const tier = junglerGroupRatings[group.id];
    if (!isTier(tier)) return;
    group.heroIds.forEach((heroId) => {
      if (!tiers[heroId] || worseThan(tier, tiers[heroId].tier)) {
        tiers[heroId] = { tier, source: 'group', groupId: group.id, groupName: group.name };
      }
    });
  });
  return tiers;
}

// The tier a jungler really has against each hero: your rating of that hero, or else what its groups say.
// A hero with neither isn't listed. A jungler never gets a rating against themselves.
export function effectiveTiers(data, junglerId) {
  const fromGroups = tiersFromGroups(data.skillGroups || [], (data.groupRatings || {})[junglerId] || {});
  const own = (data.matchups || {})[junglerId] || {};
  const tiers = { ...fromGroups };
  Object.entries(own).forEach(([heroId, entry]) => {
    if (!entry || !isTier(entry.tier)) return;
    tiers[heroId] = { tier: entry.tier, source: 'hero', ...(fromGroups[heroId] ? { overrides: fromGroups[heroId] } : {}) };
  });
  delete tiers[junglerId];
  return tiers;
}

export const allEffectiveTiers = (data) =>
  Object.fromEntries(data.junglers.map((junglerId) => [junglerId, effectiveTiers(data, junglerId)]));

export const groupsOfHero = (skillGroups, heroId) => skillGroups.filter((group) => group.heroIds.includes(heroId));

// The skill groups an enemy lineup brings, most common first.
export const lineupSkills = (skillGroups, enemyIds) =>
  skillGroups
    .map((group) => ({ group, heroIds: enemyIds.filter((heroId) => group.heroIds.includes(heroId)) }))
    .filter(({ heroIds }) => heroIds.length > 0)
    .sort((a, b) => b.heroIds.length - a.heroIds.length);

// Groups under their category, keeping the order each category first appears.
export function categoriesOf(skillGroups) {
  const categories = new Map();
  skillGroups.forEach((group) => {
    if (!categories.has(group.category)) categories.set(group.category, []);
    categories.get(group.category).push(group);
  });
  return Array.from(categories, ([category, groups]) => ({ category, groups }));
}

export function makeGroupId(name, existing) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'group';
  const taken = new Set(existing.map((group) => group.id));
  if (!taken.has(base)) return base;
  let number = 2;
  while (taken.has(`${base}-${number}`)) number += 1;
  return `${base}-${number}`;
}

const cleanGroup = (group) => {
  if (!isPlainObject(group) || typeof group.id !== 'string' || !group.id) return null;
  if (typeof group.name !== 'string' || !group.name.trim()) return null;
  const heroIds = Array.isArray(group.heroIds) ? group.heroIds.filter((heroId) => HERO_BY_ID[heroId]) : [];
  return {
    id: group.id,
    name: group.name,
    category: typeof group.category === 'string' && group.category.trim() ? group.category : 'Other',
    heroIds: [...new Set(heroIds)],
  };
};

export const cleanGroups = (value) => {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).map(cleanGroup).filter((group) => {
    if (!group || seen.has(group.id)) return false;
    seen.add(group.id);
    return true;
  });
};

// Keeps ratings of groups that exist, by junglers with at least one valid rating.
export function cleanGroupRatings(value, skillGroups) {
  const known = new Set(skillGroups.map((group) => group.id));
  const ratings = {};
  Object.entries(isPlainObject(value) ? value : {}).forEach(([junglerId, entries]) => {
    if (!isPlainObject(entries)) return;
    const kept = Object.fromEntries(Object.entries(entries).filter(([groupId, tier]) => known.has(groupId) && isTier(tier)));
    if (Object.keys(kept).length) ratings[junglerId] = kept;
  });
  return ratings;
}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Gives saved data its skill groups: the starter groups for a save from before they existed, and cleaned
// copies otherwise. Broken entries are dropped, never the whole save. Returns the same object when nothing changes.
export function withSkillData(data) {
  const skillGroups = data.skillGroups === undefined ? DEFAULT_SKILL_GROUPS.map((group) => ({ ...group, heroIds: [...group.heroIds] })) : cleanGroups(data.skillGroups);
  const groupRatings = cleanGroupRatings(data.groupRatings, skillGroups);
  if (sameJson(skillGroups, data.skillGroups) && sameJson(groupRatings, data.groupRatings)) return data;
  return { ...data, skillGroups, groupRatings };
}
