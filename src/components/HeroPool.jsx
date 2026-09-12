import { ALL_HEROES, heroRoleLabel } from '../data/roster.js';
import HeroAvatar from './HeroAvatar.jsx';

// Grid of hero cards to click or drag. `hiddenNames` removes heroes (e.g. already ranked),
// `pickedNames` greys them out, and `quickNotes` feeds each card's tooltip.
export default function HeroPool({
    dragSource,
    roleFilter,
    search,
    hiddenNames = null,
    pickedNames = [],
    quickNotes = null,
    highlight = false,
    onHeroClick = null,
    onEditNote = null,
    customImages,
    setTooltip,
    onDragStart,
    onDragEnd,
}) {
    let heroes = ALL_HEROES;
    if (roleFilter !== 'All') heroes = heroes.filter(h => h.roles.includes(roleFilter));
    if (hiddenNames) heroes = heroes.filter(h => !hiddenNames[h.name]);
    if (search) heroes = heroes.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="grid grid-cols-4 lg:grid-cols-5 gap-3 p-3 overflow-y-auto scrollbar-hide content-start">
            {heroes.map(hero => {
                const quickNote = (quickNotes && quickNotes[hero.name] && quickNotes[hero.name].quickNote) || null;
                const isPicked = pickedNames.includes(hero.name);
                return (
                    <div key={hero.name} draggable={!isPicked} onDragStart={(e) => onDragStart(e, hero, dragSource)} onDragEnd={onDragEnd}
                        onClick={() => onHeroClick && !isPicked ? onHeroClick(hero) : null}
                        title={isPicked ? `${hero.name} is already in the enemy lineup` : undefined}
                        className={`relative rounded-xl bg-slate-800/50 p-2 border border-white/5 transition-all ${isPicked ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:bg-slate-700'} ${highlight ? 'ring-2 ring-yellow-400 bg-yellow-400/10' : ''}`}>
                        {isPicked && <span className="absolute top-1 left-1/2 -translate-x-1/2 z-30 text-[8px] font-bold uppercase tracking-wider text-red-300 bg-black/80 px-1 rounded">Picked</span>}
                        <HeroAvatar name={hero.name} role={heroRoleLabel(hero)} size="sm" showTooltip={true} quickNote={quickNote} onEditNote={onEditNote ? () => onEditNote(hero.name, quickNote) : null} customImages={customImages} setTooltip={setTooltip} />
                        <div className="text-[10px] text-gray-400 text-center mt-1 truncate w-full">{hero.name}</div>
                    </div>
                );
            })}
        </div>
    );
}
