import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LANES, HEROES, HERO_BY_ID } from '../src/data/heroes.js';
import { slugify } from '../src/lib/heroIds.js';

const byName = Object.fromEntries(HEROES.map((hero) => [hero.name, hero]));

test('roster has all 133 heroes', () => {
  assert.equal(HEROES.length, 133);
});

test('every hero id is a unique slug of the hero name', () => {
  assert.equal(new Set(HEROES.map((hero) => hero.id)).size, HEROES.length);
  for (const hero of HEROES) assert.equal(hero.id, slugify(hero.name), hero.name);
});

test('HERO_BY_ID finds a hero by id', () => {
  assert.equal(HERO_BY_ID['yi-sun-shin'].name, 'Yi Sun-Shin');
  assert.equal(HERO_BY_ID['chang-e'].name, "Chang'e");
});

test('roster includes the newest heroes in their official lanes', () => {
  assert.deepEqual(byName.Marcel.lanes, [LANES.ROAM]);
  assert.deepEqual(byName.Obsidia.lanes, [LANES.GOLD]);
  assert.deepEqual(byName.Sora.lanes, [LANES.EXP]);
  assert.deepEqual(byName.Hirara.lanes, [LANES.JUNGLE]);
});

test('junglers who also play other lanes are listed under Jungling', () => {
  for (const name of ['Balmond', 'Saber', 'Alice', 'Natalia', 'Popol and Kupa', 'Lukas', 'Hirara']) {
    assert.ok(byName[name].lanes.includes(LANES.JUNGLE), `${name} is missing from Jungling`);
  }
});

test('every hero has a lane, an official role and a portrait', () => {
  const incomplete = HEROES.filter((hero) =>
    !hero.lanes.length || !hero.roles.length || !/^https:\/\/\S+\.png$/.test(hero.image));
  assert.deepEqual(incomplete.map((hero) => hero.name), []);
});

test('official roles come from the game data', () => {
  assert.deepEqual(byName.Ling.roles, ['Assassin']);
});
