import { useMemo, useState } from 'react';
import { HERO_BY_ID } from '../data/heroes.js';
import { TIERS, TIER_COLORS, TIER_LABELS, gradeFor } from '../data/tiers.js';
import { sortEntries } from '../lib/scoring.js';
import { compactName } from '../lib/heroIds.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import { RiskMeter, SearchField, Segmented, Switch, TierChip } from './ui.jsx';

const SORTS = [
    { value: 'viability', label: 'Best score' },
    { value: 'risk', label: 'Lowest risk' },
    { value: 'comfort', label: 'Comfort' },
    { value: 'name', label: 'A-Z' },
];
const VIEWS = [
    { value: 'list', label: <><Icons.List size={13} /> List</> },
    { value: 'tiers', label: <><Icons.Grid size={13} /> Tiers</> },
];
const ROLES = ['Assassin', 'Fighter', 'Tank', 'Mage', 'Marksman', 'Support'];
const ROW_GRID = 'grid grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_2.5rem_3rem] sm:grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_auto_2.5rem_3rem] items-center gap-x-2';

const hasRole = (heroId, role) => role === 'All' || (HERO_BY_ID[heroId] && HERO_BY_ID[heroId].roles.includes(role));

function ComfortDots({ comfort }) {
    return (
        <span className="inline-flex gap-[2px]" role="img" aria-label={comfort ? `Comfort ${comfort} of 5` : 'Comfort not set'} title={comfort ? `Comfort ${comfort} of 5` : 'Comfort not set'}>
            {[1, 2, 3, 4, 5].map((level) => <span key={level} className={`w-[6px] h-[6px] ${comfort && level <= comfort ? 'bg-accent' : 'bg-ink-4'}`} />)}
        </span>
    );
}

function MatchupChips({ entry, enemySlots }) {
    return (
        <span className="inline-flex gap-[2px]">
            {enemySlots.map((heroId, index) => {
                if (!heroId) return <span key={index} className="w-5 h-5 border border-line opacity-50" aria-hidden="true" />;
                const matchup = entry.matchups.find((item) => item.enemyId === heroId);
                return <TierChip key={heroId} tier={matchup.tier} size="sm" title={`vs ${heroName(heroId)}: ${matchup.tier ? TIER_LABELS[matchup.tier] : 'Not rated, counts as Even'}${matchup.groupName ? ` (from ${matchup.groupName})` : ''}`} />;
            })}
        </span>
    );
}

function RankRow({ entry, rank, enemySlots, selected, onSelect }) {
    const barColor = `var(--tier-${entry.grade.toLowerCase()})`;
    return (
        <li>
            <button type="button" onClick={() => onSelect(entry.id)} aria-current={selected ? 'true' : undefined}
                className={`relative w-full text-left px-2 py-2 border-b border-line transition-colors ${ROW_GRID} ${selected ? 'bg-ink-4' : 'hover:bg-ink-3'}`}>
                <span className="label text-fg-faint text-right tabular-nums">{rank}</span>
                <HeroAvatar heroId={entry.id} className="w-10 h-10" />
                <span className="min-w-0">
                    <span className="block font-semibold text-sm text-fg truncate leading-tight">{heroName(entry.id)}</span>
                    <span className="mt-1 flex items-center gap-2">
                        <ComfortDots comfort={entry.comfort} />
                        <span className="sm:hidden"><MatchupChips entry={entry} enemySlots={enemySlots} /></span>
                    </span>
                </span>
                <span className="hidden sm:inline-flex"><MatchupChips entry={entry} enemySlots={enemySlots} /></span>
                <span className="display text-2xl text-fg text-right tabular-nums">{Math.round(entry.total)}</span>
                <span className="text-fg-muted flex justify-end"><RiskMeter risk={entry.risk} /></span>
                <span className="absolute left-0 bottom-0 h-[2px]" style={{ width: `${entry.total}%`, backgroundColor: barColor }} aria-hidden="true" />
            </button>
        </li>
    );
}

