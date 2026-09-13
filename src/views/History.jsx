import { useMemo, useState } from 'react';
import { TIER_COLORS, TIER_LABELS } from '../data/tiers.js';
import { reviewRatings, summarizeHistory } from '../lib/history.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar, { heroName } from '../components/HeroAvatar.jsx';

const RECENT_LIMIT = 20;
const REVIEW_MIN_GAMES = 3;
const CARD = 'rounded-2xl border border-white/10 bg-slate-900/60 p-4';
const HEADING = 'text-[10px] lg:text-xs font-bold uppercase tracking-widest text-gray-400 mb-3';
const percent = (value) => (value === null ? '—' : `${Math.round(value * 100)}%`);
const formatDate = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Stat({ label, value, detail }) {
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
            <div className="text-2xl font-mono font-black text-white mt-1">{value}</div>
            {detail && <div className="text-[11px] text-gray-400 mt-0.5">{detail}</div>}
        </div>
    );
}

function TierBadge({ tier }) {
    return <span title={TIER_LABELS[tier]} className={`inline-block text-[10px] font-bold px-1.5 rounded text-white ${TIER_COLORS[tier]}`}>{tier}</span>;
}

export default function History({ history, ratings, onDeleteGame, onSetTier, onOpenDraft }) {
    const summary = useMemo(() => summarizeHistory(history), [history]);
    const review = useMemo(() => reviewRatings(history, ratings, { minGames: REVIEW_MIN_GAMES }), [history, ratings]);
    const [showAll, setShowAll] = useState(false);

    if (!history.length) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 animate-fadeIn">
                <Icons.Chart size={40} className="mb-4 opacity-30" />
                <p className="font-bold uppercase tracking-widest text-sm">No games recorded yet</p>
                <p className="text-xs mt-2 max-w-sm">After a game, fill in the draft and tap Won or Lost under the recommendation in Draft Lab. Your record and ratings to review will show up here.</p>
                <button type="button" onClick={onOpenDraft} className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wide">Go to Draft Lab</button>
            </div>
        );
    }

    const games = showAll ? history : history.slice(0, RECENT_LIMIT);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-8 animate-fadeIn">
            <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                    <Stat label="Record" value={`${summary.wins}–${summary.losses}`} detail={`${summary.games} game${summary.games === 1 ? '' : 's'}`} />
                    <Stat label="Win rate" value={percent(summary.winRate)} />
                    <Stat label="Played the top pick" value={percent(summary.topPick.winRate)} detail={`${summary.topPick.wins} of ${summary.topPick.games} won`} />
                    <Stat label="Played something else" value={percent(summary.otherPick.winRate)} detail={`${summary.otherPick.wins} of ${summary.otherPick.games} won`} />
                </div>
                <p className="text-[11px] text-gray-500 -mt-2">"Top pick" is the jungler JunglerOS ranked first for the final enemy lineup, with your slot left open.</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <section className={CARD} aria-label="Results by jungler">
                        <h2 className={HEADING}>Your junglers</h2>
                        <ul className="space-y-2">
                            {summary.byJungler.map(entry => (
                                <li key={entry.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
                                    <div className="w-8 h-8"><HeroAvatar heroId={entry.id} size="fill" className="w-full h-full" showTooltip={false} /></div>
                                    <div className="min-w-0">
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="font-semibold text-white truncate">{heroName(entry.id)}</span>
                                            <span className="text-gray-400 whitespace-nowrap">{entry.wins}–{entry.losses}</span>
                                        </div>
                                        <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${entry.winRate * 100}%` }} /></div>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-emerald-300 w-11 text-right">{percent(entry.winRate)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className={CARD} aria-label="Ratings to review">
                        <h2 className={HEADING}>Ratings to review</h2>
                        {review.length === 0 ? (
                            <p className="text-xs text-gray-500">Nothing to review yet. After {REVIEW_MIN_GAMES} games against the same hero, matchups you haven't rated, or rated two or more tiers away from your results, show up here.</p>
                        ) : (
                            <ul className="space-y-2">
                                {review.map(item => (
                                    <li key={`${item.junglerId}|${item.enemyId}`} className="rounded-lg bg-slate-800/40 border border-white/5 px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 text-xs text-white truncate"><span className="font-semibold">{heroName(item.junglerId)}</span> <span className="text-gray-500">vs</span> <span className="font-semibold">{heroName(item.enemyId)}</span></div>
                                            <button type="button" onClick={() => onSetTier(item.junglerId, item.enemyId, item.suggestedTier)} className="shrink-0 px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wide">
                                                Rate {item.suggestedTier}
                                            </button>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
                                            <span>Won {item.wins} of {item.games} ({percent(item.winRate)})</span>
                                            <span>·</span>
                                            {item.tier ? <span>You rated <TierBadge tier={item.tier} /> {TIER_LABELS[item.tier]}</span> : <span>Not rated</span>}
                                            <span>·</span>
                                            <span>Results suggest <TierBadge tier={item.suggestedTier} /> {TIER_LABELS[item.suggestedTier]}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <section className={CARD} aria-label="Recent games">
                    <h2 className={HEADING}>{showAll ? 'All games' : 'Recent games'}</h2>
                    <ul className="space-y-1.5">
                        {games.map(game => {
                            const enemyIds = game.draft.enemy.filter(Boolean);
                            const won = game.result === 'win';
                            return (
                                <li key={game.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 border border-white/5 px-3 py-2">
                                    <span className={`w-11 shrink-0 text-center text-[10px] font-bold uppercase rounded px-1 py-0.5 ${won ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{won ? 'Win' : 'Loss'}</span>
                                    <div className="w-9 h-9 shrink-0"><HeroAvatar heroId={game.playedId} size="fill" className="w-full h-full" showTooltip={false} /></div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                                            <span className="truncate">{heroName(game.playedId)}</span>
                                            {game.topPickId === game.playedId && <span className="shrink-0 text-[9px] font-bold uppercase text-cyan-300 border border-cyan-500/40 rounded px-1">Top pick</span>}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate">{formatDate(game.playedAt)}{enemyIds.length ? ` · vs ${enemyIds.map(heroName).join(', ')}` : ''}</div>
                                    </div>
                                    <div className="hidden sm:flex -space-x-1.5">
                                        {enemyIds.map(id => <div key={id} className="w-6 h-6 rounded-md ring-1 ring-slate-900 overflow-hidden"><HeroAvatar heroId={id} size="fill" className="w-full h-full" showTooltip={false} /></div>)}
                                    </div>
                                    <button type="button" aria-label={`Delete the ${won ? 'win' : 'loss'} with ${heroName(game.playedId)} from ${formatDate(game.playedAt)}`}
                                        onClick={() => onDeleteGame(game)}
                                        className="shrink-0 w-7 h-7 rounded-md text-gray-500 hover:text-white hover:bg-red-600/60 flex items-center justify-center">
                                        <Icons.Trash2 size={13} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {history.length > RECENT_LIMIT && (
                        <button type="button" onClick={() => setShowAll(value => !value)} className="mt-3 text-xs text-cyan-400 hover:underline">
                            {showAll ? 'Show recent games only' : `Show all ${history.length} games`}
                        </button>
                    )}
                </section>
            </div>
        </div>
    );
}
