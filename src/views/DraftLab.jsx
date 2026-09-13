import { useMemo, useState } from 'react';
import { HEROES, LANES } from '../data/heroes.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { Icons } from '../components/Icons.jsx';
import DraftBoard from '../components/DraftBoard.jsx';
import HeroPool from '../components/HeroPool.jsx';
import Recommendation from '../components/Recommendation.jsx';
import ResultRecorder from '../components/ResultRecorder.jsx';

const LANE_FILTERS = ['All', ...Object.values(LANES)];
const TAKEN_LABELS = { ally: 'Ally', enemy: 'Enemy', allyBans: 'Banned', enemyBans: 'Banned' };
// Drag data types, so the board ignores files, links and text dragged in from elsewhere.
const HERO_TYPE = 'application/x-jungleros-hero';
const FROM_TYPE = 'application/x-jungleros-from';
const FROM_PICKER = 'picker';

const slotKey = (slot) => `${slot.group}:${slot.index}`;
const parseSlotKey = (key) => {
    const [group, index] = key.split(':');
    return { group, index: Number(index) };
};
const isHeroDrag = (e) => Array.from(e.dataTransfer.types).includes(HERO_TYPE);

// Phones: the board stays pinned at the top while the recommendation and hero picker scroll under it.
// Desktop: the hero picker is a left column beside the board and recommendation. Heroes can be tapped
// into the highlighted slot or dragged onto any slot; dragging a slot onto the picker removes it.
export default function DraftLab({ draftState, enemyLanes, defaultBanCount, allyJunglers, ratingSource, setRatingSource, scoring, onlyPool, setOnlyPool, hasPool, customImages, setTooltip, onOpenDatabase, resultRecorder }) {
    const { draft, activeSlot } = draftState;
    const [laneFilter, setLaneFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [dragFrom, setDragFrom] = useState(null); // FROM_PICKER or a slot key while a hero is dragged
    const [overSlot, setOverSlot] = useState(null);

    const unavailable = useMemo(() => {
        const labels = {};
        Object.entries(TAKEN_LABELS).forEach(([group, label]) => {
            draft[group].forEach(heroId => { if (heroId) labels[heroId] = label; });
        });
        return labels;
    }, [draft]);

    const heroes = filterHeroes(HEROES, { lane: laneFilter, search });

    const pick = (heroId) => {
        draftState.pickHero(heroId);
        setSearch('');
    };

    const pickFirstMatch = () => {
        const match = heroes.find(hero => !unavailable[hero.id]);
        if (match && activeSlot) pick(match.id);
    };

    // Enter is handled on keydown because some keyboards don't submit the form; the form's submit
    // handler covers keyboards that submit without sending an Enter keydown.
    const handleSearchKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        pickFirstMatch();
    };

    const startDrag = (e, from, heroId) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(HERO_TYPE, heroId);
        e.dataTransfer.setData(FROM_TYPE, from);
        setTooltip(tooltip => ({ ...tooltip, visible: false }));
        // Changing the page while the browser is still starting the drag can cancel it, so wait a tick.
        setTimeout(() => setDragFrom(from), 0);
    };
    const endDrag = () => {
        setDragFrom(null);
        setOverSlot(null);
    };

    const drag = {
        overSlot,
        onStart: (e, slot, heroId) => startDrag(e, slotKey(slot), heroId),
        onEnd: endDrag,
        onOver: (e, slot) => {
            if (!isHeroDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!overSlot || slotKey(overSlot) !== slotKey(slot)) setOverSlot(slot);
        },
        onLeave: (slot) => {
            if (overSlot && slotKey(overSlot) === slotKey(slot)) setOverSlot(null);
        },
        onDrop: (e, slot) => {
            if (!isHeroDrag(e)) return;
            e.preventDefault();
            const heroId = e.dataTransfer.getData(HERO_TYPE);
            const from = e.dataTransfer.getData(FROM_TYPE);
            if (from === FROM_PICKER) draftState.placeHero(slot, heroId);
            else if (from) draftState.moveHero(parseSlotKey(from), slot);
            endDrag();
        },
    };

    const draggingFromSlot = Boolean(dragFrom) && dragFrom !== FROM_PICKER;

    const handlePickerDragOver = (e) => {
        if (!draggingFromSlot || !isHeroDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handlePickerDrop = (e) => {
        if (!isHeroDrag(e)) return;
        e.preventDefault();
        const from = e.dataTransfer.getData(FROM_TYPE);
        if (from && from !== FROM_PICKER) draftState.clearSlot(parseSlotKey(from));
        endDrag();
    };

    return (
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
            {/* Pinned only on screens tall enough to still show the picker below it (portrait phones and tablets). */}
            <div className="[@media(max-width:1023px)_and_(min-height:640px)]:sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur border-b border-white/10 lg:col-start-2 lg:row-start-1 lg:bg-transparent lg:backdrop-blur-none lg:border-b-0">
                <DraftBoard draftState={draftState} enemyLanes={enemyLanes} drag={drag} defaultBanCount={defaultBanCount} customImages={customImages} />
            </div>

            <div className="p-3 lg:px-8 lg:pt-2 lg:pb-8 lg:col-start-2 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">
                <Recommendation scoring={scoring} ratingSource={ratingSource} setRatingSource={setRatingSource} allyJunglers={allyJunglers} onlyPool={onlyPool} setOnlyPool={setOnlyPool} hasPool={hasPool} customImages={customImages} onOpenDatabase={onOpenDatabase} />
                <ResultRecorder draft={draft} {...resultRecorder} />
            </div>

            <aside aria-label="Hero picker" onDragOver={handlePickerDragOver} onDrop={handlePickerDrop}
                className={`relative bg-slate-900/50 border-t border-white/10 lg:border-t-0 lg:border-r lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:min-h-0 transition-colors ${draggingFromSlot ? 'bg-red-900/20 border-red-500/30' : ''}`}>
                <div className="p-3 lg:p-5 border-b border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2"><Icons.Search size={14} /> Heroes</h2>
                        <span className="text-[10px] text-gray-500 text-right">
                            {draggingFromSlot ? <span className="text-red-300 font-bold">Drop here to remove</span>
                                : activeSlot ? <>Tap a hero to fill the highlighted slot<span className="hidden [@media(hover:hover)]:inline">, or drag one onto any slot</span></>
                                    : 'Tap a slot to change it'}
                        </span>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); pickFirstMatch(); }} className="relative [@media(max-width:1023px)_and_(min-height:640px)]:scroll-mt-80">
                        <Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input type="search" enterKeyHint="done" aria-label="Search heroes" placeholder="Search, then press Enter to add" className="w-full bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-white/5" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown} />
                    </form>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {LANE_FILTERS.map(lane => (
                            <button key={lane} type="button" aria-pressed={laneFilter === lane} onClick={() => setLaneFilter(lane)} className={`shrink-0 text-[10px] px-3 py-1.5 rounded border font-semibold transition-all ${laneFilter === lane ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>{lane === 'All' ? 'ALL' : lane.split(' ')[0]}</button>
                        ))}
                    </div>
                </div>
                <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">
                    <HeroPool heroes={heroes} unavailable={unavailable} onHeroClick={activeSlot ? pick : null} customImages={customImages} setTooltip={setTooltip}
                        dragSource={FROM_PICKER} onDragStart={(e, heroId) => startDrag(e, FROM_PICKER, heroId)} onDragEnd={endDrag} />
                </div>
            </aside>
        </div>
    );
}
