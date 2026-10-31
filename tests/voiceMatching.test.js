import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { COMMON_WORDS } from '../src/data/commonWords.js';
import { normalizeSpeech, parseVoice } from '../src/lib/voice.js';

// What speech recognition really turns hero names into: English words, split words and near spellings.
const MISHEARINGS = {
  aamon: ['aman', 'ammon', 'eamon', 'a mon'],
  akai: ['a kai', 'akay', 'aki'],
  aldous: ['aldis', 'aldus', 'aldos'],
  alucard: ['aldo card', 'alu card', 'allu card', 'a lucard', 'al card', 'allucard', 'aloo card', 'lucard'],
  argus: ['argos', 'arguss', 'argis'],
  arlott: ['arlo', 'arlot', 'arlette'],
  aulus: ['aulos', 'olas', 'oulus'],
  aurora: ['arora', 'aroura'],
  badang: ['bad ang', 'bedang', 'batang', 'bodang', 'bad dang', 'badan', 'by dang', 'bedding'],
  balmond: ['belmond', 'balmont', 'almond', 'balm and'],
  bane: ['bain', 'bayne'],
  barats: ['barrats', 'barrett s', 'brats', 'borats'],
  baxia: ['backsia', 'baksia', 'bakshia', 'boxia'],
  beatrix: ['beatrice', 'beatriks'],
  belerick: ['bellerick', 'bell eric', 'belle rick', 'bellarick'],
  benedetta: ['benedita', 'benedetto', 'benny detta'],
  carmilla: ['camilla', 'carmella', 'karmila'],
  cecilion: ['cecilian', 'sicilian', 'cecil ian', 'sicilion'],
  'chang-e': ['chang e', 'change', 'changi', 'chang a'],
  chou: ['chow', 'chew', 'cho'],
  cici: ['cc', 'sisi', 'cece', 'sissy'],
  diggie: ['diggy', 'digi', 'digby'],
  dyrroth: ['dyroth', 'dirath', 'die roth', 'dairoth', 'derroth'],
  estes: ['estis', 'estez'],
  eudora: ['eudoro', 'you dora', 'udora'],
  faramis: ['pharamis', 'farah miss', 'paramis'],
  floryn: ['florin', 'flora', 'florine'],
  fredrinn: ['fredrin', 'fred rin', 'fred ryan', 'friedrin'],
  gatotkaca: ['gatot kaca', 'gato kaka', 'gatot kacha', 'gatokaka'],
  gloo: ['glue', 'glu'],
  gord: ['gourd', 'gordo'],
  grock: ['grok', 'grog', 'crock'],
  guinevere: ['guinever', 'gwenivere', 'guenevere'],
  gusion: ['gucci on', 'gushion', 'gusian', 'goshen', 'gushin', 'goosen'],
  hanabi: ['hana b', 'hanabee', 'hannabi'],
  harith: ['harif', 'hareth', 'harris'],
  hayabusa: ['haya busa', 'hayabuza', 'heyabusa'],
  helcurt: ['hell curt', 'helcur', 'hell court', 'hill kurt'],
  hirara: ['hi rara', 'hirana', 'hilara'],
  hylos: ['hilos', 'high los', 'hi los', 'hylo'],
  irithel: ['erie thel', 'iri thel', 'arithel', 'irithal'],
  ixia: ['iksia', 'ix ia', 'ixya'],
  jawhead: ['jaw head', 'jahead'],
  kadita: ['kadeeta', 'cadita', 'cardita'],
  kagura: ['cagura', 'kagora', 'kakura'],
  kaja: ['kasha', 'kaia', 'kaya', 'caja'],
  kalea: ['kalia', 'kaleah', 'kaliya'],
  karina: ['carina', 'corina', 'karena'],
  karrie: ['carrie', 'kerry', 'kari'],
  khaleed: ['khaled', 'khalid', 'kalid'],
  khufra: ['kufra', 'kofra', 'cufra', 'cobra'],
  kimmy: ['kimmie', 'kimi'],
  lancelot: ['lance a lot', 'lance lot', 'lansalot', 'lancelott'],
  'lapu-lapu': ['lapu lapu', 'lapo lapo', 'lafu lafu'],
  layla: ['leila', 'laila', 'lila'],
  leomord: ['leo mord', 'leo more', 'leo moore', 'liomord'],
  lesley: ['leslie', 'lesly'],
  ling: ['lin', 'lynn', 'leng'],
  lukas: ['lucas', 'lucus'],
  lunox: ['luna x', 'lunar x', 'lunix', 'lunacs', 'luna knox'],
  'luo-yi': ['louie', 'lu yi', 'lo yi', 'luoyi'],
  lylia: ['lilia', 'lydia', 'lilya', 'lelia'],
  marcel: ['marcell', 'marsell'],
  martis: ['marty s', 'mardis', 'martes'],
  masha: ['marsha', 'mesha'],
  minsitthar: ['min sitar', 'minsitar', 'minsittar'],
  miya: ['mia', 'maya', 'mya'],
  moskov: ['moscow', 'moscov', 'maskov'],
  natan: ['nathan', 'nathen'],
  novaria: ['nova ria', 'novarya', 'bavaria'],
  obsidia: ['obsidian', 'absidia'],
  odette: ['odet', 'odetta'],
  paquito: ['pakito', 'pa quito', 'mosquito', 'paquita'],
  pharsa: ['farsa', 'parsa', 'pharsah'],
  phoveus: ['phobos', 'foveus', 'phoebus', 'fovius'],
  'popol-and-kupa': ['popol', 'kupa', 'popo and kupa', 'papal and cooper', 'popol and cooper'],
  rafaela: ['raphaela', 'rafael', 'rafaella'],
  saber: ['sabre', 'saver', 'sayber'],
  selena: ['salina', 'celina', 'selina'],
  silvanna: ['silvana', 'sylvana'],
  suyou: ['su you', 'sue you', 'suyu'],
  terizla: ['terisla', 'tarizla', 'terrizla'],
  thamuz: ['tamuz', 'thomas', 'tamus'],
  tigreal: ['tigrel', 'tiger real', 'tiger eel', 'tigre al'],
  vale: ['veil', 'vail', 'bale'],
  valir: ['valier', 'valor', 'valeer'],
  vexana: ['vexanna', 'vixana', 'vexiana'],
  wanwan: ['wan wan', 'one one', 'juan juan', 'wang wang'],
  'x-borg': ['x borg', 'ex borg', 'xborg', 'exborg'],
  xavier: ['zavier', 'xaviar', 'havier'],
  'yi-sun-shin': ['e sun shin', 'yi sun sin', 'lee sun shin', 'yisunshin'],
  yin: ['yen', 'yinn'],
  'yu-zhong': ['you jong', 'yu jong', 'yuzhong', 'you zhong'],
  yve: ['eve', 'yves'],
  zetian: ['ze tian', 'zitian', 'zetan'],
  zhask: ['zask', 'jask', 'zhasque'],
  zhuxin: ['zhu xin', 'zuxin', 'juxin', 'jushin'],
  zilong: ['zi long', 'zee long', 'silong', 'zylong'],
};

