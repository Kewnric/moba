import { useMemo, useState } from 'react';
import { TIER_LABELS } from '../data/tiers.js';
import { reviewRatings, summarizeHistory } from '../lib/history.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar, { heroName } from '../components/HeroAvatar.jsx';
import { EmptyState, TierChip } from '../components/ui.jsx';

const RECENT_LIMIT = 20;
const REVIEW_MIN_GAMES = 3;
const percent = (value) => (value === null ? '—' : `${Math.round(value * 100)}%`);
const formatDate = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Stat({ label, value, detail }) {
    return (
        <div className="panel p-3">
            <div className="label text-fg-faint">{label}</div>
            <div className="display text-4xl mt-1.5">{value}</div>
            {detail && <div className="text-xs text-fg-muted mt-1">{detail}</div>}
        </div>
    );
}

export default function History({ history, tiersByJungler, onDeleteGame, onSetTier, onOpenDraft }) {
    const summary = useMemo(() => summarizeHistory(history), [history]);
    const review = useMemo(() => reviewRatings(history, tiersByJungler, { minGames: REVIEW_MIN_GAMES }), [history, tiersByJungler]);
    const [showAll, setShowAll] = useState(false);

    if (!history.length) {
        return (
            <div className="flex-1 flex items-center justify-center animate-fadeIn">
                <EmptyState icon={Icons.Chart} title="No games logged yet" action={<button type="button" onClick={onOpenDraft} className="btn btn-primary">Go to Draft</button>}>
                    After a game, tap Won or Lost at the bottom of the stat sheet. Your record, and any tiers your results disagree with, show up here.
                </EmptyState>
            </div>
        );
    }

    const games = showAll ? history : history.slice(0, RECENT_LIMIT);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 lg:p-6 animate-fadeIn">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                    <Stat label="Record" value={`${summary.wins}-${summary.losses}`} detail={`${summary.games} game${summary.games === 1 ? '' : 's'}`} />
                    <Stat label="Win rate" value={percent(summary.winRate)} />
                    <Stat label="On the top pick" value={percent(summary.topPick.winRate)} detail={`${summary.topPick.wins} of ${summary.topPick.games} won`} />
                    <Stat label="On something else" value={percent(summary.otherPick.winRate)} detail={`${summary.otherPick.wins} of ${summary.otherPick.games} won`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <section aria-label="Results by jungler" className="panel p-3">
                        <span className="tab-cut mb-3">Your junglers</span>
                        <ul className="space-y-2 mt-3">
                            {summary.byJungler.map((entry) => (
                                <li key={entry.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3">
                                    <HeroAvatar heroId={entry.id} className="w-9 h-9" />
                                    <div className="min-w-0">
                                        <div className="flex items-center justify-between gap-2 text-sm">
                                            <span className="font-semibold truncate">{heroName(entry.id)}</span>
                                            <span className="text-fg-muted whitespace-nowrap tabular-nums">{entry.wins}-{entry.losses}</span>
                                        </div>
                                        <div className="mt-1 h-1 bg-ink-4"><div className="h-full bg-accent" style={{ width: `${entry.winRate * 100}%` }} /></div>
                                    </div>
                                    <span className="display text-xl w-12 text-right">{percent(entry.winRate)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section aria-label="Tiers to review" className="panel p-3">
                        <span className="tab-cut">Tiers to review</span>
                        {review.length === 0 ? (
                            <p className="text-sm text-fg-muted mt-3">Nothing to review yet. After {REVIEW_MIN_GAMES} games against the same hero, matchups you haven't rated, or rated two or more tiers away from your results, show up here.</p>
                        ) : (
                            <ul className="space-y-2 mt-3">
                                {review.map((item) => (
                                    <li key={`${item.junglerId}|${item.enemyId}`} className="bg-ink-3 border border-line px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 text-sm truncate"><span className="font-semibold">{heroName(item.junglerId)}</span> <span className="text-fg-faint">vs</span> <span className="font-semibold">{heroName(item.enemyId)}</span></div>
                                            <button type="button" onClick={() => onSetTier(item.junglerId, item.enemyId, item.suggestedTier)} className="btn btn-primary !min-h-[1.875rem] !px-2 shrink-0">Rate {item.suggestedTier}</button>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                                            <span>Won {item.wins} of {item.games} ({percent(item.winRate)})</span>
                                            <span aria-hidden="true">·</span>
                                            {item.tier ? <span className="inline-flex items-center gap-1">Tier <TierChip tier={item.tier} size="sm" /> {TIER_LABELS[item.tier]}</span> : <span>Not rated</span>}
                                            <span aria-hidden="true">·</span>
                                            <span className="inline-flex items-center gap-1">Results say <TierChip tier={item.suggestedTier} size="sm" /> {TIER_LABELS[item.suggestedTier]}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <section aria-label="Recent games" className="panel p-3">
                    <span className="tab-cut">{showAll ? 'All games' : 'Recent games'}</span>
                    <ul className="space-y-1 mt-3">
                        {games.map((game) => {
                            const enemyIds = game.draft.enemy.filter(Boolean);
                            const won = game.result === 'win';
                            return (
                                <li key={game.id} className="flex items-center gap-3 bg-ink-3 border border-line px-2 py-1.5">
                                    <span className={`w-11 shrink-0 text-center label py-1 ${won ? 'bg-accent text-accent-on' : 'bg-ink-4 text-fg-muted'}`}>{won ? 'Win' : 'Loss'}</span>
                                    <HeroAvatar heroId={game.playedId} className="w-9 h-9 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                                            <span className="truncate">{heroName(game.playedId)}</span>
                                            {game.topPickId === game.playedId && <span className="label text-[11px] px-1 border border-accent text-accent shrink-0">Top pick</span>}
                                        </div>
                                        <div className="text-xs text-fg-faint truncate">{formatDate(game.playedAt)}{enemyIds.length ? ` · vs ${enemyIds.map(heroName).join(', ')}` : ''}</div>
                                    </div>
                                    <div className="hidden sm:flex gap-[2px]">
                                        {enemyIds.map((id) => <HeroAvatar key={id} heroId={id} className="w-6 h-6" />)}
                                    </div>
                                    <button type="button" aria-label={`Delete the ${won ? 'win' : 'loss'} with ${heroName(game.playedId)} from ${formatDate(game.playedAt)}`} onClick={() => onDeleteGame(game)} className="btn btn-quiet !min-h-[2rem] !px-2 shrink-0">
                                        <Icons.Trash2 size={13} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {history.length > RECENT_LIMIT && (
                        <button type="button" onClick={() => setShowAll((value) => !value)} className="btn btn-quiet mt-2">
                            {showAll ? 'Show recent games only' : `Show all ${history.length} games`}
                        </button>
                    )}
                </section>
            </div>
        </div>
    );
}
