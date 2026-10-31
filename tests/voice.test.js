import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { HERO_ALIASES } from '../src/data/heroAliases.js';
import { createDraft, setSlot, clearSlot } from '../src/lib/draft.js';
import { applyVoiceAction, normalizeSpeech, parseVoice } from '../src/lib/voice.js';

const heard = (text, options) => parseVoice([text], options);
const picks = (text, options) => heard(text, options).actions.filter((action) => action.type === 'pick').map((action) => action.heroId);

test('every hero can be picked by saying their name', () => {
  HEROES.forEach((hero) => {
    assert.deepEqual(picks(hero.name), [hero.id], hero.name);
  });
});

test('aliases point at heroes that exist, and never at two different heroes', () => {
  const owners = new Map();
  Object.entries(HERO_ALIASES).forEach(([heroId, aliases]) => {
    assert.ok(HEROES.some((hero) => hero.id === heroId), heroId);
    aliases.forEach((alias) => {
      const key = normalizeSpeech(alias);
      assert.ok(!owners.has(key) || owners.get(key) === heroId, `${alias} belongs to ${owners.get(key)} and ${heroId}`);
      owners.set(key, heroId);
    });
  });
});

test('common mishearings of hero names still work', () => {
  const cases = {
    'lance a lot': 'lancelot',
    funny: 'fanny',
    moscow: 'moskov',
    change: 'chang-e',
    leslie: 'lesley',
    lucas: 'lukas',
    matilda: 'mathilda',
    'ex borg': 'x-borg',
    'one one': 'wanwan',
    'lee sun shin': 'yi-sun-shin',
    obsidian: 'obsidia',
    amon: 'aamon',
  };
  Object.entries(cases).forEach(([said, heroId]) => assert.deepEqual(picks(said), [heroId], said));
});

test('close spellings match through fuzzy matching', () => {
  assert.deepEqual(picks('hayabuza'), ['hayabusa']);
  assert.deepEqual(picks('gatotkatcha'), ['gatotkaca']);
  assert.deepEqual(picks('benedeta'), ['benedetta']);
});

test('heroes whose names contain other words stay whole', () => {
  assert.deepEqual(picks('popol and kupa'), ['popol-and-kupa']);
  assert.deepEqual(picks('yi sun shin'), ['yi-sun-shin']);
  assert.deepEqual(picks('sun'), ['sun']);
});

test('several heroes in one breath are all picked, in order', () => {
  assert.deepEqual(picks('lancelot and ling'), ['lancelot', 'ling']);
  assert.deepEqual(picks('harley, moskov, gusion'), ['harley', 'moskov', 'gusion']);
});

test('filler words around a hero are fine', () => {
  assert.deepEqual(picks('they picked lancelot'), ['lancelot']);
  assert.deepEqual(picks('next is ling'), ['ling']);
  assert.deepEqual(picks('okay they took fanny please'), ['fanny']);
});

test('ordinary conversation is ignored, even with a hero word in it', () => {
  ['that was so funny', 'the sun is out today', 'roger that man', 'hello can you hear me', 'what a great game'].forEach((said) => {
    const result = heard(said);
    assert.equal(result.ignored, true, said);
    assert.deepEqual(result.actions, [], said);
  });
});

test('everyday words do not fuzzy match a hero', () => {
  ['table', 'valley', 'lesson', 'hello', 'really'].forEach((said) => assert.equal(heard(said).ignored, true, said));
});

test('undo and erase are commands of their own', () => {
  assert.deepEqual(heard('undo').actions, [{ type: 'undo' }]);
  assert.deepEqual(heard('undo that').actions, [{ type: 'undo' }]);
  assert.deepEqual(heard('erase').actions, [{ type: 'erase' }]);
  assert.deepEqual(heard('remove last').actions, [{ type: 'erase' }]);
  assert.deepEqual(heard('delete that').actions, [{ type: 'erase' }]);
});

test('saying a command twice runs it twice', () => {
  assert.deepEqual(heard('undo undo').actions, [{ type: 'undo' }, { type: 'undo' }]);
  assert.deepEqual(heard('erase erase').actions, [{ type: 'erase' }, { type: 'erase' }]);
});

