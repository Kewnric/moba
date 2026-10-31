// Voice control: turns what speech recognition heard into draft actions, and applies them. Plain functions
// shared by the app and the tests. Anything that isn't an everyday word goes to the hero it sounds closest to, but it
// only acts when nearly everything said was a command or a hero, so ordinary talk near the mic doesn't fill slots.
import { HEROES, HERO_BY_ID } from '../data/heroes.js';
import { COMMON_WORDS } from '../data/commonWords.js';
import { HERO_ALIASES } from '../data/heroAliases.js';
import { GUESS_SCORE, closestHeroes, isConfidentMatch, normalizeSpeech } from './heroSounds.js';
import { clearSlot, lastAddedSlot, nextBanSlot, nextSlot, setLockedJungler, setSlot, unavailableIds } from './draft.js';

export { normalizeSpeech };

const compact = (text) => text.replace(/ /g, '');

const PHRASES = new Map();
const COMPACT_PHRASES = new Map();

HEROES.forEach((hero) => {
  [hero.name, ...(HERO_ALIASES[hero.id] || [])].forEach((spelling) => {
    const phrase = normalizeSpeech(spelling);
    PHRASES.set(phrase, hero.id);
    COMPACT_PHRASES.set(compact(phrase), hero.id);
  });
});

const asSet = (words) => new Set(words.split(' '));
// Words that carry no meaning in a draft call, such as "they picked" or "okay next is".
const FILLER = asSet('pick picked picks picking add added adding they the a an and is next then also now okay ok um uh please their took take takes have has got my our in as s');
const TARGET_WORDS = { ban: 'ban', bans: 'ban', banned: 'ban', banning: 'ban', enemy: 'enemy', enemies: 'enemy', opponent: 'enemy', ally: 'ally', allies: 'ally', team: 'ally', teammate: 'ally' };
const REMOVE_WORDS = asSet('remove erase delete');
const JUNGLER_WORDS = asSet('jungler jungle jungling jg');
const LOCK_WORDS = asSet('lock locked');

const WHOLE_PHRASES = new Map();
const addPhrases = (action, phrases) => phrases.forEach((phrase) => WHOLE_PHRASES.set(phrase, action));
addPhrases({ type: 'undo' }, ['undo', 'undo that', 'undo it', 'undo last', 'go back', 'take that back', 'undue', 'on do', 'and do']);
addPhrases({ type: 'erase' }, ['erase', 'erase that', 'erase it', 'erase last', 'erased', 'a race', 'remove', 'remove that', 'remove it', 'remove last', 'delete', 'delete that', 'delete it', 'delete last', 'scratch that', 'wrong', 'wrong one', 'wrong hero', 'clear last']);
addPhrases({ type: 'newDraft' }, ['new draft', 'start over', 'clear draft', 'reset draft', 'clear all']);
addPhrases({ type: 'stopVoice' }, ['stop listening', 'voice off', 'mic off', 'stop voice', 'turn off voice']);
addPhrases({ type: 'lock', heroId: null }, ['lock', 'lock in', 'lock it', 'lock it in', 'lock pick', 'lock my pick']);
addPhrases({ type: 'unlock' }, ['unlock', 'change pick', 'change my pick']);

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const isCommandWord = (word) => hasOwn(TARGET_WORDS, word) || REMOVE_WORDS.has(word) || JUNGLER_WORDS.has(word) || LOCK_WORDS.has(word);

// A hero's real name or a known spelling at this position, longest first.
function exactHeroAt(words, start, aliases) {
  for (let size = Math.min(4, words.length - start); size >= 1; size -= 1) {
    const phrase = words.slice(start, start + size).join(' ');
    if (hasOwn(aliases, phrase)) return { heroId: aliases[phrase], size };
    const heroId = PHRASES.get(phrase) || COMPACT_PHRASES.get(compact(phrase));
    if (heroId) return { heroId, size };
  }
  return null;
}

// The closest-sounding hero to the words at this position, longest first so "aldo card" is heard as one name.
function closestHeroAt(words, start, takenIds) {
  for (let size = Math.min(3, words.length - start); size >= 1; size -= 1) {
    const slice = words.slice(start, start + size);
    const usable = !slice.some((word) => FILLER.has(word) || isCommandWord(word)) && !slice.every((word) => COMMON_WORDS.has(word));
    if (usable) {
      const [closest] = closestHeroes(compact(slice.join(' ')), { exclude: takenIds });
      if (closest && isConfidentMatch(closest)) return { heroId: closest.heroId, size, fuzzyPhrase: slice.join(' ') };
    }
  }
  return null;
}

