import { useState } from 'react';
import { HERO_ROLES } from '../data/heroes.js';
import { TIERS, TIER_COLORS } from '../data/tiers.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar from '../components/HeroAvatar.jsx';
import HeroPool from '../components/HeroPool.jsx';

const ROLE_FILTERS = ['All', ...Object.values(HERO_ROLES)];

export default function DatabaseEditor({
    junglerList,
    matchupData,
    editorJungler,
    setEditorJungler,
    onAddJungler,
    onDeleteJungler,
    onSaveMatchups,
    customImages,
    setTooltip,
    draggingSource,
    onDragStart,
    onDragEnd,
    onEditQuickNote,
    onEditComment,
}) {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [activeQuickRankTier, setActiveQuickRankTier] = useState(null);

    const handleDropOnUnranked = (e) => {
        e.preventDefault();
        const source = e.dataTransfer.getData('source');
        const heroData = e.dataTransfer.getData('hero');
        if (source === 'tier_item' && editorJungler && heroData) {
            const hero = JSON.parse(heroData);
            const d = { ...matchupData };
            if (d[editorJungler]) { delete d[editorJungler][hero.name]; onSaveMatchups(d); }
        }
        onDragEnd();
    };

    const handleDropOnTier = (e, tier) => {
        e.preventDefault();
        if (!editorJungler) return;
        const heroData = e.dataTransfer.getData('hero');
        if (!heroData) return;
        const hero = JSON.parse(heroData);
        const d = { ...matchupData };
        if (!d[editorJungler]) d[editorJungler] = {};
        d[editorJungler][hero.name] = { ...(d[editorJungler][hero.name] || {}), tier };
        onSaveMatchups(d);
        onDragEnd();
    };

    const updateMatchup = (junglerName, targetName, tier) => {
        const d = { ...matchupData };
        if (!d[junglerName]) d[junglerName] = {};
        d[junglerName][targetName] = { ...(d[junglerName][targetName] || {}), tier };
        onSaveMatchups(d);
    };

    return (
        <div className="flex-1 flex flex-col w-full animate-fadeIn">
            <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center px-6 gap-6 shrink-0">
                <div className="flex items-center gap-2 text-yellow-500"><Icons.Edit3 size={18} /><span className="font-bold uppercase text-sm">Editor Mode</span></div>
                <div className="h-6 w-px bg-white/10"></div>
                <div className="flex items-center gap-2">
                    <select className="bg-slate-800 text-white border border-white/20 rounded-l px-4 py-2 focus:outline-none focus:border-cyan-500 text-sm font-medium min-w-[180px]" onChange={(e) => setEditorJungler(e.target.value)} value={editorJungler || ''}>
                        <option value="" disabled>Select Jungler to Tune...</option>
                        {junglerList.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button onClick={onAddJungler} className="bg-slate-800 hover:bg-slate-700 text-green-400 border border-white/20 border-l-0 rounded-r px-3 py-2" title="Add New Jungler"><Icons.Plus size={16} /></button>
                </div>
                {editorJungler && <button onClick={onDeleteJungler} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/20 px-3 py-1.5 rounded hover:bg-red-900/40 transition-colors"><Icons.Trash2 size={12} /> Remove Hero</button>}
            </div>
            {editorJungler ? (
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
                        <div className="space-y-4 pb-20">
                            {TIERS.map(tier => {
                                const items = Object.entries(matchupData[editorJungler] || {}).filter(([_, d]) => d.tier === tier).map(([n, d]) => ({ name: n, ...d }));
                                return (
                                    <div key={tier} className="flex bg-slate-900/50 rounded-lg border border-white/5 group hover:border-white/10 transition-all">
                                        <div onClick={() => setActiveQuickRankTier(activeQuickRankTier === tier ? null : tier)} className={`w-24 flex flex-col items-center justify-center ${TIER_COLORS[tier]} cursor-pointer transition-all hover:brightness-110 ${activeQuickRankTier === tier ? 'ring-inset ring-4 ring-white' : ''}`}><span className="text-4xl font-black text-black/30">{tier}</span></div>
                                        <div className="flex-1 p-4 flex flex-wrap gap-3 min-h-[120px] content-start" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTier(e, tier)}>
                                            {items.map(h => (
                                                <div key={h.name} className="relative group/item" draggable onDragStart={(e) => onDragStart(e, { name: h.name }, 'tier_item')} onDragEnd={onDragEnd} onDoubleClick={() => onEditComment(h.name, h.comment || '')}>
                                                    <HeroAvatar name={h.name} role="Neutral" size="md" showTooltip={true} quickNote={h.quickNote} onEditNote={() => onEditQuickNote(h.name, h.quickNote || '')} customImages={customImages} setTooltip={setTooltip} />
                                                    {h.comment && <div className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 rounded-full border-2 border-black z-20"></div>}
                                                </div>
                                            ))}
                                            {items.length === 0 && <div className="w-full h-full flex items-center justify-center text-white/5 font-bold text-2xl uppercase pointer-events-none">Drop Heroes Here</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className={`w-[350px] bg-slate-900 border-l border-white/10 flex flex-col transition-colors ${draggingSource === 'tier_item' ? 'bg-red-900/10 border-red-500/30' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnUnranked}>
                        <div className="p-5 border-b border-white/10">
                            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-white">Unranked Pool</h3><span className="text-[10px] text-gray-500 uppercase tracking-wider">{draggingSource === 'tier_item' ? <span className="text-red-400 animate-pulse font-bold">DROP TO UNRANK</span> : (activeQuickRankTier ? 'Quick Rank Mode' : 'Drag to Rank')}</span></div>
                            <div className="relative mb-4"><Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="text" placeholder="Search..." className="w-full bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-white/5" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                            <div className="flex flex-wrap gap-2">{ROLE_FILTERS.map(role => <button key={role} onClick={() => setRoleFilter(role)} className={`text-[10px] px-2 py-1 rounded border ${roleFilter === role ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 text-gray-500'}`}>{role === 'All' ? 'ALL' : role.split(' ')[0]}</button>)}</div>
                        </div>
                        <div className="flex-1 overflow-hidden hover:overflow-y-auto scrollbar-hide bg-slate-950/50 relative">
                            {draggingSource === 'tier_item' && <div className="absolute inset-0 z-50 bg-red-500/10 flex items-center justify-center border-2 border-dashed border-red-500/50 m-2 rounded-xl pointer-events-none"><span className="text-red-400 font-bold uppercase tracking-widest">Remove Rank</span></div>}
                            <HeroPool
                                dragSource="unranked_pool"
                                roleFilter={roleFilter}
                                search={search}
                                hiddenNames={matchupData[editorJungler] || {}}
                                quickNotes={matchupData[editorJungler] || null}
                                highlight={!!activeQuickRankTier}
                                onHeroClick={(hero) => activeQuickRankTier && updateMatchup(editorJungler, hero.name, activeQuickRankTier)}
                                onEditNote={(heroName, note) => onEditQuickNote(heroName, note || '')}
                                customImages={customImages}
                                setTooltip={setTooltip}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                            />
                        </div>
                    </div>
                </div>
            ) : (<div className="flex-1 flex flex-col items-center justify-center text-gray-600"><Icons.Edit3 size={48} className="mb-4 opacity-20" /><p className="font-bold uppercase tracking-widest">Select a Jungler to Begin Calibration</p></div>)}
        </div>
    );
}
