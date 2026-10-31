// JunglerOS viability: a score out of 100 made only from your own tier ratings and comfort. Nothing else goes
// into it. Risk is reported next to the score and never changes it. Plain functions shared by the app and tests.
import { TIER_POINTS, UNRATED_POINTS, gradeFor } from '../data/tiers.js';
import { isComfortRating } from './dataReducer.js';

// Share of the score, in percent, that comes from comfort. The rest comes from matchups.
export const DEFAULT_COMFORT_WEIGHT = 30;
export const COMFORT_WEIGHTS = [0, 20, 30, 40, 50];
export const ENEMY_JUNGLER_WEIGHT = 1.5;
export const TEAM_SIZE = 5;
export const GRAPH_OPTIONS = 6;

const UNSET_COMFORT = 3;

const round1 = (value) => Math.round(value * 10) / 10;

export const comfortScore = (rating) => ((isComfortRating(rating) ? rating : UNSET_COMFORT) - 1) * 25;

const comfortValue = (entry) => (isComfortRating(entry.comfort) ? entry.comfort : UNSET_COMFORT);

// How worrying it is that this many heroes you rated Countered can still be picked.
export const riskLevel = (openCounters) => {
  if (openCounters === 0) return 'none';
  if (openCounters <= 3) return 'low';
  if (openCounters <= 8) return 'medium';
  return 'high';
};

const pointsFor = (rating) => (rating ? TIER_POINTS[rating.tier] : UNRATED_POINTS);

function matchupsFor(junglerId, enemyIds, enemyJunglerId, tiers, notes) {
  return enemyIds.map((enemyId) => {
    const rating = tiers[enemyId] || null;
    const note = notes[enemyId] || {};
    return {
      enemyId,
      tier: rating ? rating.tier : null,
      points: pointsFor(rating),
      source: rating ? rating.source : null,
      groupId: rating && rating.groupId ? rating.groupId : null,
      groupName: rating && rating.groupName ? rating.groupName : null,
      overridesGroup: rating && rating.overrides ? rating.overrides.groupName : null,
      weight: enemyId === enemyJunglerId ? ENEMY_JUNGLER_WEIGHT : 1,
      quickNote: note.quickNote || null,
      comment: note.comment || null,
    };
  });
}

const weightedAverage = (matchups) => {
  const totalWeight = matchups.reduce((sum, matchup) => sum + matchup.weight, 0);
  return matchups.reduce((sum, matchup) => sum + matchup.points * matchup.weight, 0) / totalWeight;
};

function riskFor(tiers, openIds, enemyIds, picksLeft) {
  const open = (tier) => (picksLeft > 0 ? openIds.filter((heroId) => tiers[heroId] && tiers[heroId].tier === tier).sort() : []);
  const openCounters = open('D');
  return {
    level: riskLevel(openCounters.length),
    openCounters,
    openUnfavored: open('C'),
    facing: enemyIds.filter((enemyId) => tiers[enemyId] && tiers[enemyId].tier === 'D'),
    picksLeft,
  };
}

