// JunglerOS pick scoring: a total out of 100 from matchups, team fit, comfort and meta, minus the risk
// of being counter-picked. Plain functions with no React or browser code, shared by the app and tests.
import { LANES } from '../data/heroes.js';
import { isComfortRating } from './dataReducer.js';

export const SCORE_PARTS = { matchup: 45, teamFit: 20, comfort: 20, meta: 15 };
export const MAX_RISK = 10;

const TIER_VALUES = { S: 1, A: 0.75, B: 0.5, C: 0.25, D: 0 };
// A matchup from win-rate stats counts half as much as a rating you entered yourself.
const STATS_CONFIDENCE = 0.5;
// Win-rate change, in percentage points, that counts as a perfect (or hopeless) matchup.
const FULL_MATCHUP_SWING = 5;
// Every jungler starts with one imaginary even matchup, so a single number can't swing the score.
const PRIOR_WEIGHT = 1;
const ENEMY_JUNGLER_WEIGHT = 1.5;
// Share of the enemy picks that need a rating or stats before a jungler can be recommended.
const MIN_COVERAGE = 0.5;
// An open hero that lowers your win rate by at least this many points is a strong counter.
const STRONG_COUNTER = -3;
const RISK_PER_COUNTER = 2;
const TEAM_SIZE = 5;
const MIN_ALLIES_FOR_TEAM_FIT = 2;
// Duo win-rate change, in percentage points, that counts as the best (or worst) possible teammate.
// Bigger changes, such as two junglers on one team, are capped here.
const FULL_SYNERGY_SWING = 3;
// Synergy with your teammates moves team fit by at most this share of its points.
const SYNERGY_SHARE = 0.25;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// Removes floating-point noise such as 11.999999999999996.
const snap = (value) => Math.round(value * 1e9) / 1e9;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function traitsOf(info) {
  const roles = (info && info.roles) || [];
  const specialities = (info && info.specialities) || [];
  return {
    frontline: roles.includes('Tank') || (roles.includes('Fighter') && !roles.some((role) => ['Assassin', 'Marksman', 'Mage'].includes(role))),
    magic: roles.includes('Mage') || specialities.includes('Magic Damage'),
    control: specialities.some((speciality) => ['Crowd Control', 'Control', 'Initiator'].includes(speciality)),
  };
}

function matchupPart(junglerId, enemies, ratings, matchupStats) {
  const junglerRatings = ratings[junglerId] || {};
  const junglerStats = matchupStats[junglerId] || {};
  let weightedValue = PRIOR_WEIGHT * 0.5;
  let totalWeight = PRIOR_WEIGHT;
  let rated = 0;
  let known = 0;

  const details = enemies.map(({ heroId: enemyId, lane }) => {
    const weight = lane === LANES.JUNGLE ? ENEMY_JUNGLER_WEIGHT : 1;
    const entry = junglerRatings[enemyId];
    const detail = { enemyId, lane: lane || null, weight, source: null, value: null, quickNote: (entry && entry.quickNote) || null };

    if (entry && hasOwn(TIER_VALUES, entry.tier)) {
      Object.assign(detail, { source: 'you', tier: entry.tier, value: TIER_VALUES[entry.tier] });
      rated += 1;
    } else if (typeof junglerStats[enemyId] === 'number') {
      const delta = junglerStats[enemyId];
      Object.assign(detail, { source: 'stats', delta, value: clamp(0.5 + delta / (2 * FULL_MATCHUP_SWING), 0, 1) });
    }

    if (detail.source) {
      const confidence = detail.source === 'you' ? 1 : STATS_CONFIDENCE;
      weightedValue += weight * confidence * detail.value;
      totalWeight += weight * confidence;
      known += 1;
    }
    return detail;
  });

  return { value: weightedValue / totalWeight, rated, known, details };
}

// Duo win-rate changes between a jungler and each teammate already picked that has stats.
function synergyWith(junglerId, allyIds, synergyStats) {
  const junglerStats = synergyStats[junglerId] || {};
  return allyIds
    .filter((allyId) => typeof junglerStats[allyId] === 'number')
    .map((allyId) => ({ allyId, delta: junglerStats[allyId] }));
}

