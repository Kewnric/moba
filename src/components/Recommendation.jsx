import { useEffect, useState } from 'react';
import { LANES } from '../data/heroes.js';
import { RATING_SOURCES } from '../data/ratingSources.js';
import { STATS_INFO } from '../data/stats.js';
import { TIER_COLORS, TIER_LABELS } from '../data/tiers.js';
import { SCORE_PARTS } from '../lib/scoring.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';

const PART_STYLES = [
    { key: 'matchup', label: 'Matchups', className: 'bg-cyan-400' },
    { key: 'teamFit', label: 'Team fit', className: 'bg-sky-600' },
    { key: 'comfort', label: 'Comfort', className: 'bg-violet-400' },
    { key: 'meta', label: 'Meta', className: 'bg-amber-400' },
];
const RISK_PATTERN = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(248,113,113,0.95) 0 2px, transparent 2px 5px)' };
const LIST_SIZE = 5;
const SUBHEAD = 'text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5';
const STATS_RANK = `${STATS_INFO.rank[0].toUpperCase()}${STATS_INFO.rank.slice(1)}`;

function ScoreBar({ entry, tall = false }) {
    const positive = PART_STYLES.reduce((sum, part) => sum + entry.parts[part.key], 0);
    const label = `Score ${Math.round(entry.total)} out of 100: ${PART_STYLES.map(part => `${part.label} ${Math.round(entry.parts[part.key])}`).join(', ')}, counter-pick risk minus ${entry.parts.risk.toFixed(1)}`;
    return (
        <div role="img" aria-label={label} className={`relative w-full ${tall ? 'h-3' : 'h-2'} rounded-full bg-slate-800 overflow-hidden`}>
            <div className="absolute inset-0 flex">
                {PART_STYLES.map(part => <span key={part.key} className={`h-full ${part.className}`} style={{ width: `${entry.parts[part.key]}%` }} />)}
            </div>
            {entry.parts.risk > 0 && (
                <span className="absolute inset-y-0 border-l border-red-400" style={{ left: `${positive - entry.parts.risk}%`, width: `${entry.parts.risk}%`, ...RISK_PATTERN }} />
            )}
        </div>
    );
}