Object.entries(MISHEARINGS).forEach(([heroId, spellings]) => {
  test(`mishearings of ${heroId}`, () => {
    spellings.forEach((said) => {
      const { actions } = parseVoice([said]);
      assert.deepEqual(actions.map((action) => action.heroId), [heroId], `"${said}" should mean ${heroId}, got ${JSON.stringify(actions)}`);
    });
  });
});

test('the examples from real use work', () => {
  assert.deepEqual(parseVoice(['Aldo card.']).actions, [{ type: 'pick', heroId: 'alucard', target: 'next' }]);
  assert.deepEqual(parseVoice(['Argos.']).actions, [{ type: 'pick', heroId: 'argus', target: 'next' }]);
});

test('mishearings work with the same command words', () => {
  assert.deepEqual(parseVoice(['ban argos']).actions, [{ type: 'pick', heroId: 'argus', target: 'ban' }]);
  assert.deepEqual(parseVoice(['they picked aldo card']).actions, [{ type: 'pick', heroId: 'alucard', target: 'next' }]);
  assert.deepEqual(parseVoice(['argos and aldo card']).actions.map((action) => action.heroId), ['argus', 'alucard']);
  assert.deepEqual(parseVoice(['remove aldo card']).actions, [{ type: 'remove', heroId: 'alucard' }]);
});