// A live tier list of your junglers for this draft, grouped by the tier each score rounds to.
function TierView({ entries, viewedId, onSelect }) {
    return (
        <div className="p-2 space-y-1.5">
            {TIERS.map((tier) => {
                const inTier = entries.filter((entry) => gradeFor(entry.total) === tier);
                return (
                    <div key={tier} className="flex border border-line min-h-[72px]">
                        <div className={`w-11 shrink-0 flex items-center justify-center display text-2xl ${TIER_COLORS[tier]}`}>{tier}</div>
                        <div className="flex-1 flex flex-wrap gap-1.5 p-1.5 content-start">
                            {inTier.map((entry) => (
                                <button key={entry.id} type="button" onClick={() => onSelect(entry.id)} aria-current={viewedId === entry.id ? 'true' : undefined} title={`${heroName(entry.id)}: ${Math.round(entry.total)}`}
                                    className={`w-[52px] text-center ${viewedId === entry.id ? 'outline outline-2 outline-accent' : ''}`}>
                                    <HeroAvatar heroId={entry.id} className="w-[52px] h-[52px]" />
                                    <span className="block display text-sm mt-0.5 text-fg">{Math.round(entry.total)}</span>
                                </button>
                            ))}
                            {inTier.length === 0 && <span className="self-center text-xs text-fg-faint px-1">None</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Every available jungler with its viability score and risk, plus the junglers you can't play this draft.
export default function RankingPanel({ scoring, enemySlots, viewedId, onSelect, onlyPool, setOnlyPool, hasPool, onOpenTierLists, takenLabels }) {
    const [sortKey, setSortKey] = useState('viability');
    const [view, setView] = useState('list');
    const [role, setRole] = useState('All');
    const [search, setSearch] = useState('');

    const rankOf = useMemo(() => new Map(scoring.ranked.map((entry, index) => [entry.id, index + 1])), [scoring]);
    const query = compactName(search);
    const visible = sortEntries(scoring.ranked, sortKey, heroName)
        .filter((entry) => hasRole(entry.id, role) && (!query || compactName(heroName(entry.id)).includes(query)));

    return (
        <section aria-label="All junglers" className="flex flex-col min-h-0 xl:h-full bg-ink-2 xl:border-l border-t xl:border-t-0 border-line">
            <div className="p-3 space-y-2 border-b border-line">
                <div className="flex items-center justify-between gap-2">
                    <span className="tab-cut">All junglers · {scoring.ranked.length}</span>
                    <Segmented label="Show as" options={VIEWS} value={view} onChange={setView} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Segmented label="Sort by" options={SORTS} value={sortKey} onChange={setSortKey} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <SearchField value={search} onChange={setSearch} placeholder="Find a jungler" label="Find a jungler" />
                    <Switch label="My pool" checked={onlyPool && hasPool} disabled={!hasPool} onChange={setOnlyPool} title={hasPool ? 'Only rank junglers you gave a comfort rating' : 'Give a jungler a comfort rating to build your pool'} />
                </div>
                <div role="group" aria-label="Filter by role" className="flex gap-1 overflow-x-auto scrollbar-hide">
                    {['All', ...ROLES].map((option) => (
                        <button key={option} type="button" aria-pressed={role === option} onClick={() => setRole(role === option ? 'All' : option)} className="chip">{option}</button>
                    ))}
                </div>
            </div>

            <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto scroll-thin">
                {scoring.ranked.length === 0 ? (
                    <div className="p-6 text-center text-sm text-fg-muted space-y-3">
                        <p>{onlyPool && hasPool ? 'Nobody in your pool is still available. Turn off My pool to see everyone.' : 'All of your junglers are picked or banned.'}</p>
                        <button type="button" onClick={onOpenTierLists} className="btn">Open tier lists</button>
                    </div>
                ) : view === 'tiers' ? (
                    <TierView entries={visible} viewedId={viewedId} onSelect={onSelect} />
                ) : (
                    <>
                        <div className={`px-2 py-1.5 border-b border-line xl:sticky xl:top-0 bg-ink-2 z-10 ${ROW_GRID}`}>
                            <span className="label text-fg-faint text-right">#</span>
                            <span className="label text-fg-faint col-span-2">Jungler</span>
                            <span className="hidden sm:inline-flex gap-[2px]" aria-hidden="true">
                                {enemySlots.map((heroId, index) => (heroId
                                    ? <HeroAvatar key={heroId} heroId={heroId} className="w-5 h-5" />
                                    : <span key={index} className="w-5 h-5" />))}
                            </span>
                            <span className="label text-fg-faint text-right">Score</span>
                            <span className="label text-fg-faint text-right">Risk</span>
                        </div>
                        <ol>
                            {visible.map((entry) => <RankRow key={entry.id} entry={entry} rank={rankOf.get(entry.id)} enemySlots={enemySlots} selected={entry.id === viewedId} onSelect={onSelect} />)}
                        </ol>
                        {visible.length === 0 && <p className="p-6 text-center text-sm text-fg-muted">No jungler matches that filter.</p>}
                    </>
                )}

                {scoring.unavailable.length > 0 && (
                    <div className="p-3 border-t border-line">
                        <div className="label text-fg-faint mb-2">Picked or banned · {scoring.unavailable.length}</div>
                        <div className="flex flex-wrap gap-2">
                            {scoring.unavailable.map((entry) => (
                                <div key={entry.id} className="w-11 text-center opacity-60" title={`${heroName(entry.id)} (${takenLabels[entry.id] || 'taken'})`}>
                                    <HeroAvatar heroId={entry.id} className="w-11 h-11 grayscale" />
                                    <div className="text-[11px] text-fg-muted truncate mt-0.5">{takenLabels[entry.id] || 'Taken'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