test('ban, enemy and ally choose where heroes go', () => {
  assert.deepEqual(heard('ban lancelot').actions, [{ type: 'pick', heroId: 'lancelot', target: 'ban' }]);
  assert.deepEqual(heard('ban ling and fanny').actions, [{ type: 'pick', heroId: 'ling', target: 'ban' }, { type: 'pick', heroId: 'fanny', target: 'ban' }]);
  assert.deepEqual(heard('enemy harley').actions, [{ type: 'pick', heroId: 'harley', target: 'enemy' }]);
  assert.deepEqual(heard('my team tigreal').actions, [{ type: 'pick', heroId: 'tigreal', target: 'ally' }]);
  assert.deepEqual(heard('lancelot').actions, [{ type: 'pick', heroId: 'lancelot', target: 'next' }]);
});

test('remove with a name takes that hero out', () => {
  assert.deepEqual(heard('remove ling').actions, [{ type: 'remove', heroId: 'ling' }]);
  assert.deepEqual(heard('erase harley').actions, [{ type: 'remove', heroId: 'harley' }]);
});

test('their jungler can be said before or after the name', () => {
  assert.deepEqual(heard('jungler lancelot').actions, [{ type: 'jungler', heroId: 'lancelot' }]);
  assert.deepEqual(heard('lancelot is their jungler').actions, [{ type: 'jungler', heroId: 'lancelot' }]);
});

test('other commands', () => {
  assert.deepEqual(heard('new draft').actions, [{ type: 'newDraft' }]);
  assert.deepEqual(heard('stop listening').actions, [{ type: 'stopVoice' }]);
  assert.deepEqual(heard('lock in').actions, [{ type: 'lock', heroId: null }]);
  assert.deepEqual(heard('lock in lancelot').actions, [{ type: 'lock', heroId: 'lancelot' }]);
  assert.deepEqual(heard('unlock').actions, [{ type: 'unlock' }]);
});

test('words you taught it win over everything else', () => {
  const aliases = { 'my main man': 'lancelot', sun: 'suyou' };
  assert.deepEqual(picks('my main man', { aliases }), ['lancelot']);
  assert.deepEqual(picks('sun', { aliases }), ['suyou']);
});

test('the first alternative with a usable command wins', () => {
  const result = parseVoice(['what a lot', 'lance a lot', 'fanny'], {});
  assert.deepEqual(result.actions, [{ type: 'pick', heroId: 'lancelot', target: 'next' }]);
  assert.equal(result.heard, 'lance a lot');
});

test('with no usable alternative it reports the first thing it heard', () => {
  const result = parseVoice(['good game', 'could game'], {});
  assert.equal(result.ignored, true);
  assert.equal(result.heard, 'good game');
});

const enemyOnly = { enemyOnly: true, history: [] };

test('a heard hero goes into the next enemy slot', () => {
  const { draft, ok, note } = applyVoiceAction(createDraft(), { type: 'pick', heroId: 'ling', target: 'next' }, enemyOnly);
  assert.equal(ok, true);
  assert.equal(draft.enemy[0], 'ling');
  assert.match(note, /Ling/);
});

test('a hero you selected a slot for goes into that slot first', () => {
  const { draft } = applyVoiceAction(createDraft(), { type: 'pick', heroId: 'ling', target: 'next' }, { ...enemyOnly, preferredSlot: { group: 'enemy', index: 3 } });
  assert.equal(draft.enemy[3], 'ling');
});

test('a hero already in the draft is refused with a reason', () => {
  const start = setSlot(createDraft(), { group: 'enemy', index: 0 }, 'ling');
  const { draft, ok, note } = applyVoiceAction(start, { type: 'pick', heroId: 'ling', target: 'next' }, enemyOnly);
  assert.equal(ok, false);
  assert.equal(draft, start);
  assert.match(note, /already/i);
});

test('full slots are refused with a reason', () => {
  let start = createDraft();
  ['a', 'b', 'c', 'd', 'e'].forEach((id, index) => { start = setSlot(start, { group: 'enemy', index }, id); });
  const { ok, note } = applyVoiceAction(start, { type: 'pick', heroId: 'ling', target: 'next' }, enemyOnly);
  assert.equal(ok, false);
  assert.match(note, /full/i);
});

