import { useEffect, useState } from 'react';
import { LANES } from '../data/heroes.js';
import { TIER_COLORS } from '../data/tiers.js';
import { TIER_WEIGHTS, addToFirstEmptySlot, isTier, moveSlot, placeInSlot } from '../lib/engine.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar, { heroName } from '../components/HeroAvatar.jsx';
import HeroPool from '../components/HeroPool.jsx';
import RadarChart from '../components/RadarChart.jsx';

const LANE_FILTERS = ['All', ...Object.values(LANES)];

export default function DraftLab({
    enemySlots,
    setEnemySlots,
    enemyIds,
    sortedJunglers,
    priorityPick,
    customImages,
    setTooltip,
    draggingSource,
    onDragStart,
    onDragEnd,
    onOpenDatabase,
}) {
    const [laneFilter, setLaneFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [viewedHero, setViewedHero] = useState(null);
    const [matrixPage, setMatrixPage] = useState(0);

    useEffect(() => { setViewedHero(null); setMatrixPage(0); }, [enemySlots]); // Reset view on lineup change

    const currentDisplayHero = viewedHero || priorityPick;
    const ratedOptions = sortedJunglers.filter(j => j.rated > 0).slice(0, 3);

    const handleDropOnSlot = (e, index) => {
        e.preventDefault();
        const heroId = e.dataTransfer.getData('hero');
        const source = e.dataTransfer.getData('source');
        if (source === 'slot') {
            const oldIndex = parseInt(e.dataTransfer.getData('slotIndex'), 10);
            if (!Number.isNaN(oldIndex)) setEnemySlots(slots => moveSlot(slots, oldIndex, index));
        } else if (source.includes('pool') && heroId) {
            setEnemySlots(slots => placeInSlot(slots, index, heroId));
        }
        onDragEnd();
    };

    const handleDropOnPool = (e) => {
        e.preventDefault();
        if (e.dataTransfer.getData('source') === 'slot') {
            const index = parseInt(e.dataTransfer.getData('slotIndex'), 10);
            if (!Number.isNaN(index)) setEnemySlots(slots => slots.map((slot, i) => (i === index ? null : slot)));
        }
        onDragEnd();
    };

    const handlePoolHeroClick = (heroId) => setEnemySlots(slots => addToFirstEmptySlot(slots, heroId));

    return (
        <>
            <div className={`w-[400px] bg-slate-900/50 border-r border-white/10 flex flex-col z-10 transition-colors duration-300 ${draggingSource === 'slot' ? 'bg-red-900/20 border-red-500/30' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnPool}>
                <div className="p-5 border-b border-white/10">
                    <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Icons.Search size={14} /> Hero Database</h2>
                    <div className="relative mb-4"><Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="text" placeholder="Search to Add..." className="w-full bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-white/5" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {LANE_FILTERS.map(lane => (
                            <button key={lane} onClick={() => setLaneFilter(lane)} className={`text-[10px] px-3 py-1.5 rounded border font-semibold transition-all ${laneFilter === lane ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>{lane === 'All' ? 'ALL' : lane.split(' ')[0]}</button>
                        ))}
                    </div>
                    {draggingSource === 'slot' ? (<div className="w-full p-3 bg-red-500/20 border border-dashed border-red-400 rounded-lg flex items-center justify-center gap-3 animate-pulse"><Icons.Trash2 className="text-red-400" /><span className="text-xs text-red-300 font-bold uppercase">Drop here to remove</span></div>) : (<div className="w-full p-3 bg-slate-800 border border-dashed border-white/20 rounded-lg flex items-center gap-3 text-gray-500"><Icons.Info size={16} /><span className="text-xs font-medium">Click to Add / Drag to Slot</span></div>)}
                </div>
                <div className="flex-1 overflow-hidden hover:overflow-y-auto scrollbar-hide">
                    <HeroPool dragSource="draft_pool" laneFilter={laneFilter} search={search} pickedIds={enemyIds} onHeroClick={handlePoolHeroClick} customImages={customImages} setTooltip={setTooltip} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                </div>
            </div>
            <div className="flex-1 p-10 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] scrollbar-hide">
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-red-400 flex items-center gap-2"><Icons.Skull size={18} /> ENEMY LINEUP</h2>
                        <button onClick={() => setEnemySlots([null, null, null, null, null])} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 font-bold uppercase tracking-wide"><Icons.RotateCcw size={12} /> Clear All</button>
                    </div>
                    <div className="grid grid-cols-5 gap-6">
                        {enemySlots.map((heroId, idx) => (
                            <div key={idx} draggable={heroId !== null} onDragStart={(e) => onDragStart(e, heroId, 'slot', idx)} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnSlot(e, idx)}
                                className={`aspect-[3/4] relative rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center group cursor-pointer ${heroId ? 'bg-slate-800 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:border-red-400' : 'bg-slate-900/40 border-white/5 border-dashed hover:border-white/20'}`}>
                                {heroId ? (
                                    <>
                                        <HeroAvatar heroId={heroId} size="lg" className="scale-110" customImages={customImages} setTooltip={setTooltip} />
                                        <div className="mt-4 text-center"><div className="text-sm font-bold text-white">{heroName(heroId)}</div></div>
                                    </>
                                ) : (<div className="text-white/10 flex flex-col items-center"><span className="text-4xl font-thin mb-2">+</span></div>)}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>
                    {currentDisplayHero ? (
                        <div className="flex items-center gap-12 animate-scaleUp">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 text-cyan-400 mb-2"><Icons.Crown size={18} /><span className="text-xs font-bold uppercase tracking-widest">{viewedHero ? 'Alternative Option' : (currentDisplayHero.score >= TIER_WEIGHTS.B ? 'Recommended Priority' : 'Best Rated Option · Unfavored')}</span></div>
                                <h1 className="text-5xl font-black text-white mb-4 tracking-tight">{heroName(currentDisplayHero.id)}</h1>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-800/50 p-3 rounded border border-white/5"><div className="text-[10px] text-gray-400 uppercase">Score</div><div className="text-2xl font-mono font-bold text-cyan-400">{currentDisplayHero.score.toFixed(1)}<span className="text-xs text-gray-500"> / 10</span></div></div>
                                    <div className="bg-slate-800/50 p-3 rounded border border-white/5"><div className="text-[10px] text-gray-400 uppercase">Matchups Rated</div><div className="text-2xl font-mono font-bold text-green-400">{currentDisplayHero.rated}<span className="text-xs text-gray-500"> / {currentDisplayHero.total}</span></div></div>
                                </div>
                                {viewedHero && <button onClick={() => setViewedHero(null)} className="text-xs text-cyan-400 hover:underline mb-2 block">&larr; {priorityPick ? 'Return to #1 Pick' : 'Back to options'}</button>}
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {enemyIds.map(enemyId => {
                                        const entry = currentDisplayHero.data[enemyId];
                                        const tier = entry && isTier(entry.tier) ? entry.tier : '?';
                                        const qNote = entry && entry.quickNote;
                                        return (
                                            <div key={enemyId} className="group relative flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-white/5">
                                                <span className="text-[10px] text-gray-400">vs {heroName(enemyId)}</span><span title={tier === '?' ? 'Not rated yet' : undefined} className={`text-[10px] font-bold px-1.5 rounded ${TIER_COLORS[tier]} text-white`}>{tier}</span>
                                                {qNote && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-yellow-300 text-[9px] p-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none border border-yellow-500/50">{qNote}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="shrink-0">
                                <RadarChart heroes={sortedJunglers} currentHero={currentDisplayHero} onSelect={setViewedHero} page={matrixPage} setPage={setMatrixPage} />
                            </div>
                            <div className="relative"><div className="absolute inset-0 bg-cyan-500 blur-[60px] opacity-20 rounded-full"></div><HeroAvatar heroId={currentDisplayHero.id} size="xl" showTooltip={false} className="scale-125 border-4 border-cyan-500/30 rounded-2xl" customImages={customImages} setTooltip={setTooltip} /></div>
                        </div>
                    ) : enemyIds.length > 0 ? (
                        <div className="animate-scaleUp">
                            <div className="flex items-center gap-2 text-amber-400 mb-2"><Icons.Info size={18} /><span className="text-xs font-bold uppercase tracking-widest">Not enough ratings</span></div>
                            <h2 className="text-2xl font-bold text-white mb-2">{ratedOptions.length ? 'No jungler is rated against enough of this lineup yet' : 'None of your junglers are rated against this lineup yet'}</h2>
                            <p className="text-sm text-gray-400 mb-6 max-w-xl">A jungler is recommended once it's rated against at least half of the enemies you've entered. Rate matchups in Database to get a pick.</p>
                            {ratedOptions.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    {ratedOptions.map(option => (
                                        <button key={option.id} onClick={() => setViewedHero(option)} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/50 flex items-center gap-3 text-left transition-colors">
                                            <HeroAvatar heroId={option.id} size="sm" showTooltip={false} customImages={customImages} />
                                            <div><div className="text-sm font-bold text-white">{heroName(option.id)}</div><div className="text-[11px] text-gray-400 font-mono">{option.score.toFixed(1)} · rated {option.rated}/{option.total}</div></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button onClick={onOpenDatabase} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg">Rate matchups in Database</button>
                        </div>
                    ) : (<div className="flex flex-col items-center justify-center py-12 text-gray-500"><Icons.Target size={24} className="mb-4 opacity-50" /><div className="text-sm font-bold uppercase tracking-widest">Awaiting Enemy Data...</div></div>)}
                </div>
            </div>
        </>
    );
}