function teamFitPart(candidateInfo, allyInfos, synergy) {
  const reasons = [];
  let value = 0.5;

  if (allyInfos.length < MIN_ALLIES_FOR_TEAM_FIT) {
    reasons.push('Team composition counts once two of your teammates have picked.');
  } else {
    const team = allyInfos.map(traitsOf);
    const candidate = traitsOf(candidateInfo);
    if (!team.some((traits) => traits.frontline)) {
      if (candidate.frontline) { value += 0.25; reasons.push('Adds a frontline your team is missing.'); }
      else { value -= 0.15; reasons.push('Your team still has no frontline.'); }
    }
    if (!team.some((traits) => traits.magic)) {
      if (candidate.magic) { value += 0.25; reasons.push('Adds magic damage to an all-physical team.'); }
      else { value -= 0.1; reasons.push("Your team's damage stays all physical."); }
    }
    if (!team.some((traits) => traits.control) && candidate.control) {
      value += 0.1;
      reasons.push('Adds crowd control your team is missing.');
    }
    if (!reasons.length) reasons.push('Your team already has a frontline, magic damage and crowd control.');
  }

  if (synergy.length) {
    const capped = synergy.map(({ delta }) => clamp(delta, -FULL_SYNERGY_SWING, FULL_SYNERGY_SWING));
    const average = capped.reduce((sum, delta) => sum + delta, 0) / capped.length;
    value += (average / FULL_SYNERGY_SWING) * SYNERGY_SHARE;
  }

  return { value: clamp(value, 0, 1), reasons, synergy };
}

function counterRiskPart(junglerId, picksLeft, takenIds, matchupStats) {
  if (picksLeft <= 0) return { points: 0, counterIds: [] };
  const counterIds = Object.entries(matchupStats[junglerId] || {})
    .filter(([heroId, delta]) => delta <= STRONG_COUNTER && !takenIds.has(heroId))
    .sort((a, b) => (a[1] - b[1]) || a[0].localeCompare(b[0]))
    .map(([heroId]) => heroId);
  const points = Math.min(MAX_RISK, counterIds.length * RISK_PER_COUNTER) * (picksLeft / TEAM_SIZE);
  return { points, counterIds: counterIds.slice(0, 3) };
}

const comfortPoints = (rating) =>
  (isComfortRating(rating) ? (SCORE_PARTS.comfort * (rating - 1)) / 4 : SCORE_PARTS.comfort / 2);

const metaPoints = (heroMeta) => {
  const winRate = heroMeta && typeof heroMeta.winRate === 'number' ? heroMeta.winRate : null;
  return winRate === null ? SCORE_PARTS.meta / 2 : SCORE_PARTS.meta * clamp(0.5 + (winRate - 0.5) * 10, 0, 1);
};

// Ranks your junglers for the current draft. With no enemy picks yet it still ranks early picks
// (mode "blind") but recommends nobody.
export function scoreJunglers({
  junglerIds,
  enemies = [],
  allyIds = [],
  unavailableIds = [],
  ratings = {},
  comfort = {},
  onlyPool = false,
  matchupStats = {},
  synergyStats = {},
  meta = {},
  heroInfo = () => null,
}) {
  const taken = new Set([...enemies.map((enemy) => enemy.heroId), ...allyIds, ...unavailableIds]);
  const picksLeft = Math.max(0, TEAM_SIZE - enemies.length);
  const mode = enemies.length ? 'counter' : 'blind';
  const allyInfos = allyIds.map(heroInfo).filter(Boolean);

  const ranked = Array.from(new Set(junglerIds))
    .filter((id) => !taken.has(id))
    .filter((id) => !onlyPool || isComfortRating(comfort[id]))
    .map((id) => {
      const matchup = matchupPart(id, enemies, ratings, matchupStats);
      const fit = teamFitPart(heroInfo(id), allyInfos, synergyWith(id, allyIds, synergyStats));
      const risk = counterRiskPart(id, picksLeft, new Set([...taken, id]), matchupStats);
      const parts = {
        matchup: snap(SCORE_PARTS.matchup * matchup.value),
        teamFit: snap(SCORE_PARTS.teamFit * fit.value),
        comfort: snap(comfortPoints(comfort[id])),
        meta: snap(metaPoints(meta[id])),
        risk: snap(risk.points),
      };
      const total = Math.round(clamp(parts.matchup + parts.teamFit + parts.comfort + parts.meta - parts.risk, 0, 100) * 10) / 10;
      return {
        id,
        total,
        parts,
        coverage: { rated: matchup.rated, known: matchup.known, total: enemies.length },
        confident: enemies.length > 0 && matchup.known / enemies.length >= MIN_COVERAGE,
        details: {
          matchups: matchup.details,
          teamFit: { reasons: fit.reasons, synergy: fit.synergy },
          risk: { counterIds: risk.counterIds, picksLeft },
          comfort: isComfortRating(comfort[id]) ? comfort[id] : null,
          winRate: meta[id] && typeof meta[id].winRate === 'number' ? meta[id].winRate : null,
        },
      };
    })
    .sort((a, b) =>
      (b.confident - a.confident) ||
      (b.total - a.total) ||
      (b.coverage.rated - a.coverage.rated) ||
      a.id.localeCompare(b.id));

  const recommended = mode === 'counter' && ranked.length && ranked[0].confident ? ranked[0] : null;
  return { mode, ranked, recommended };
}
