import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HERO_ROLES, RAW_HERO_DATA, HERO_IMAGES } from '../src/data/heroes.js';
import { buildHeroList } from '../src/lib/engine.js';

const heroes = buildHeroList(RAW_HERO_DATA);
const byName = Object.fromEntries(heroes.map((hero) => [hero.name, hero]));

test('roster has all 133 heroes', () => {
  assert.equal(heroes.length, 133);
});

test('roster includes the newest heroes in their official lanes', () => {
  assert.deepEqual(byName.Marcel.roles, [HERO_ROLES.ROAM]);
  assert.deepEqual(byName.Obsidia.roles, [HERO_ROLES.GOLD]);
  assert.deepEqual(byName.Sora.roles, [HERO_ROLES.EXP]);
  assert.deepEqual(byName.Hirara.roles, [HERO_ROLES.JUNGLE]);
});

test('every hero has a portrait URL', () => {
  const missing = heroes.filter((hero) => !/^https:\/\/\S+\.png$/.test(HERO_IMAGES[hero.name] || ''));
  assert.deepEqual(missing.map((hero) => hero.name), []);
});

test('portrait map only names heroes in the roster', () => {
  assert.deepEqual(Object.keys(HERO_IMAGES).filter((name) => !byName[name]), []);
});

test('junglers who also play other lanes still show under Jungling', () => {
  const junglers = heroes.filter((hero) => hero.roles.includes(HERO_ROLES.JUNGLE)).map((hero) => hero.name);
  for (const name of ['Balmond', 'Saber', 'Alice', 'Natalia', 'Popol and Kupa', 'Lukas', 'Hirara']) {
    assert.ok(junglers.includes(name), `${name} is missing from Jungling`);
  }
});