function repeatedCommand(words) {
  const action = WHOLE_PHRASES.get(words[0]);
  if (!action || words.length < 2 || !words.every((word) => word === words[0])) return null;
  return words.map(() => ({ ...action }));
}

// Reads one transcript. A hero or command must account for nearly every word, or it's treated as conversation.
function parseTranscript(transcript, aliases, takenIds) {
  const phrase = normalizeSpeech(transcript);
  if (!phrase) return { actions: [], fuzzyPhrase: null };
  if (!hasOwn(aliases, phrase) && WHOLE_PHRASES.has(phrase)) return { actions: [{ ...WHOLE_PHRASES.get(phrase) }], fuzzyPhrase: null };
  const words = phrase.split(' ');
  const repeated = repeatedCommand(words);
  if (repeated) return { actions: repeated, fuzzyPhrase: null };

  const actions = [];
  let target = 'next';
  let verb = null; // remove, jungler or lock: applies to the next hero only
  let usedKeyword = false;
  let unknown = 0;
  let fuzzyPhrase = null;

  for (let i = 0; i < words.length;) {
    const hero = exactHeroAt(words, i, aliases) || closestHeroAt(words, i, verb === 'remove' ? [] : takenIds);
    if (hero) {
      if (hero.fuzzyPhrase && !fuzzyPhrase) fuzzyPhrase = hero.fuzzyPhrase;
      if (verb === 'remove') actions.push({ type: 'remove', heroId: hero.heroId });
      else if (verb === 'jungler') actions.push({ type: 'jungler', heroId: hero.heroId });
      else if (verb === 'lock') actions.push({ type: 'lock', heroId: hero.heroId });
      else actions.push({ type: 'pick', heroId: hero.heroId, target });
      verb = null;
      i += hero.size;
    } else {
      const word = words[i];
      if (hasOwn(TARGET_WORDS, word)) {
        target = TARGET_WORDS[word];
        usedKeyword = true;
      } else if (REMOVE_WORDS.has(word)) {
        verb = 'remove';
        usedKeyword = true;
      } else if (LOCK_WORDS.has(word)) {
        verb = 'lock';
        usedKeyword = true;
      } else if (JUNGLER_WORDS.has(word)) {
        const last = actions[actions.length - 1];
        if (last && last.type === 'pick') actions[actions.length - 1] = { type: 'jungler', heroId: last.heroId };
        else verb = 'jungler';
        usedKeyword = true;
      } else if (!FILLER.has(word)) {
        unknown += 1;
      }
      i += 1;
    }
  }

  const clear = unknown === 0 || (unknown === 1 && (usedKeyword || actions.length >= 2));
  return clear ? { actions, fuzzyPhrase } : { actions: [], fuzzyPhrase: null };
}

const GUESS_LIMIT = 3;
// How far behind the best match a hero can be and still be worth offering.
const GUESS_RANGE = 0.2;

// Other close heroes to offer as buttons, leaving out everyday words and anyone already acted on.
function guessesFor(transcript, usedIds, takenIds) {
  const words = normalizeSpeech(transcript).split(' ').filter((word) => word && !FILLER.has(word) && !isCommandWord(word));
  if (!words.length || words.every((word) => COMMON_WORDS.has(word))) return [];
  const candidates = [compact(words.join(' ')), ...words.filter((word) => !COMMON_WORDS.has(word))];
  const best = new Map();
  candidates.forEach((text) => {
    closestHeroes(text, { exclude: takenIds }).forEach(({ heroId, score }) => {
      if (score > (best.get(heroId) || 0)) best.set(heroId, score);
    });
  });
  const ranked = Array.from(best.entries()).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return [];
  const lowest = Math.max(GUESS_SCORE, ranked[0][1] - GUESS_RANGE);
  return ranked
    .filter(([heroId, score]) => score >= lowest && !usedIds.includes(heroId))
    .slice(0, GUESS_LIMIT)
    .map(([heroId]) => heroId);
}

// Takes every way the recognizer spelled what it heard, best guess first. An exact name in any of them beats a close
// guess in an earlier one. `guesses` are other heroes to offer, in case this was misheard.
export function parseVoice(alternatives, { aliases = {}, takenIds = [] } = {}) {
  const heardList = alternatives.map((text) => String(text || '').trim()).filter(Boolean);
  const parsed = heardList.map((text) => ({ heard: text, ...parseTranscript(text, aliases, takenIds) }));
  const exact = parsed.find((item) => item.actions.length && !item.fuzzyPhrase);
  const usable = exact || parsed.find((item) => item.actions.length);
  if (usable) {
    const usedIds = usable.actions.map((action) => action.heroId).filter(Boolean);
    return { heard: usable.heard, actions: usable.actions, ignored: false, fuzzyPhrase: usable.fuzzyPhrase, guesses: usable.fuzzyPhrase ? guessesFor(usable.fuzzyPhrase, usedIds, takenIds) : [] };
  }
  const heard = heardList[0] || '';
  return { heard, actions: [], ignored: true, fuzzyPhrase: null, guesses: guessesFor(heard, [], takenIds) };
}