// Ranks your junglers for the current enemy lineup. Until the first enemy pick (mode "waiting") there's nothing
// to score against, so nothing is ranked or recommended.
export function scoreJunglers({
  junglerIds,
  enemyIds = [],
  enemyJunglerId = null,
  unavailableIds = [],
  tiersByJungler = {},
  matchups: notesByJungler = {},
  comfort = {},
  comfortWeight = DEFAULT_COMFORT_WEIGHT,
  onlyPool = false,
  safeOnly = false,
  heroIds = [],
}) {
  if (!enemyIds.length) return { mode: 'waiting', ranked: [], unavailable: [], entries: [], top: null, hiddenCounters: 0 };

  const taken = new Set([...enemyIds, ...unavailableIds]);
  const picksLeft = Math.max(0, TEAM_SIZE - enemyIds.length);
  const share = comfortWeight / 100;

  const entries = Array.from(new Set(junglerIds))
    .filter((id) => !onlyPool || isComfortRating(comfort[id]))
    .map((id) => {
      const tiers = tiersByJungler[id] || {};
      const openIds = heroIds.filter((heroId) => !taken.has(heroId) && heroId !== id);
      const lineup = matchupsFor(id, enemyIds, enemyJunglerId, tiers, notesByJungler[id] || {});
      const matchupScore = round1(weightedAverage(lineup));
      const comfortPart = comfortScore(comfort[id]);
      const total = round1(matchupScore * (1 - share) + comfortPart * share);
      return {
        id,
        total,
        grade: gradeFor(total),
        matchupScore,
        comfortScore: comfortPart,
        comfort: isComfortRating(comfort[id]) ? comfort[id] : null,
        matchups: lineup,
        coverage: { rated: lineup.filter((matchup) => matchup.tier).length, total: lineup.length },
        risk: riskFor(tiers, openIds, enemyIds, picksLeft),
      };
    });

  const available = entries.filter((entry) => !taken.has(entry.id));
  const ranked = available
    .filter((entry) => !safeOnly || entry.risk.facing.length === 0)
    .sort((a, b) =>
      (b.total - a.total) ||
      (comfortValue(b) - comfortValue(a)) ||
      (b.coverage.rated - a.coverage.rated) ||
      a.id.localeCompare(b.id));

  return {
    mode: 'counter',
    ranked,
    unavailable: entries.filter((entry) => taken.has(entry.id)),
    entries,
    top: ranked[0] || null,
    hiddenCounters: available.length - ranked.length,
  };
}

const SORTERS = {
  viability: (a, b) => b.total - a.total,
  risk: (a, b) => (a.risk.openCounters.length - b.risk.openCounters.length) || (a.risk.facing.length - b.risk.facing.length) || (b.total - a.total),
  comfort: (a, b) => (comfortValue(b) - comfortValue(a)) || (b.total - a.total),
};

// Re-sorts ranked entries. Ties keep their ranked order, so the top of the list stays the top pick.
export function sortEntries(entries, key, nameOf) {
  const sorter = SORTERS[key] || ((a, b) => nameOf(a.id).localeCompare(nameOf(b.id)));
  return [...entries].sort(sorter);
}

// The junglers on the hexagon: your best options in ranked order. A jungler you opened from further down
// takes the last corner, so the one you're looking at is always on the chart.
export function graphOptions(ranked, viewedId, size = GRAPH_OPTIONS) {
  const options = ranked.slice(0, size);
  const viewed = viewedId && !options.some((entry) => entry.id === viewedId) ? ranked.find((entry) => entry.id === viewedId) : null;
  if (viewed) options[options.length - 1] = viewed;
  return options;
}

// Open heroes that counter the most of your junglers, for filling in bans. Looks at the junglers you play
// (comfort 3 or higher) once any comfort is set, or your whole roster before that.
export function banSuggestions({ junglerIds, tiersByJungler = {}, comfort = {}, takenIds = [], limit = 5 }) {
  const taken = new Set(takenIds);
  const played = junglerIds.filter((id) => isComfortRating(comfort[id]) && comfort[id] >= UNSET_COMFORT);
  const focus = played.length ? played : junglerIds;
  const tally = new Map();
  focus.forEach((junglerId) => {
    Object.entries(tiersByJungler[junglerId] || {}).forEach(([heroId, { tier }]) => {
      if (taken.has(heroId) || (tier !== 'D' && tier !== 'C')) return;
      const item = tally.get(heroId) || { heroId, counters: [], unfavored: [] };
      (tier === 'D' ? item.counters : item.unfavored).push(junglerId);
      tally.set(heroId, item);
    });
  });
  return Array.from(tally.values())
    .sort((a, b) =>
      (b.counters.length - a.counters.length) ||
      (b.unfavored.length - a.unfavored.length) ||
      a.heroId.localeCompare(b.heroId))
    .slice(0, limit);
}
