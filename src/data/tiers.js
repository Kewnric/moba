export const TIERS = ['S', 'A', 'B', 'C', 'D'];

export const isTier = (tier) => TIERS.includes(tier);

// What each tier means for the jungler being rated, against the enemy hero in that row.
export const TIER_LABELS = {
  S: 'Hard counter',
  A: 'Favored',
  B: 'Even',
  C: 'Unfavored',
  D: 'Countered',
};

// Points a tier is worth in a viability score. An unrated matchup counts as Even.
export const TIER_POINTS = { S: 100, A: 75, B: 50, C: 25, D: 0 };
export const UNRATED_POINTS = TIER_POINTS.B;

// The tier a score rounds to, so 85 reads as an A and 90 as an S.
export const gradeFor = (score) => {
  if (score >= 87.5) return 'S';
  if (score >= 62.5) return 'A';
  if (score >= 37.5) return 'B';
  if (score >= 12.5) return 'C';
  return 'D';
};

// Fill and text colors for each tier, from index.css. '?' marks a matchup that hasn't been rated.
export const TIER_COLORS = { S: 't-S', A: 't-A', B: 't-B', C: 't-C', D: 't-D', '?': 't-none' };
