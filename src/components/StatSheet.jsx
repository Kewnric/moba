import { HERO_BY_ID } from '../data/heroes.js';
import { TIER_COLORS, TIER_POINTS } from '../data/tiers.js';
import { ENEMY_JUNGLER_WEIGHT, GRAPH_OPTIONS } from '../lib/scoring.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import StatHexagon from './StatHexagon.jsx';
import { RISK_LABELS, RiskMeter, TierButtons } from './ui.jsx';

const COMFORT_LABELS = { 1: 'Rarely play', 2: 'Learning', 3: 'Comfortable', 4: 'Strong', 5: 'Main' };
const OPEN_SHOWN = 14;

const heroShort = (heroId) => (HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].name : heroId);

const sourceText = (matchup) => {
    if (matchup.source === 'group') return `From ${matchup.groupName}`;
    if (matchup.source === 'hero') return matchup.overridesGroup ? `Your rating, over ${matchup.overridesGroup}` : 'Your rating';
    return 'Not rated, counts as Even';
};

function IdCard({ entry, label }) {
    return (
        <div className="border-[2.5px] border-sheet-ink bg-sheet">
            <div className="text-center py-1.5 px-2 bg-sheet-ink text-sheet">
                <div className="label text-[12px] opacity-80">{label}</div>
                <div className="display text-2xl md:text-[1.75rem] truncate mt-1">{heroName(entry.id)}</div>
            </div>
            <div className="flex md:flex-col">
                <div className="relative graph-paper w-[42%] md:w-auto flex items-center justify-center py-3 overflow-hidden border-r-[2.5px] md:border-r-0 md:border-b-[2.5px] border-sheet-ink">
                    <div className="focus-lines" />
                    <div className="relative w-[84px] h-[84px] md:w-[116px] md:h-[116px]">
                        <div className="pentagon absolute inset-0 bg-sheet-ink" />
                        <HeroAvatar heroId={entry.id} className="pentagon absolute inset-[3px]" />
                    </div>
                </div>
                <div className="flex-1 flex items-stretch min-w-0">
                    <div className="flex-1 px-2.5 py-2 min-w-0 flex flex-col justify-center">
                        <div className="label text-sheet-muted">Viability</div>
                        <div className="display text-[3.25rem] md:text-[4rem] leading-none mt-1">{Math.round(entry.total)}</div>
                    </div>
                    <div className={`w-16 md:w-[72px] shrink-0 flex items-center justify-center display text-[3.25rem] md:text-[3.75rem] ${TIER_COLORS[entry.grade]}`} title={`Rounds to tier ${entry.grade}`}>{entry.grade}</div>
                </div>
            </div>
        </div>
    );
}

function Fact({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-2 py-1.5 border-t border-sheet-line first:border-t-0">
            <dt className="label text-sheet-muted">{label}</dt>
            <dd className="text-sm font-semibold text-right">{children}</dd>
        </div>
    );
}

function MatchupRow({ matchup, onSetTier }) {
    return (
        <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_2rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_2rem] items-center gap-x-2.5 gap-y-1.5 py-2 border-t border-sheet-line">
            <HeroAvatar heroId={matchup.enemyId} className="w-9 h-9" />
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-sm leading-tight">
                    <span className="truncate">{heroName(matchup.enemyId)}</span>
                    {matchup.weight > 1 && <span title={`Their jungler counts ${ENEMY_JUNGLER_WEIGHT} times`} className="label text-[11px] px-1 bg-sheet-ink text-sheet shrink-0">JG ×{ENEMY_JUNGLER_WEIGHT}</span>}
                </div>
                <div className="text-xs text-sheet-muted truncate">{sourceText(matchup)}{matchup.quickNote ? ` · ${matchup.quickNote}` : ''}</div>
            </div>
            <div className="order-last col-span-3 pl-[2.875rem] sm:order-none sm:col-span-1 sm:pl-0">
                <TierButtons compact value={matchup.tier} inherited={matchup.source === 'group'} label={`Rate ${heroName(matchup.enemyId)}`} onChange={(tier) => onSetTier(matchup, tier)} />
            </div>
            <span className="display text-xl text-right">{matchup.points}</span>
        </li>
    );
}