test('bans and your team report it when they are off', () => {
  const noBans = createDraft({ bansPerTeam: 0 });
  assert.match(applyVoiceAction(noBans, { type: 'pick', heroId: 'ling', target: 'ban' }, enemyOnly).note, /bans are off/i);
  assert.match(applyVoiceAction(createDraft(), { type: 'pick', heroId: 'ling', target: 'ally' }, enemyOnly).note, /your team/i);
});

test('saying ban fills the next ban slot', () => {
  const { draft } = applyVoiceAction(createDraft(), { type: 'pick', heroId: 'ling', target: 'ban' }, enemyOnly);
  assert.equal(draft.allyBans[0], 'ling');
});

test('erase removes the hero added most recently, not just the last slot', () => {
  const first = setSlot(createDraft(), { group: 'enemy', index: 3 }, 'ling');
  const second = setSlot(first, { group: 'enemy', index: 0 }, 'fanny');
  const { draft, ok } = applyVoiceAction(second, { type: 'erase' }, { enemyOnly: true, history: [createDraft(), first] });
  assert.equal(ok, true);
  assert.equal(draft.enemy[0], null);
  assert.equal(draft.enemy[3], 'ling');
});

test('erase skips a hero that was already taken back out', () => {
  const first = setSlot(createDraft(), { group: 'enemy', index: 0 }, 'ling');
  const second = setSlot(first, { group: 'enemy', index: 1 }, 'fanny');
  const third = clearSlot(second, { group: 'enemy', index: 1 });
  const { draft } = applyVoiceAction(third, { type: 'erase' }, { enemyOnly: true, history: [createDraft(), first, second] });
  assert.equal(draft.enemy[0], null);
});

test('erase falls back to the last filled enemy slot when there is no history', () => {
  const start = setSlot(setSlot(createDraft(), { group: 'enemy', index: 0 }, 'ling'), { group: 'enemy', index: 2 }, 'fanny');
  assert.equal(applyVoiceAction(start, { type: 'erase' }, enemyOnly).draft.enemy[2], null);
});

test('erase on an empty draft says there is nothing to remove', () => {
  const start = createDraft();
  const { ok, draft } = applyVoiceAction(start, { type: 'erase' }, enemyOnly);
  assert.equal(ok, false);
  assert.equal(draft, start);
});

test('remove finds the hero wherever they are', () => {
  const start = setSlot(createDraft(), { group: 'enemyBans', index: 1 }, 'ling');
  const { draft, ok } = applyVoiceAction(start, { type: 'remove', heroId: 'ling' }, enemyOnly);
  assert.equal(ok, true);
  assert.equal(draft.enemyBans[1], null);
  assert.equal(applyVoiceAction(createDraft(), { type: 'remove', heroId: 'ling' }, enemyOnly).ok, false);
});

test('marking a jungler adds them to the enemy picks if needed', () => {
  const { draft } = applyVoiceAction(createDraft(), { type: 'jungler', heroId: 'ling' }, enemyOnly);
  assert.equal(draft.enemy[0], 'ling');
  assert.equal(draft.enemyJungler, 'ling');
  const named = setSlot(createDraft(), { group: 'enemy', index: 2 }, 'fanny');
  const marked = applyVoiceAction(named, { type: 'jungler', heroId: 'fanny' }, enemyOnly).draft;
  assert.equal(marked.enemy[2], 'fanny');
  assert.equal(marked.enemyJungler, 'fanny');
});

test('lock in needs a jungler who is still available', () => {
  assert.equal(applyVoiceAction(createDraft(), { type: 'lock', heroId: null }, enemyOnly).ok, false);
  assert.equal(applyVoiceAction(createDraft(), { type: 'lock', heroId: 'ling' }, enemyOnly).draft.lockedJungler, 'ling');
  const banned = setSlot(createDraft(), { group: 'allyBans', index: 0 }, 'ling');
  assert.equal(applyVoiceAction(banned, { type: 'lock', heroId: 'ling' }, enemyOnly).ok, false);
});

test('unlock goes back to choosing', () => {
  const locked = applyVoiceAction(createDraft(), { type: 'lock', heroId: 'ling' }, enemyOnly).draft;
  assert.equal(applyVoiceAction(locked, { type: 'unlock' }, enemyOnly).draft.lockedJungler, null);
});
