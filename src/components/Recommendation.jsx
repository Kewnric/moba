import { useEffect, useState } from 'react';
import { TIER_COLORS } from '../data/tiers.js';
import { TIER_WEIGHTS, isTier } from '../lib/engine.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import RadarChart from './RadarChart.jsx';

export default function Recommendation({ enemyIds, sortedJunglers, priorityPick, customImages, setTooltip, onOpenDatabase }) {
    const [viewedHero, setViewedHero] = useState(null);
    const [matrixPage, setMatrixPage] = useState(0);

    // A new enemy pick, ally pick or ban can change the whole ranking, so start over from the top pick.
    const rankingKey = `${enemyIds.join(',')}|${sortedJunglers.map(j => j.id).join(',')}`;
    useEffect(() => { setViewedHero(null); setMatrixPage(0); }, [rankingKey]);

    const current = viewedHero || priorityPick;
    const ratedOptions = sortedJunglers.filter(j => j.rated > 0).slice(0, 3);
    const otherOptions = current ? sortedJunglers.filter(j => j.id !== current.id && j.rated > 0).slice(0, 3) : [];

    return (
        <section aria-label="Recommended jungler" className="glass-panel rounded-2xl p-4 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>
            {current ? (
                <div className="animate-scaleUp">
                    <div className="flex items-center gap-4 lg:gap-10">
                        <div className="relative shrink-0 w-16 h-16 lg:w-28 lg:h-28 lg:order-last">
                            <div className="absolute inset-0 bg-cyan-500 blur-[40px] opacity-20 rounded-full"></div>
                            <HeroAvatar heroId={current.id} size="fill" className="w-full h-full" showTooltip={false} customImages={customImages} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-cyan-400 mb-1"><Icons.Crown size={16} /><span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">{viewedHero ? 'Alternative Option' : (current.score >= TIER_WEIGHTS.B ? 'Recommended Priority' : 'Best Rated Option · Unfavored')}</span></div>
                            <h2 className="text-2xl lg:text-5xl font-black text-white tracking-tight truncate">{heroName(current.id)}</h2>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 lg:mt-3 font-mono text-sm lg:text-lg">
                                <span><span className="font-sans text-[10px] uppercase text-gray-500 mr-1.5">Score</span><span className="font-bold text-cyan-400">{current.score.toFixed(1)}</span><span className="text-xs text-gray-500"> / 10</span></span>
                                <span><span className="font-sans text-[10px] uppercase text-gray-500 mr-1.5">Matchups rated</span><span className="font-bold text-green-400">{current.rated}</span><span className="text-xs text-gray-500"> / {current.total}</span></span>
                            </div>
                        </div>
                        <div className="hidden xl:block shrink-0">
                            <RadarChart heroes={sortedJunglers} currentHero={current} onSelect={setViewedHero} page={matrixPage} setPage={setMatrixPage} />
                        </div>
                    </div>

                    {viewedHero && <button type="button" onClick={() => setViewedHero(null)} className="text-xs text-cyan-400 hover:underline mt-3 block">&larr; {priorityPick ? 'Return to #1 Pick' : 'Back to options'}</button>}

                    <div className="flex gap-2 overflow-x-auto pb-1 mt-3 scrollbar-hide">
                        {enemyIds.map(enemyId => {
                            const entry = current.data[enemyId];
                            const tier = entry && isTier(entry.tier) ? entry.tier : '?';
                            return (
                                <div key={enemyId} className="shrink-0 flex items-center gap-2 bg-black/30 px-2.5 py-1 rounded border border-white/5">
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">vs {heroName(enemyId)}</span>
                                    <span title={tier === '?' ? 'Not rated yet' : undefined} className={`text-[10px] font-bold px-1.5 rounded ${TIER_COLORS[tier]} text-white`}>{tier}</span>
                                    {entry && entry.quickNote && <span className="text-[10px] text-yellow-300 italic whitespace-nowrap max-w-[160px] truncate">{entry.quickNote}</span>}
                                </div>
                            );
                        })}
                    </div>

                    {otherOptions.length > 0 && (
                        <div className="mt-3 xl:hidden">
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Other options</div>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {otherOptions.map(option => (
                                    <button key={option.id} type="button" onClick={() => setViewedHero(option)} className="shrink-0 flex items-center gap-2 bg-slate-800/60 border border-white/5 hover:border-cyan-500/50 rounded-lg pl-1 pr-2.5 py-1 text-left">
                                        <div className="w-7 h-7"><HeroAvatar heroId={option.id} size="fill" className="w-full h-full" showTooltip={false} customImages={customImages} /></div>
                                        <span className="text-xs font-semibold text-white whitespace-nowrap">{heroName(option.id)}</span>
                                        <span className="text-[10px] font-mono text-gray-400">{option.score.toFixed(1)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : enemyIds.length > 0 ? (
                <div className="animate-scaleUp">
                    <div className="flex items-center gap-2 text-amber-400 mb-2"><Icons.Info size={16} /><span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">Not enough ratings</span></div>
                    <h2 className="text-lg lg:text-2xl font-bold text-white mb-2">{ratedOptions.length ? 'No jungler is rated against enough of this lineup yet' : 'None of your junglers are rated against this lineup yet'}</h2>
                    <p className="text-xs lg:text-sm text-gray-400 mb-4 lg:mb-6 max-w-xl">A jungler is recommended once it's rated against at least half of the enemies you've entered. Rate matchups in Database to get a pick.</p>
                    {ratedOptions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6">
                            {ratedOptions.map(option => (
                                <button key={option.id} type="button" onClick={() => setViewedHero(option)} className="bg-slate-800/50 p-3 lg:p-4 rounded-xl border border-white/5 hover:border-cyan-500/50 flex items-center gap-3 text-left transition-colors">
                                    <HeroAvatar heroId={option.id} size="sm" showTooltip={false} customImages={customImages} />
                                    <div><div className="text-sm font-bold text-white">{heroName(option.id)}</div><div className="text-[11px] text-gray-400 font-mono">{option.score.toFixed(1)} · rated {option.rated}/{option.total}</div></div>
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" onClick={onOpenDatabase} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg">Rate matchups in Database</button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 lg:py-12 text-gray-500 text-center">
                    <Icons.Target size={24} className="mb-3 opacity-50" />
                    <div className="text-xs lg:text-sm font-bold uppercase tracking-widest">Add enemy picks to get a recommendation</div>
                </div>
            )}
        </section>
    );
}