function ComfortRow({ entry, onSetComfort }) {
    return (
        <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_2rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_2rem] items-center gap-x-2.5 gap-y-1.5 py-2 border-t border-sheet-line">
            <span className="w-9 h-9 flex items-center justify-center bg-sheet-ink text-sheet"><Icons.Zap size={16} /></span>
            <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight">Comfort</div>
                <div className="text-xs text-sheet-muted truncate">{entry.comfort ? COMFORT_LABELS[entry.comfort] : 'Not set, counts as 3'}</div>
            </div>
            <div role="group" aria-label={`Comfort on ${heroName(entry.id)}`} className="order-last col-span-3 pl-[2.875rem] sm:order-none sm:col-span-1 sm:pl-0 inline-flex gap-[3px]">
                {[1, 2, 3, 4, 5].map((level) => (
                    <button key={level} type="button" aria-pressed={entry.comfort === level} title={COMFORT_LABELS[level]} onClick={() => onSetComfort(entry.id, entry.comfort === level ? null : level)}
                        className={`w-7 h-7 display text-[14px] transition-colors ${entry.comfort === level ? 'bg-sheet-ink text-sheet' : 'tier-off'}`}>{level}</button>
                ))}
            </div>
            <span className="display text-xl text-right">{entry.comfortScore}</span>
        </li>
    );
}

export function RiskSection({ entry }) {
    const { risk } = entry;
    const shown = risk.openCounters.slice(0, OPEN_SHOWN);
    return (
        <section aria-label="Counter-pick risk" className="mt-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="tab-cut tab-cut-ink">Risk: {RISK_LABELS[risk.level]}</span>
                <span className="text-xs text-sheet-muted">Shown for planning only. It never changes the score.</span>
            </div>
            {risk.picksLeft === 0 ? (
                <p className="text-sm mt-2">The enemy lineup is full, so nothing can counter-pick you now.</p>
            ) : risk.openCounters.length === 0 ? (
                <p className="text-sm mt-2">No open hero is rated Countered for {heroName(entry.id)}, with {risk.picksLeft} enemy pick{risk.picksLeft === 1 ? '' : 's'} left.</p>
            ) : (
                <>
                    <p className="text-sm mt-2">{risk.openCounters.length} hero{risk.openCounters.length === 1 ? '' : 'es'} you rated Countered {risk.openCounters.length === 1 ? 'is' : 'are'} still open, with {risk.picksLeft} enemy pick{risk.picksLeft === 1 ? '' : 's'} left:</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {shown.map((heroId) => (
                            <div key={heroId} title={heroName(heroId)} className="w-9">
                                <HeroAvatar heroId={heroId} className="w-9 h-9" />
                                <div className="text-[11px] leading-tight truncate text-center mt-0.5">{heroShort(heroId)}</div>
                            </div>
                        ))}
                        {risk.openCounters.length > shown.length && <div className="w-9 h-9 flex items-center justify-center label border border-sheet-line">+{risk.openCounters.length - shown.length}</div>}
                    </div>
                </>
            )}
            {risk.facing.length > 0 && <p className="text-sm mt-2"><span className="font-semibold">Already facing:</span> {risk.facing.map(heroName).join(', ')}.</p>}
            {risk.openUnfavored.length > 0 && <p className="text-xs text-sheet-muted mt-1">Also open and rated Unfavored: {risk.openUnfavored.length}.</p>}
        </section>
    );
}

