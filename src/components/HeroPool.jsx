import HeroAvatar from './HeroAvatar.jsx';

// Grid of hero cards to tap (or drag, when onDragStart is given). `unavailable` maps a hero id to a
// label such as "Ally" or "Banned" and greys that hero out; `quickNotes` feeds each card's tooltip.
export default function HeroPool({
    heroes,
    unavailable = {},
    quickNotes = null,
    highlight = false,
    onHeroClick = null,
    onEditNote = null,
    customImages,
    setTooltip,
    dragSource,
    onDragStart = null,
    onDragEnd = null,
}) {
    if (!heroes.length) {
        return <div className="p-6 text-center text-xs text-gray-500">No heroes match.</div>;
    }

    return (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-4 gap-2 lg:gap-3 p-3 content-start">
            {heroes.map(hero => {
                const quickNote = (quickNotes && quickNotes[hero.id] && quickNotes[hero.id].quickNote) || null;
                const takenLabel = unavailable[hero.id];
                const canTap = Boolean(onHeroClick) && !takenLabel;
                const canDrag = Boolean(onDragStart) && !takenLabel;
                return (
                    <div
                        key={hero.id}
                        role="button"
                        tabIndex={canTap ? 0 : -1}
                        aria-disabled={canTap ? undefined : true}
                        draggable={canDrag}
                        onDragStart={canDrag ? (e) => onDragStart(e, hero.id, dragSource) : undefined}
                        onDragEnd={canDrag ? onDragEnd : undefined}
                        onClick={() => { if (canTap) onHeroClick(hero.id); }}
                        onKeyDown={(e) => { if (canTap && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onHeroClick(hero.id); } }}
                        title={takenLabel ? `${hero.name} (${takenLabel})` : hero.name}
                        className={`relative rounded-xl bg-slate-800/50 p-1.5 lg:p-2 border border-white/5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${takenLabel ? 'opacity-40 cursor-not-allowed' : `${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:bg-slate-700`} ${highlight && !takenLabel ? 'ring-2 ring-yellow-400 bg-yellow-400/10' : ''}`}>
                        {takenLabel && <span className="absolute top-1 left-1/2 -translate-x-1/2 z-30 text-[8px] font-bold uppercase tracking-wider text-red-300 bg-black/80 px-1 rounded">{takenLabel}</span>}
                        <HeroAvatar heroId={hero.id} size="sm" quickNote={quickNote} onEditNote={onEditNote ? () => onEditNote(hero.id, quickNote) : null} customImages={customImages} setTooltip={setTooltip} />
                        <div className="text-[10px] text-gray-400 text-center mt-1 truncate w-full">{hero.name}</div>
                    </div>
                );
            })}
        </div>
    );
}
