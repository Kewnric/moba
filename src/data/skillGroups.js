// Skill groups a new save starts with: the skills you listed as annoying, sorted by what they do.
// Everything here can be renamed, moved or deleted in the Skills tab.
export const DEFAULT_SKILL_GROUPS = [
  { id: 'blink', name: 'Blink skills', category: 'Movement', heroIds: ['harley', 'roger', 'moskov'] },
  { id: 'dash', name: 'Dash skills', category: 'Movement', heroIds: ['hirara', 'obsidia'] },
  { id: 'iframes', name: 'I-frame skills', category: 'Evasion', heroIds: ['hirara', 'roger', 'lancelot'] },
  { id: 'close-burst', name: 'Close-range burst', category: 'Threat', heroIds: ['paquito', 'eudora'] },
];

// Offered as one-tap names when creating a group, each with the category it usually belongs to.
export const GROUP_IDEAS = [
  { name: 'Hard crowd control', category: 'Control' },
  { name: 'Point-and-click lockdown', category: 'Control' },
  { name: 'Stealth', category: 'Evasion' },
  { name: 'Unstoppable ults', category: 'Evasion' },
  { name: 'Long-range poke', category: 'Threat' },
  { name: 'Shields', category: 'Sustain' },
  { name: 'Lifesteal', category: 'Sustain' },
];