const nameOf = (heroId) => (HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].name : heroId);
const SLOT_WORDS = { ally: 'your team', enemy: 'enemy pick', allyBans: 'bans', enemyBans: 'bans' };

function findHero(draft, heroId) {
  for (const group of ['enemy', 'ally', 'enemyBans', 'allyBans']) {
    const index = draft[group].indexOf(heroId);
    if (index !== -1) return { group, index };
  }
  return null;
}

function slotFor(draft, target, { enemyOnly, preferredSlot }) {
  if (target === 'ban') return draft.bansPerTeam > 0 ? { slot: nextBanSlot(draft), full: 'The bans are full.' } : { problem: 'Bans are off, so that ban was skipped.' };
  if (target === 'ally') {
    if (enemyOnly) return { problem: 'Your team is off, so that pick was skipped.' };
    const index = draft.ally.indexOf(null);
    return { slot: index === -1 ? null : { group: 'ally', index }, full: 'Your team is full.' };
  }
  if (target === 'enemy') {
    const index = draft.enemy.indexOf(null);
    return { slot: index === -1 ? null : { group: 'enemy', index }, full: 'The enemy lineup is full.' };
  }
  return { slot: preferredSlot || nextSlot(draft, { enemyOnly }), full: 'The draft is full.' };
}

// Applies one heard action to the draft. Returns the new draft (the same one when nothing changed), whether it
// worked, and a short note to show.
export function applyVoiceAction(draft, action, { enemyOnly = true, preferredSlot = null, history = [] } = {}) {
  switch (action.type) {
    case 'pick': {
      const name = nameOf(action.heroId);
      if (unavailableIds(draft).includes(action.heroId)) return { draft, ok: false, note: `${name} is already in the draft.` };
      const { slot, full, problem } = slotFor(draft, action.target, { enemyOnly, preferredSlot });
      if (problem) return { draft, ok: false, note: problem };
      if (!slot) return { draft, ok: false, note: full };
      const place = slot.group === 'enemy' || slot.group === 'ally' ? `${SLOT_WORDS[slot.group]}${slot.group === 'enemy' ? ` ${slot.index + 1}` : ''}` : SLOT_WORDS[slot.group];
      return { draft: setSlot(draft, slot, action.heroId), ok: true, note: `Added ${name} to ${place}.` };
    }
    case 'remove': {
      const slot = findHero(draft, action.heroId);
      if (!slot) return { draft, ok: false, note: `${nameOf(action.heroId)} isn't in the draft.` };
      return { draft: clearSlot(draft, slot), ok: true, note: `Removed ${nameOf(action.heroId)}.` };
    }
    case 'erase': {
      const slot = lastAddedSlot(draft, history);
      if (!slot) return { draft, ok: false, note: 'There is nothing to remove.' };
      return { draft: clearSlot(draft, slot), ok: true, note: `Removed ${nameOf(draft[slot.group][slot.index])}.` };
    }
    case 'jungler': {
      const name = nameOf(action.heroId);
      if (draft.enemy.includes(action.heroId)) return { draft: { ...draft, enemyJungler: action.heroId }, ok: true, note: `${name} is their jungler.` };
      const added = applyVoiceAction(draft, { type: 'pick', heroId: action.heroId, target: 'enemy' }, { enemyOnly, history });
      if (!added.ok) return added;
      return { draft: { ...added.draft, enemyJungler: action.heroId }, ok: true, note: `Added ${name} as their jungler.` };
    }
    case 'lock': {
      if (!action.heroId) return { draft, ok: false, note: 'There is no pick to lock in yet.' };
      if (unavailableIds(draft).includes(action.heroId)) return { draft, ok: false, note: `${nameOf(action.heroId)} isn't available.` };
      return { draft: setLockedJungler(draft, action.heroId), ok: true, note: `Locked in ${nameOf(action.heroId)}.` };
    }
    case 'unlock':
      return { draft: setLockedJungler(draft, null), ok: true, note: 'Back to choosing.' };
    default:
      return { draft, ok: false, note: '' };
  }
}
