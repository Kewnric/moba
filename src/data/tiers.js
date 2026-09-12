export const TIERS = ['S', 'A', 'B', 'C', 'D'];

// What each tier means for the jungler being rated, against the enemy hero in that row.
export const TIER_LABELS = {
  S: 'Hard counter',
  A: 'Favored',
  B: 'Even',
  C: 'Unfavored',
  D: 'Countered',
};

// '?' marks a matchup that hasn't been rated.
export const TIER_COLORS = {
  S: 'bg-red-500',
  A: 'bg-orange-500',
  B: 'bg-yellow-500',
  C: 'bg-blue-500',
  D: 'bg-gray-500',
  '?': 'bg-slate-600',
};
