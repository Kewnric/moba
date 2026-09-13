// What the recommendation is based on. The chosen value is saved with the draft preferences.
export const RATING_SOURCES = [
  {
    value: 'mine',
    label: 'My ratings',
    description: 'Only your tier ratings. Win-rate stats, duo synergy and meta are off, and counters are heroes you rated D.',
  },
  {
    value: 'both',
    label: 'Both',
    description: "Your ratings first, with Mythic stats filling in matchups you haven't rated.",
  },
  {
    value: 'stats',
    label: 'Mythic stats',
    description: 'Only Mythic win-rate stats. Your tier ratings are off; comfort still counts.',
  },
];

export const RATING_SOURCE_VALUES = RATING_SOURCES.map((source) => source.value);