test('ordinary chatter still does nothing', () => {
  [
    'yes', 'no', 'okay', 'nice', 'bro', 'thanks', 'wait', 'come on', 'let s go', 'good game', 'gg', 'push', 'tower',
    'turtle', 'lord', 'gank', 'hello', 'what', 'why', 'really', 'sorry', 'mid lane', 'gold lane', 'jungle', 'hmm',
    'wow', 'oh no', 'bad', 'good', 'nope', 'yep', 'yeah', 'sure', 'maybe', 'later', 'again', 'never', 'always',
    'ano', 'sige', 'tara', 'bakit', 'hindi', 'wala', 'kasi', 'naman', 'idol', 'pare', 'ban', 'team', 'enemy',
    'i think we should go now', 'where are you going', 'he is so good at this game', 'can you hear me now',
  ].forEach((said) => {
    const result = parseVoice([said]);
    assert.equal(result.ignored, true, `"${said}" should be ignored, got ${JSON.stringify(result.actions)}`);
  });
});

test('a close match says it was a guess, and an exact name does not', () => {
  assert.equal(parseVoice(['aldu card']).fuzzyPhrase, 'aldu card');
  assert.equal(parseVoice(['alucard']).fuzzyPhrase, null);
});

test('a guess offers other close heroes to tap instead', () => {
  const { actions, guesses } = parseVoice(['aldo']);
  assert.equal(actions[0].heroId, 'aldous');
  assert.ok(!guesses.includes('aldous'));
  assert.ok(guesses.length > 0);
});

test('something too far from any hero still offers the nearest ones to tap', () => {
  const { ignored, guesses } = parseVoice(['refrigerator']);
  assert.equal(ignored, true);
  assert.ok(guesses.length > 0 && guesses.length <= 3);
});

test('plain chatter offers no guesses', () => {
  assert.deepEqual(parseVoice(['good game']).guesses, []);
});

test('a guess skips heroes already in the draft', () => {
  const free = parseVoice(['aldu card']);
  assert.equal(free.actions[0].heroId, 'alucard');
  const taken = parseVoice(['aldu card'], { takenIds: ['alucard'] });
  assert.notEqual(taken.actions.length && taken.actions[0].heroId, 'alucard');
});

test('an exact name is used even when that hero is already in the draft, so you get told why', () => {
  assert.equal(parseVoice(['alucard'], { takenIds: ['alucard'] }).actions[0].heroId, 'alucard');
});

test('an alternative with an exact name beats an earlier close guess', () => {
  const result = parseVoice(['aldu card', 'alucard']);
  assert.equal(result.actions[0].heroId, 'alucard');
  assert.equal(result.heard, 'alucard');
  assert.equal(result.fuzzyPhrase, null);
});

const VOWELS = 'aeiou';
const asTyped = (hero) => normalizeSpeech(hero.name).replace(/ /g, '');
const heroThatIs = (text) => HEROES.find((hero) => asTyped(hero) === text);

// These read as a different sound altogether: a hard C in place of Cici's soft one, and Zhuxin without its middle.
const TOO_FAR = new Set(['caci', 'coci', 'cuci', 'zhuin']);

// A slip counts as handled when the hero is picked, or is one tap away as a "did you mean" button.
function missedSlips(slips) {
  return slips
    .filter(([slip]) => !COMMON_WORDS.has(slip) && !heroThatIs(slip) && !TOO_FAR.has(slip))
    .filter(([slip, hero]) => {
      const { actions, guesses } = parseVoice([slip]);
      return !(actions.some((action) => action.heroId === hero.id) || guesses.includes(hero.id));
    })
    .map(([slip, hero]) => `${slip} (${hero.id})`);
}

test('every hero is picked or offered with any one vowel wrong', () => {
  const slips = HEROES.flatMap((hero) => {
    const name = asTyped(hero);
    return [...name].flatMap((letter, index) => (VOWELS.includes(letter)
      ? [...VOWELS].filter((vowel) => vowel !== letter).map((vowel) => [name.slice(0, index) + vowel + name.slice(index + 1), hero])
      : []));
  });
  assert.deepEqual(missedSlips(slips), []);
});

test('every hero of six letters or more is picked or offered with any one letter missing', () => {
  const slips = HEROES.filter((hero) => asTyped(hero).length >= 6).flatMap((hero) => {
    const name = asTyped(hero);
    return [...name].map((_, index) => [name.slice(0, index) + name.slice(index + 1), hero]);
  });
  assert.deepEqual(missedSlips(slips), []);
});
