import { RAW_HERO_DATA } from './heroes.js';
import { buildHeroList } from '../lib/engine.js';

export const ALL_HEROES = buildHeroList(RAW_HERO_DATA);

export const heroRoleLabel = (hero) => (hero && hero.roles ? hero.roles.join(' / ') : '');
