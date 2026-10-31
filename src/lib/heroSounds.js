// Finds the hero that something heard sounds closest to. Speech recognition spells hero names as whatever English
// it hears ("Aldo card" for Alucard, "Argos" for Argus), so names are compared by sound rather than by letters.
import { HEROES } from '../data/heroes.js';
import { HERO_ALIASES } from '../data/heroAliases.js';

export const normalizeSpeech = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Spells a word the way it sounds, so "Sabre" and "Saber" or "Cagura" and "Kagura" come out alike.
export const soundKey = (text) => text
  .replace(/[^a-z]/g, '')
  .replace(/^x/, 's')
  .replace(/sch|sh/g, 's')
  .replace(/tch|ch|dg/g, 'j')
  .replace(/ph/g, 'f')
  .replace(/gh/g, 'g')
  .replace(/th/g, 't')
  .replace(/ck/g, 'k')
  .replace(/qu/g, 'kw')
  .replace(/q/g, 'k')
  .replace(/x/g, 'ks')
  .replace(/z/g, 's')
  .replace(/c(?=[eiy])/g, 's')
  .replace(/c/g, 'k')
  .replace(/y/g, 'i')
  .replace(/w/g, 'u')
  .replace(/h/g, '')
  .replace(/(.)\1+/g, '$1');

const VOWELS = 'aeiou';
const isVowel = (letter) => VOWELS.includes(letter);
// Consonants made in the same way that get confused for each other, such as "b" and "v", or "d" and "t".
const SOUND_FAMILIES = ['pbfv', 'td', 'kg', 'sj', 'mn', 'lr'];
const FAMILY_OF = Object.fromEntries(SOUND_FAMILIES.flatMap((family) => [...family].map((letter) => [letter, family])));

const VOWEL_SWAP = 0.25;
// The first sound of a name is heard most reliably, so a different opening vowel counts for more.
const FIRST_VOWEL_SWAP = 0.6;
const FAMILY_SWAP = 0.4;
const VOWEL_GAP = 0.5;

function swapCost(a, b, atStart) {
  if (a === b) return 0;
  if (isVowel(a) && isVowel(b)) return atStart ? FIRST_VOWEL_SWAP : VOWEL_SWAP;
  if (FAMILY_OF[a] && FAMILY_OF[a] === FAMILY_OF[b]) return FAMILY_SWAP;
  return 1;
}

const gapCost = (letter) => (isVowel(letter) ? VOWEL_GAP : 1);

// How many sound changes it takes to get from one spelling to the other. Vowels and related consonants cost less,
// because those are the mistakes speech recognition makes.
function soundDistance(a, b) {
  let previous = [0];
  for (let j = 1; j <= b.length; j += 1) previous[j] = previous[j - 1] + gapCost(b[j - 1]);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [previous[0] + gapCost(a[i - 1])];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + gapCost(a[i - 1]),
        current[j - 1] + gapCost(b[j - 1]),
        previous[j - 1] + swapCost(a[i - 1], b[j - 1], i === 1 && j === 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

const SAME_START_BONUS = 0.05;

const startsAlike = (a, b) => a[0] === b[0] || (FAMILY_OF[a[0]] && FAMILY_OF[a[0]] === FAMILY_OF[b[0]]);

// 1 means they sound the same; 0 means nothing in common. The start of a name is what's heard most reliably.
export function soundSimilarity(a, b) {
  if (!a || !b) return 0;
  const score = 1 - soundDistance(a, b) / Math.max(a.length, b.length);
  return Math.min(1, score + (startsAlike(a, b) ? SAME_START_BONUS : 0));
}

// A known mishearing counts for slightly less than the hero's real name.
const ALIAS_PENALTY = 0.03;
// When two heroes sound equally close, the one spelled more like what was heard wins.
const SPELLING_TIEBREAK = 0.03;

function letterDistance(a, b) {
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

const lettersOf = (text) => normalizeSpeech(text).replace(/[^a-z]/g, '');
const spelling = (heroId, text, penalty) => ({ heroId, letters: lettersOf(text), key: soundKey(lettersOf(text)), penalty });

const SPELLINGS = HEROES.flatMap((hero) => [
  spelling(hero.id, hero.name, 0),
  ...(HERO_ALIASES[hero.id] || []).map((alias) => spelling(hero.id, alias, ALIAS_PENALTY)),
]);

// Every hero that sounds anything like this, closest first.
export function closestHeroes(text, { exclude = [] } = {}) {
  const letters = lettersOf(text);
  const key = soundKey(letters);
  if (!key) return [];
  const skip = new Set(exclude);
  const best = new Map();
  SPELLINGS.forEach((candidate) => {
    if (skip.has(candidate.heroId)) return;
    const sameLetters = 1 - letterDistance(letters, candidate.letters) / Math.max(letters.length, candidate.letters.length);
    const score = soundSimilarity(key, candidate.key) - candidate.penalty + sameLetters * SPELLING_TIEBREAK;
    const current = best.get(candidate.heroId);
    if (!current || score > current.score) best.set(candidate.heroId, { heroId: candidate.heroId, score, length: Math.min(key.length, candidate.key.length) });
  });
  return Array.from(best.values()).sort((a, b) => (b.score - a.score) || a.heroId.localeCompare(b.heroId));
}

// How close is close enough to act on without asking. Short names need to be nearer, because almost any short word
// is only a sound or two away from one.
export function isConfidentMatch({ score, length }) {
  if (length <= 3) return score >= 0.9;
  if (length === 4) return score >= 0.8;
  if (length === 5) return score >= 0.76;
  return score >= 0.72;
}

// Lowest score still worth offering as a "did you mean" button.
export const GUESS_SCORE = 0.42;