// Switches between scoring from your ratings, Mythic stats, or both.
function SourceSwitch({ value, onChange }) {
    return (
        <div role="group" aria-label="Recommendations use" className="inline-flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Use</span>
            <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
                {RATING_SOURCES.map(source => (
                    <button key={source.value} type="button" aria-pressed={source.value === value} title={source.description} onClick={() => onChange(source.value)}
                        className={`px-2 h-7 text-[11px] font-semibold whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 ${source.value === value ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'}`}>
                        {source.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PartLegend({ ratingSource }) {
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
            {PART_STYLES.map(part => (
                <span key={part.key} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm ${part.className}`} />{part.label} ({part.key === 'meta' && ratingSource === 'mine' ? 'off, counts as middle' : `up to ${SCORE_PARTS[part.key]}`})</span>
            ))}
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border border-red-400" style={RISK_PATTERN} />Counter-pick risk</span>
        </div>
    );
}

function MatchupChip({ matchup }) {
    const statsTone = matchup.delta >= 2 ? 'bg-emerald-500/20 text-emerald-300' : matchup.delta <= -2 ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-gray-300';
    return (
        <div className="shrink-0 flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded border border-white/5">
            <span className="text-[10px] text-gray-400 whitespace-nowrap">vs {heroName(matchup.enemyId)}</span>
            {matchup.lane === LANES.JUNGLE && <span title="Their jungler counts 1.5 times" className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-1 whitespace-nowrap">Jungler ×1.5</span>}
            {matchup.source === 'you' && <span title={`Your rating: ${TIER_LABELS[matchup.tier]}`} className={`text-[10px] font-bold px-1.5 rounded text-white ${TIER_COLORS[matchup.tier]}`}>{matchup.tier}</span>}
            {matchup.source === 'stats' && <span title={`${STATS_RANK} win-rate change in this matchup. You haven't rated it.`} className={`text-[10px] font-mono font-bold px-1.5 rounded ${statsTone}`}>{matchup.delta > 0 ? '+' : ''}{matchup.delta.toFixed(1)}</span>}
            {!matchup.source && <span title="No rating or stats" className="text-[10px] font-bold px-1.5 rounded bg-slate-600 text-white">?</span>}
            {matchup.quickNote && <span className="text-[10px] text-yellow-300 italic whitespace-nowrap max-w-[140px] truncate">{matchup.quickNote}</span>}
        </div>
    );
}

function RankedList({ entries, currentId, onSelect }) {
    return (
        <ol className="space-y-1.5">
            {entries.map((entry, index) => (
                <li key={entry.id}>
                    <button type="button" onClick={() => onSelect(entry)} aria-current={entry.id === currentId ? 'true' : undefined}
                        className={`w-full grid grid-cols-[1rem_2rem_minmax(0,1fr)_2.25rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${entry.id === currentId ? 'bg-cyan-500/10 border border-cyan-500/40' : 'bg-slate-800/40 border border-white/5 hover:border-white/20'}`}>
                        <span className="text-[10px] font-mono text-gray-500 text-right">{index + 1}</span>
                        <div className="w-8 h-8"><HeroAvatar heroId={entry.id} size="fill" className="w-full h-full" showTooltip={false} /></div>
                        <div className="min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-white truncate">{heroName(entry.id)}</span>
                                {entry.parts.risk >= 0.1 && <span title="Counter-pick risk: strong counters are still open" className="text-[9px] font-mono text-red-300 whitespace-nowrap">−{entry.parts.risk.toFixed(1)} risk</span>}
                            </div>
                            <ScoreBar entry={entry} />
                        </div>
                        <span className="text-sm font-mono font-bold text-cyan-300 text-right">{Math.round(entry.total)}</span>
                    </button>
                </li>
            ))}
        </ol>
    );
}

function PoolSwitch({ onlyPool, setOnlyPool, hasPool }) {
    const on = onlyPool && hasPool;
    return (
        <button type="button" role="switch" aria-checked={on} disabled={!hasPool} onClick={() => setOnlyPool(value => !value)}
            title={hasPool ? 'Only rank junglers you gave a comfort rating' : 'Give junglers a comfort rating in Ratings to build your pool'}
            className="flex items-center gap-2 text-[11px] font-semibold text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed">
            <span className={`relative w-8 h-4 rounded-full transition-colors ${on ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
            </span>
            Only my pool
        </button>
    );
}

function coverageText({ rated, known, total }) {
    const parts = [];
    if (rated) parts.push(`${rated} rated by you`);
    if (known - rated) parts.push(`${known - rated} from stats`);
    if (total - known) parts.push(`${total - known} unknown`);
    return parts.join(' · ');
}

function PickDetails({ entry, ratingSource }) {
    return (
        <div className="animate-scaleUp">
            <div className="flex items-center gap-4">
                <div className="relative shrink-0 w-16 h-16 lg:w-24 lg:h-24">
                    <div className="absolute inset-0 bg-cyan-500 blur-[40px] opacity-20 rounded-full"></div>
                    <HeroAvatar heroId={entry.id} size="fill" className="w-full h-full" showTooltip={false} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl lg:text-4xl font-black text-white tracking-tight truncate">{heroName(entry.id)}</h2>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span className="text-3xl lg:text-4xl font-mono font-black text-cyan-300">{Math.round(entry.total)}</span>
                        <span className="text-xs text-gray-500">/ 100</span>
                        {entry.coverage.total > 0 && <span className="text-[11px] text-gray-400">{coverageText(entry.coverage)}</span>}
                    </div>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <ScoreBar entry={entry} tall />
                <PartLegend ratingSource={ratingSource} />
            </div>

            <div className="mt-4 space-y-3">
                {entry.details.matchups.length > 0 && (
                    <div>
                        <h3 className={SUBHEAD}>Matchups</h3>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {entry.details.matchups.map(matchup => <MatchupChip key={matchup.enemyId} matchup={matchup} />)}
                        </div>
                    </div>
                )}
                {entry.details.matchups.some(matchup => matchup.comment) && (
                    <div>
                        <h3 className={SUBHEAD}>Your notes</h3>
                        <ul className="text-xs text-gray-300 space-y-1">
                            {entry.details.matchups.filter(matchup => matchup.comment).map(matchup => (
                                <li key={matchup.enemyId} className="flex gap-1.5"><Icons.MessageSquare size={12} className="text-cyan-400 shrink-0 mt-0.5" /><span><span className="font-semibold text-white">vs {heroName(matchup.enemyId)}:</span> {matchup.comment}</span></li>
                            ))}
                        </ul>
                    </div>
                )}
                <div>
                    <h3 className={SUBHEAD}>Team fit</h3>
                    <ul className="text-xs text-gray-300 space-y-0.5">{entry.details.teamFit.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                    {entry.details.teamFit.synergy.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {entry.details.teamFit.synergy.map(({ allyId, delta }) => (
                                <span key={allyId} title={`${STATS_RANK} win-rate change when ${heroName(entry.id)} and ${heroName(allyId)} are on the same team`}
                                    className={`text-[10px] rounded px-1.5 py-0.5 border whitespace-nowrap ${delta >= 1 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : delta <= -1 ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-white/10 bg-slate-800 text-gray-300'}`}>
                                    with {heroName(allyId)} <span className="font-mono font-bold">{delta > 0 ? '+' : ''}{delta.toFixed(1)}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {entry.parts.risk > 0 && (
                    <div>
                        <h3 className={SUBHEAD}>Counter-pick risk</h3>
                        <p className="text-xs text-red-300">Still open and strong against {heroName(entry.id)}: {entry.details.risk.counterIds.map(heroName).join(', ')}.</p>
                    </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                    <span>{entry.details.comfort ? `Your comfort: ${entry.details.comfort}/5` : 'No comfort rating yet'}</span>
                    <span>{ratingSource === 'mine' ? 'Win-rate stats off' : entry.details.winRate !== null ? `${STATS_RANK} win rate ${(entry.details.winRate * 100).toFixed(1)}%` : 'No win-rate data'}</span>
                </div>
            </div>
        </div>
    );
}

const FOOTERS = {
    mine: 'Using only your tier ratings, notes and comfort. Mythic stats are off.',
    both: `Your own ratings count double. Unrated matchups use ${STATS_RANK} stats from ${STATS_INFO.updated}.`,
    stats: `Using only ${STATS_RANK} stats from ${STATS_INFO.updated}. Your tier ratings are off; comfort still counts.`,
};

const BLIND_INTROS = {
    mine: 'No enemy picks yet. These junglers have the fewest open heroes you rated Countered (D), weighed with your comfort and team composition.',
    both: `No enemy picks yet. These junglers have the fewest strong counters still open, weighed with your comfort, team fit and ${STATS_RANK} win rates.`,
    stats: `No enemy picks yet. These junglers have the fewest strong counters still open by ${STATS_RANK} stats, weighed with your comfort, team fit and win rates.`,
};

export default function Recommendation({ scoring, ratingSource = 'both', setRatingSource, allyJunglers = [], onlyPool, setOnlyPool, hasPool, onOpenDatabase }) {
    const { mode, ranked, recommended } = scoring;
    const [viewedId, setViewedId] = useState(null);

    // Any new pick or ban can reorder everything, so go back to the top recommendation.
    const rankingKey = `${mode}|${ranked.map(entry => entry.id).join(',')}`;
    useEffect(() => { setViewedId(null); }, [rankingKey]);

    const viewed = viewedId ? ranked.find(entry => entry.id === viewedId) : null;
    const fallback = mode === 'counter' ? ranked[0] : null;
    const current = viewed || recommended || fallback || null;
    const title = mode === 'blind'
        ? (viewed ? 'Early pick' : 'Safe early picks')
        : viewed && viewed !== recommended ? 'Alternative option'
            : recommended ? 'Recommended pick' : 'Best available · limited data';

    const select = (entry) => setViewedId(recommended && entry.id === recommended.id ? null : entry.id);

    return (
        <section aria-label="Recommended jungler" className="glass-panel rounded-2xl p-4 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-cyan-400"><Icons.Crown size={16} /><span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">{title}</span></div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {setRatingSource && <SourceSwitch value={ratingSource} onChange={setRatingSource} />}
                    <PoolSwitch onlyPool={onlyPool} setOnlyPool={setOnlyPool} hasPool={hasPool} />
                </div>
            </div>

            {allyJunglers.length > 0 && (
                <p role="status" className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <Icons.Info size={14} className="shrink-0 mt-0.5" />
                    <span>Your team already has {allyJunglers.map(heroName).join(' and ')}, who usually {allyJunglers.length === 1 ? 'jungles' : 'jungle'}. If you're jungling, ask for a lane swap, since two junglers split the jungle's gold and experience.</span>
                </p>
            )}

            {ranked.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400 space-y-3">
                    <p>{onlyPool && hasPool ? 'None of the junglers in your pool are still available. Turn off "Only my pool" to see everyone.' : 'All of your junglers are picked or banned.'}</p>
                    <button type="button" onClick={onOpenDatabase} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wide">Add junglers in Ratings</button>
                </div>
            ) : (
                <>
                    {mode === 'blind' && !viewed && (
                        <p className="text-xs text-gray-400 mb-3 max-w-xl">{BLIND_INTROS[ratingSource] || BLIND_INTROS.both}</p>
                    )}
                    {current && <PickDetails entry={current} ratingSource={ratingSource} />}
                    {viewed && <button type="button" onClick={() => setViewedId(null)} className="text-xs text-cyan-400 hover:underline mt-3 block">&larr; {recommended ? 'Back to the recommended pick' : 'Back to the ranking'}</button>}
                    <div className={current ? 'mt-5' : ''}>
                        <h3 className={SUBHEAD}>{mode === 'blind' ? 'Ranking' : 'Top options'}</h3>
                        <RankedList entries={ranked.slice(0, LIST_SIZE)} currentId={current && current.id} onSelect={select} />
                    </div>
                </>
            )}

            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
                <span>{FOOTERS[ratingSource] || FOOTERS.both}</span>
                <button type="button" onClick={onOpenDatabase} className="text-cyan-400 hover:underline">Rate matchups</button>
            </div>
        </section>
    );
}
