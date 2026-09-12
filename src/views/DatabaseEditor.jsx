import { useState } from 'react';
import { HEROES, LANES } from '../data/heroes.js';
import { TIERS, TIER_COLORS, TIER_LABELS } from '../data/tiers.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar, { heroName } from '../components/HeroAvatar.jsx';
import HeroPool from '../components/HeroPool.jsx';

const LANE_FILTERS = ['All', ...Object.values(LANES)];
const UNRATE = 'unrate';

export default function DatabaseEditor({
    junglers,
    matchups,
    editorJungler,
    setEditorJungler,
    dispatch,
    onAddJungler,
    onDeleteJungler,
    onEditQuickNote,
    onEditComment,
    customImages,
    setTooltip,
    draggingSource,
    onDragStart,
    onDragEnd,
}) {
    const [search, setSearch] = useState('');
    const [laneFilter, setLaneFilter] = useState('All');
    // The tier a tapped hero gets rated as, UNRATE to remove ratings, or null when tapping does nothing.
    const [quickTier, setQuickTier] = useState(null);
    const junglerMatchups = (editorJungler && matchups[editorJungler]) || {};
    const ratedIds = Object.keys(junglerMatchups).filter(enemyId => junglerMatchups[enemyId].tier);
    const unrankedHeroes = filterHeroes(HEROES, { lane: laneFilter, search, hideIds: ratedIds });
    const isRating = Boolean(quickTier) && quickTier !== UNRATE;

    const toggleQuickTier = (tier) => setQuickTier(current => (current === tier ? null : tier));
    const rate = (enemyId, tier) => dispatch({ type: 'setTier', junglerId: editorJungler, enemyId, tier });
    const unrate = (enemyId) => dispatch({ type: 'clearTier', junglerId: editorJungler, enemyId });

    const handleRatedHeroTap = (enemyId) => {
        if (quickTier === UNRATE) unrate(enemyId);
        else if (quickTier) rate(enemyId, quickTier);
    };

    const handleDropOnUnranked = (e) => {
        e.preventDefault();
        const heroId = e.dataTransfer.getData('hero');
        if (e.dataTransfer.getData('source') === 'tier_item' && editorJungler && heroId) unrate(heroId);
        onDragEnd();
    };

    const handleDropOnTier = (e, tier) => {
        e.preventDefault();
        const heroId = e.dataTransfer.getData('hero');
        if (editorJungler && heroId) rate(heroId, tier);
        onDragEnd();
    };

    return (
        <div className="flex-1 flex flex-col w-full min-h-0 animate-fadeIn">
            <div className="bg-slate-900 border-b border-white/10 flex flex-wrap items-center px-3 lg:px-6 py-3 gap-3 lg:gap-6 shrink-0">
                <div className="flex items-center gap-2 text-yellow-500"><Icons.Edit3 size={18} /><span className="font-bold uppercase text-sm">Editor Mode</span></div>
                <div className="hidden sm:block h-6 w-px bg-white/10"></div>
                <div className="flex items-center flex-1 sm:flex-none min-w-0">
                    <select aria-label="Jungler to rate" className="flex-1 sm:flex-none min-w-0 sm:min-w-[180px] bg-slate-800 text-white border border-white/20 rounded-l px-3 lg:px-4 py-2 focus:outline-none focus:border-cyan-500 text-sm font-medium" onChange={(e) => setEditorJungler(e.target.value)} value={editorJungler || ''}>
                        <option value="" disabled>Select Jungler to Tune...</option>
                        {junglers.map(id => <option key={id} value={id}>{heroName(id)}</option>)}
                    </select>
                    <button type="button" onClick={onAddJungler} className="bg-slate-800 hover:bg-slate-700 text-green-400 border border-white/20 border-l-0 rounded-r px-3 py-2" title="Add New Jungler" aria-label="Add New Jungler"><Icons.Plus size={16} /></button>
                </div>
                {editorJungler && <button type="button" onClick={onDeleteJungler} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/20 px-3 py-1.5 rounded hover:bg-red-900/40 transition-colors"><Icons.Trash2 size={12} /> Remove Hero</button>}
            </div>
            {editorJungler ? (
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
                    <div className="lg:flex-1 p-3 lg:p-8 lg:min-h-0 lg:overflow-y-auto scrollbar-hide">
                        <p className="text-xs text-gray-400 mb-3 lg:mb-4 max-w-2xl">
                            How does <span className="text-white font-semibold">{heroName(editorJungler)}</span> do against each hero? Choose a tier, then tap heroes to rate them. On desktop you can also drag. The pencil adds a quick tip; the speech bubble adds a longer note.
                        </p>
                        <div className="space-y-2 lg:space-y-4 pb-4 lg:pb-20">
                            {TIERS.map(tier => {
                                const items = Object.entries(junglerMatchups).filter(([, entry]) => entry.tier === tier).map(([enemyId, entry]) => ({ enemyId, ...entry }));
                                return (
                                    <div key={tier} className="flex bg-slate-900/50 rounded-lg border border-white/5 hover:border-white/10 transition-all overflow-hidden">
                                        <button type="button" onClick={() => toggleQuickTier(tier)} aria-pressed={quickTier === tier} title={`Tap heroes to rate them ${TIER_LABELS[tier]}`}
                                            className={`w-16 lg:w-24 shrink-0 flex flex-col items-center justify-center py-2 ${TIER_COLORS[tier]} transition-all hover:brightness-110 ${quickTier === tier ? 'ring-inset ring-4 ring-white' : ''}`}>
                                            <span className="text-2xl lg:text-4xl font-black text-black/40 leading-none">{tier}</span>
                                            <span className="mt-1 px-1 text-[9px] lg:text-[10px] font-bold uppercase tracking-wide text-black/60 text-center leading-tight">{TIER_LABELS[tier]}</span>
                                        </button>
                                        <div className="flex-1 p-2 lg:p-4 flex flex-wrap gap-2 lg:gap-3 min-h-[72px] lg:min-h-[120px] content-start" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTier(e, tier)}>
                                            {items.map(item => (
                                                <div key={item.enemyId} className="relative group/item" draggable onDragStart={(e) => onDragStart(e, item.enemyId, 'tier_item')} onDragEnd={onDragEnd} onDoubleClick={() => onEditComment(item.enemyId, item.comment || '')}>
                                                    <div role={quickTier ? 'button' : undefined} tabIndex={quickTier ? 0 : undefined} onClick={() => handleRatedHeroTap(item.enemyId)}
                                                        onKeyDown={(e) => { if (quickTier && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleRatedHeroTap(item.enemyId); } }}
                                                        className={quickTier ? 'cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400' : ''}>
                                                        <HeroAvatar heroId={item.enemyId} size="md" quickNote={item.quickNote} onEditNote={() => onEditQuickNote(item.enemyId, item.quickNote || '')} customImages={customImages} setTooltip={setTooltip} />
                                                    </div>
                                                    <button type="button" onClick={() => onEditComment(item.enemyId, item.comment || '')} aria-label={`${item.comment ? 'Edit' : 'Add'} long note for ${heroName(item.enemyId)}`}
                                                        className={`absolute -bottom-1 -right-1 z-20 p-1 rounded-full shadow-lg transition-opacity ${item.comment ? 'bg-cyan-400 text-black' : 'bg-slate-700 text-gray-300 hover:text-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/item:opacity-100'}`}>
                                                        <Icons.MessageSquare size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {items.length === 0 && <div className="w-full flex items-center justify-center text-white/10 font-bold text-[10px] lg:text-lg uppercase pointer-events-none">No heroes rated {TIER_LABELS[tier]}</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className={`lg:w-[350px] lg:shrink-0 bg-slate-900 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col lg:min-h-0 transition-colors ${draggingSource === 'tier_item' ? 'bg-red-900/10 border-red-500/30' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnUnranked}>
                        {/* Pinned only on tall phone and tablet screens, so it never covers the heroes you need to tap. */}
                        <div className="[@media(max-width:1023px)_and_(min-height:640px)]:sticky top-0 z-10 bg-slate-900 p-3 lg:p-5 border-b border-white/10 space-y-3">
                            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">Unranked Pool</h3><span className="text-[10px] text-gray-500 uppercase tracking-wider">{draggingSource === 'tier_item' ? <span className="text-red-400 animate-pulse font-bold">DROP TO UNRANK</span> : `${unrankedHeroes.length} heroes`}</span></div>
                            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rate tapped heroes as">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 mr-1">Tap to rate</span>
                                {TIERS.map(tier => (
                                    <button key={tier} type="button" aria-pressed={quickTier === tier} title={TIER_LABELS[tier]} onClick={() => toggleQuickTier(tier)}
                                        className={`h-8 min-w-8 px-2 rounded-md text-xs font-black ${TIER_COLORS[tier]} transition-all ${quickTier === tier ? 'ring-2 ring-white text-black' : 'text-black/60 opacity-60 hover:opacity-100'}`}>
                                        {tier}
                                    </button>
                                ))}
                                <button type="button" aria-pressed={quickTier === UNRATE} onClick={() => toggleQuickTier(UNRATE)}
                                    className={`h-8 px-2 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all ${quickTier === UNRATE ? 'border-white text-white bg-slate-700' : 'border-white/15 text-gray-400 hover:text-white'}`}>
                                    Unrate
                                </button>
                            </div>
                            {quickTier && (
                                <p className="text-[11px] text-yellow-300" aria-live="polite">
                                    {quickTier === UNRATE ? 'Tap rated heroes to remove their rating.' : `Tap heroes to rate them ${TIER_LABELS[quickTier]} (${quickTier}).`}
                                </p>
                            )}
                            <div className="relative"><Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="search" aria-label="Search unranked heroes" placeholder="Search..." className="w-full bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-white/5" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">{LANE_FILTERS.map(lane => <button key={lane} type="button" aria-pressed={laneFilter === lane} onClick={() => setLaneFilter(lane)} className={`shrink-0 text-[10px] px-2 py-1 rounded border ${laneFilter === lane ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 text-gray-500'}`}>{lane === 'All' ? 'ALL' : lane.split(' ')[0]}</button>)}</div>
                        </div>
                        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide bg-slate-950/50 relative">
                            {draggingSource === 'tier_item' && <div className="absolute inset-0 z-50 bg-red-500/10 flex items-center justify-center border-2 border-dashed border-red-500/50 m-2 rounded-xl pointer-events-none"><span className="text-red-400 font-bold uppercase tracking-widest">Remove Rank</span></div>}
                            <HeroPool
                                heroes={unrankedHeroes}
                                quickNotes={junglerMatchups}
                                highlight={isRating}
                                onHeroClick={(heroId) => { if (isRating) rate(heroId, quickTier); }}
                                onEditNote={(heroId, note) => onEditQuickNote(heroId, note || '')}
                                customImages={customImages}
                                setTooltip={setTooltip}
                                dragSource="unranked_pool"
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                            />
                        </div>
                    </div>
                </div>
            ) : (<div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-6 text-center"><Icons.Edit3 size={48} className="mb-4 opacity-20" /><p className="font-bold uppercase tracking-widest">Select a Jungler to Begin Calibration</p></div>)}
        </div>
    );
}