export function ResultLog({ entry, lastRecord, onRecord, onUndoRecord, onNewDraft }) {
    if (lastRecord) {
        return (
            <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
                <span className="tab-cut tab-cut-ink">{lastRecord.result === 'win' ? 'Win' : 'Loss'} saved</span>
                <span>with {heroName(lastRecord.playedId)}.</span>
                <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={onUndoRecord} className="sheet-btn">Undo</button>
                    <button type="button" onClick={onNewDraft} className="sheet-btn sheet-btn-solid">New draft</button>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">After the game, log <span className="font-semibold">{heroName(entry.id)}</span>:</span>
            <div className="flex gap-2 ml-auto">
                <button type="button" onClick={() => onRecord({ result: 'win', playedId: entry.id })} className="sheet-btn sheet-btn-solid">Won</button>
                <button type="button" onClick={() => onRecord({ result: 'loss', playedId: entry.id })} className="sheet-btn">Lost</button>
            </div>
        </div>
    );
}

// One corner of the hexagon per jungler you could pick, each with its viability score.
const axesFor = (options) => Array.from({ length: GRAPH_OPTIONS }, (_, index) => {
    const entry = options[index];
    if (!entry) return { key: `empty-${index}`, name: 'No option', empty: true };
    return {
        key: entry.id,
        name: heroName(entry.id),
        score: entry.total,
        tier: entry.grade,
        note: `${heroName(entry.id)}: viability ${Math.round(entry.total)}, risk ${RISK_LABELS[entry.risk.level].toLowerCase()}. Show this jungler.`,
    };
});

// The manga-style sheet: your options on the hexagon, then one jungler's ID card, every number behind its
// score, and its risk.
export default function StatSheet({ entry, top, rank, options, comfortWeight, hasPool, onSelectOption, onBackToTop, onSetTier, onSetComfort, onLockIn, onOpenComfort, resultLog, isTopOverall }) {
    const axes = axesFor(options);
    const matchupShare = 100 - comfortWeight;
    const unrated = entry.coverage.total - entry.coverage.rated;
    const description = options.map((option) => `${heroName(option.id)} ${Math.round(option.total)}`).join(', ');
    const cardLabel = isTopOverall ? 'Top pick' : `Option ${rank}`;

    return (
        <section aria-label={`Stat sheet for ${heroName(entry.id)}`} className="sheet p-3 sm:p-4 lg:p-5 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="tab-cut tab-cut-ink">Your options</span>
                {!isTopOverall && top && <button type="button" onClick={onBackToTop} className="sheet-btn">Back to {heroName(top.id)}</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_216px] gap-3 md:gap-4 items-start">
                <div className="order-2 md:order-1 min-w-0">
                    <div className="max-w-[520px] mx-auto">
                        <StatHexagon axes={axes} selectedKey={entry.id} onSelect={onSelectOption} description={`Your best jungler options: ${description}.`} />
                    </div>
                    <p className="text-xs text-sheet-muted text-center -mt-0.5">Viability out of 100. Tap a hero to see their numbers.</p>
                </div>
                <div className="order-1 md:order-2">
                    <IdCard entry={entry} label={cardLabel} />
                    <button type="button" onClick={() => onLockIn(entry.id)} className="sheet-btn sheet-btn-solid w-full mt-2 gap-1.5"><Icons.Lock size={14} /> Lock in {heroName(entry.id)}</button>
                    <dl className="mt-2 px-0.5">
                        <Fact label="Comfort">{entry.comfort ? `${entry.comfort} / 5` : 'Not set'}</Fact>
                        <Fact label="Enemies rated">{entry.coverage.rated} / {entry.coverage.total}</Fact>
                        <Fact label="Risk"><RiskMeter risk={entry.risk} showLabel /></Fact>
                    </dl>
                </div>
            </div>

            <div className="mt-3">
                {!hasPool && (
                    <p className="text-sm mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>You haven't set comfort on any jungler, so comfort counts the same for all of them.</span>
                        <button type="button" onClick={onOpenComfort} className="sheet-btn !min-h-[1.75rem] !px-2">Set comfort</button>
                    </p>
                )}
                {unrated > 0 && (
                    <p className="text-sm mb-2 flex items-start gap-1.5"><Icons.Info size={15} className="shrink-0 mt-0.5" /><span>{unrated} of {entry.coverage.total} enemies {unrated === 1 ? "isn't" : "aren't"} rated for {heroName(entry.id)}, so {unrated === 1 ? 'that counts' : 'they count'} as Even. Tap a letter below to rate {unrated === 1 ? 'it' : 'them'}.</span></p>
                )}
                <h3 className="sr-only">Score breakdown</h3>
                <ul className="border-b border-sheet-line">
                    <ComfortRow entry={entry} onSetComfort={onSetComfort} />
                    {entry.matchups.map((matchup) => (
                        <MatchupRow key={matchup.enemyId} matchup={matchup} onSetTier={onSetTier} />
                    ))}
                </ul>
                <p className="mt-2 text-sm flex flex-wrap items-baseline gap-x-1.5" aria-label="How the score adds up">
                    <span className="label text-sheet-muted mr-1">The math</span>
                    <span>Matchups <b>{entry.matchupScore}</b> × {matchupShare}%</span>
                    <span>+ Comfort <b>{entry.comfortScore}</b> × {comfortWeight}%</span>
                    <span>= <b>{entry.total}</b></span>
                </p>
                <p className="text-xs text-sheet-muted mt-0.5">S {TIER_POINTS.S} · A {TIER_POINTS.A} · B {TIER_POINTS.B} · C {TIER_POINTS.C} · D {TIER_POINTS.D}. Nothing else goes into this score.</p>
            </div>

            {entry.matchups.some((matchup) => matchup.comment) && (
                <section aria-label="Your notes" className="mt-4">
                    <span className="tab-cut tab-cut-ink">Your notes</span>
                    <ul className="mt-2 space-y-1 text-sm">
                        {entry.matchups.filter((matchup) => matchup.comment).map((matchup) => (
                            <li key={matchup.enemyId}><span className="font-semibold">vs {heroName(matchup.enemyId)}:</span> {matchup.comment}</li>
                        ))}
                    </ul>
                </section>
            )}

            <RiskSection entry={entry} />

            <div className="mt-4 pt-3 border-t-[2.5px] border-sheet-ink">
                <ResultLog entry={entry} {...resultLog} />
            </div>
        </section>
    );
}
