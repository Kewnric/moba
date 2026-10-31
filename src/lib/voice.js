// Voice control: turns what speech recognition heard into draft actions, and applies them. Plain functions
// shared by the app and the tests. It only acts when nearly everything said was a command or a hero, so
// ordinary talk near the mic doesn't fill slots.
import { HEROES, HERO_BY_ID } from '../data/heroes.js';
import { HERO_ALIASES } from '../data/heroAliases.js';
import { clearSlot, lastAddedSlot, nextBanSlot, nextSlot, setLockedJungler, setSlot, unavailableIds } from './draft.js';

export const normalizeSpeech = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const compact = (text) => text.replace(/ /g, '');

const PHRASES = new Map();
const COMPACT_PHRASES = new Map();
const FUZZY_NAMES = [];

// How a word sounds, so "sabre" and "saber" or "kagura" and "cagura" come out close.
const soundKey = (word) => word
  .replace(/ph/g, 'f')
  .replace(/ck/g, 'k')
  .replace(/tch/g, 'c')
  .replace(/ch/g, 'c')
  .replace(/qu/g, 'kw')
  .replace(/q/g, 'k')
  .replace(/x/g, 'ks')
  .replace(/z/g, 's')
  .replace(/y/g, 'i')
  .replace(/h/g, '')
  .replace(/(.)\1+/g, '$1');

HEROES.forEach((hero) => {
  [hero.name, ...(HERO_ALIASES[hero.id] || [])].forEach((spelling) => {
    const phrase = normalizeSpeech(spelling);
    PHRASES.set(phrase, hero.id);
    COMPACT_PHRASES.set(compact(phrase), hero.id);
  });
  const name = compact(normalizeSpeech(hero.name));
  FUZZY_NAMES.push({ heroId: hero.id, name, key: soundKey(name) });
});

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// Short words must match exactly, because almost any short word is one letter from a hero.
const allowedDistance = (length) => {
  if (length < 6) return 0;
  return length < 9 ? 1 : 2;
};

// The one hero this word is closest to, or null when nothing is close or two heroes tie.
function fuzzyHero(word) {
  const key = soundKey(word);
  let best = null;
  let tied = false;
  FUZZY_NAMES.forEach(({ heroId, name, key: nameKey }) => {
    const allowed = allowedDistance(Math.min(word.length, name.length));
    const distance = Math.min(editDistance(word, name), editDistance(key, nameKey));
    if (distance > allowed) return;
    if (!best || distance < best.distance) {
      best = { heroId, distance };
      tied = false;
    } else if (distance === best.distance && heroId !== best.heroId) {
      tied = true;
    }
  });
  return best && !tied ? best.heroId : null;
}

const asSet = (words) => new Set(words.split(' '));
// Words that carry no meaning in a draft call, such as "they picked" or "okay next is".
const FILLER = asSet('pick picked picks picking add added adding they the a an and is next then also now okay ok um uh please their took take takes have has got my our in as');
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

function matchHeroAt(words, start, aliases) {
  for (let size = Math.min(4, words.length - start); size >= 1; size -= 1) {
    const phrase = words.slice(start, start + size).join(' ');
    if (hasOwn(aliases, phrase)) return { heroId: aliases[phrase], size };
    const heroId = PHRASES.get(phrase) || COMPACT_PHRASES.get(compact(phrase));
    if (heroId) return { heroId, size };
  }
  if (FILLER.has(words[start])) return null;
  for (let size = Math.min(3, words.length - start); size >= 1; size -= 1) {
    const slice = words.slice(start, start + size);
    if (slice.some((word) => FILLER.has(word))) continue;
    const heroId = fuzzyHero(compact(slice.join(' ')));
    if (heroId) return { heroId, size };
  }
  return null;
}

function repeatedCommand(words) {
  const action = WHOLE_PHRASES.get(words[0]);
  if (!action || words.length < 2 || !words.every((word) => word === words[0])) return null;
  return words.map(() => ({ ...action }));
}

// Reads one transcript. A hero or command must account for nearly every word, or it's treated as conversation.
function parseTranscript(transcript, aliases) {
  const phrase = normalizeSpeech(transcript);
  if (!phrase) return [];
  if (!hasOwn(aliases, phrase) && WHOLE_PHRASES.has(phrase)) return [{ ...WHOLE_PHRASES.get(phrase) }];
  const words = phrase.split(' ');
  const repeated = repeatedCommand(words);
  if (repeated) return repeated;

  const actions = [];
  let target = 'next';
  let verb = null; // remove, jungler or lock: applies to the next hero only
  let usedKeyword = false;
  let unknown = 0;

  for (let i = 0; i < words.length;) {
    const hero = matchHeroAt(words, i, aliases);
    if (hero) {
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
  return clear ? actions : [];
}

// Takes every way the recognizer spelled what it heard, best guess first, and uses the first one it can act on.
export function parseVoice(alternatives, { aliases = {} } = {}) {
  const heardList = alternatives.map((text) => String(text || '').trim()).filter(Boolean);
  for (const text of heardList) {
    const actions = parseTranscript(text, aliases);
    if (actions.length) return { heard: text, actions, ignored: false };
  }
  return { heard: heardList[0] || '', actions: [], ignored: true };
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
