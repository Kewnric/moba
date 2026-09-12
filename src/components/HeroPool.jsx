import { HEROES } from '../data/heroes.js';
import HeroAvatar from './HeroAvatar.jsx';

// Grid of hero cards to click or drag. `hideRatedIn` hides heroes with a tier in that jungler's
// matchups, `pickedIds` greys heroes out, and `quickNotes` feeds each card's tooltip.
export default function HeroPool({
    dragSource,
    laneFilter,
    search,
    hideRatedIn = null,
    pickedIds = [],
    quickNotes = null,
    highlight = false,
    onHeroClick = null,
    onEditNote = null,
    customImages,
    setTooltip,
    onDragStart,
    onDragEnd,
}) {
    let heroes = HEROES;
    if (laneFilter !== 'All') heroes = heroes.filter(h => h.lanes.includes(laneFilter));
    if (hideRatedIn) heroes = heroes.filter(h => !(hideRatedIn[h.id] && hideRatedIn[h.id].tier));
    if (search) heroes = heroes.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="grid grid-cols-4 lg:grid-cols-5 gap-3 p-3 overflow-y-auto scrollbar-hide content-start">
            {heroes.map(hero => {
                const quickNote = (quickNotes && quickNotes[hero.id] && quickNotes[hero.id].quickNote) || null;
                const isPicked = pickedIds.includes(hero.id);
                return (
                    <div key={hero.id} draggable={!isPicked} onDragStart={(e) => onDragStart(e, hero.id, dragSource)} onDragEnd={onDragEnd}
                        onClick={() => onHeroClick && !isPicked ? onHeroClick(hero.id) : null}
                        title={isPicked ? `${hero.name} is already in the enemy lineup` : undefined}
                        className={`relative rounded-xl bg-slate-800/50 p-2 border border-white/5 transition-all ${isPicked ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:bg-slate-700'} ${highlight ? 'ring-2 ring-yellow-400 bg-yellow-400/10' : ''}`}>
                        {isPicked && <span className="absolute top-1 left-1/2 -translate-x-1/2 z-30 text-[8px] font-bold uppercase tracking-wider text-red-300 bg-black/80 px-1 rounded">Picked</span>}
                        <HeroAvatar heroId={hero.id} size="sm" quickNote={quickNote} onEditNote={onEditNote ? () => onEditNote(hero.id, quickNote) : null} customImages={customImages} setTooltip={setTooltip} />
                        <div className="text-[10px] text-gray-400 text-center mt-1 truncate w-full">{hero.name}</div>
                    </div>
                );
            })}
        </div>
    );
}
