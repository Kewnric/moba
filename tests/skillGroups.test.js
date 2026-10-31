import { test } from 'vitest';
import assert from 'node:assert/strict';
import { DEFAULT_SKILL_GROUPS } from '../src/data/skillGroups.js';
import {
  allEffectiveTiers,
  categoriesOf,
  effectiveTiers,
  groupsOfHero,
  lineupSkills,
  makeGroupId,
  withSkillData,
} from '../src/lib/skillGroups.js';

const GROUPS = [
  { id: 'blink', name: 'Blink skills', category: 'Movement', heroIds: ['harley', 'roger', 'moskov'] },
  { id: 'iframes', name: 'I-frame skills', category: 'Evasion', heroIds: ['hirara', 'roger', 'lancelot'] },
];

const data = (overrides = {}) => ({ junglers: ['ling'], matchups: {}, skillGroups: GROUPS, groupRatings: {}, ...overrides });

test('your starter groups hold the heroes you listed', () => {
  const byId = Object.fromEntries(DEFAULT_SKILL_GROUPS.map((group) => [group.id, group]));
  assert.deepEqual(byId.blink.heroIds, ['harley', 'roger', 'moskov']);
  assert.deepEqual(byId.dash.heroIds, ['hirara', 'obsidia']);
  assert.deepEqual(byId.iframes.heroIds, ['hirara', 'roger', 'lancelot']);
  assert.deepEqual(byId['close-burst'].heroIds, ['paquito', 'eudora']);
  assert.equal(byId.blink.category, 'Movement');
  assert.equal(byId.dash.category, 'Movement');
});

test('rating a group rates every hero in it', () => {
  const tiers = effectiveTiers(data({ groupRatings: { ling: { blink: 'C' } } }), 'ling');
  assert.deepEqual(Object.keys(tiers).sort(), ['harley', 'moskov', 'roger']);
  assert.deepEqual(tiers.harley, { tier: 'C', source: 'group', groupId: 'blink', groupName: 'Blink skills' });
});

test('adding a hero to a rated group rates that hero too', () => {
  const groups = [{ ...GROUPS[0], heroIds: [...GROUPS[0].heroIds, 'nana'] }];
  const tiers = effectiveTiers(data({ skillGroups: groups, groupRatings: { ling: { blink: 'C' } } }), 'ling');
  assert.equal(tiers.nana.tier, 'C');
});

test('your own rating of a hero beats any group, and remembers what it overrides', () => {
  const tiers = effectiveTiers(data({
    matchups: { ling: { harley: { tier: 'S' } } },
    groupRatings: { ling: { blink: 'D' } },
  }), 'ling');
  assert.equal(tiers.harley.tier, 'S');
  assert.equal(tiers.harley.source, 'hero');
  assert.equal(tiers.harley.overrides.groupName, 'Blink skills');
  assert.equal(tiers.moskov.tier, 'D');
});

test('a hero in two rated groups takes the worse tier', () => {
  const tiers = effectiveTiers(data({ groupRatings: { ling: { blink: 'A', iframes: 'D' } } }), 'ling');
  assert.equal(tiers.roger.tier, 'D');
  assert.equal(tiers.roger.groupName, 'I-frame skills');
  assert.equal(tiers.harley.tier, 'A');
});

test('a jungler never gets a rating against themselves', () => {
  const tiers = effectiveTiers(data({
    junglers: ['roger'],
    matchups: { roger: { roger: { tier: 'S' } } },
    groupRatings: { roger: { blink: 'C' } },
  }), 'roger');
  assert.equal(tiers.roger, undefined);
  assert.equal(tiers.harley.tier, 'C');
});

test('notes without a tier do not count as a rating', () => {
  const tiers = effectiveTiers(data({ matchups: { ling: { nana: { quickNote: 'Dodge' } } } }), 'ling');
  assert.equal(tiers.nana, undefined);
});

test('allEffectiveTiers covers the whole roster', () => {
  const all = allEffectiveTiers(data({ junglers: ['ling', 'fanny'], groupRatings: { fanny: { blink: 'B' } } }));
  assert.deepEqual(all.ling, {});
  assert.equal(all.fanny.moskov.tier, 'B');
});

test('groupsOfHero and lineupSkills read a lineup by skill', () => {
  assert.deepEqual(groupsOfHero(GROUPS, 'roger').map((group) => group.id), ['blink', 'iframes']);
  const skills = lineupSkills(GROUPS, ['roger', 'harley', 'nana']);
  assert.deepEqual(skills.map(({ group, heroIds }) => [group.id, heroIds]), [
    ['blink', ['roger', 'harley']],
    ['iframes', ['roger']],
  ]);
});

test('categoriesOf keeps groups under their category, in first-seen order', () => {
  const categories = categoriesOf([
    { id: 'a', name: 'A', category: 'Movement', heroIds: [] },
    { id: 'b', name: 'B', category: 'Threat', heroIds: [] },
    { id: 'c', name: 'C', category: 'Movement', heroIds: [] },
  ]);
  assert.deepEqual(categories.map(({ category, groups }) => [category, groups.map((group) => group.id)]), [
    ['Movement', ['a', 'c']],
    ['Threat', ['b']],
  ]);
});

test('makeGroupId makes a readable id that does not clash', () => {
  assert.equal(makeGroupId('Hard CC!', []), 'hard-cc');
  assert.equal(makeGroupId('Blink skills', [{ id: 'blink-skills' }]), 'blink-skills-2');
  assert.equal(makeGroupId('???', []), 'group');
});

test('withSkillData adds your starter groups to a save that has none', () => {
  const next = withSkillData({ version: 2, junglers: [], matchups: {} });
  assert.deepEqual(next.skillGroups.map((group) => group.id), DEFAULT_SKILL_GROUPS.map((group) => group.id));
  assert.deepEqual(next.groupRatings, {});
});

test('withSkillData does not bring back groups you deleted', () => {
  const saved = { version: 2, junglers: [], matchups: {}, skillGroups: [], groupRatings: {} };
  assert.equal(withSkillData(saved), saved);
});

test('withSkillData cleans broken groups and ratings instead of losing the save', () => {
  const next = withSkillData({
    version: 2,
    junglers: [],
    matchups: {},
    skillGroups: [
      { id: 'blink', name: 'Blink', category: 'Movement', heroIds: ['harley', 'nobody', 'harley'] },
      { id: 'broken' },
      'nonsense',
    ],
    groupRatings: { ling: { blink: 'C', gone: 'A', dash: 'X' }, fanny: 'bad' },
  });
  assert.deepEqual(next.skillGroups, [{ id: 'blink', name: 'Blink', category: 'Movement', heroIds: ['harley'] }]);
  assert.deepEqual(next.groupRatings, { ling: { blink: 'C' } });
});
