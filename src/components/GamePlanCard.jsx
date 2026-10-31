import { TIER_COLORS, TIER_LABELS } from '../data/tiers.js';
import { ENEMY_JUNGLER_WEIGHT } from '../lib/scoring.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import { RiskSection, ResultLog } from './StatSheet.jsx';
import { TierChip } from './ui.jsx';

function PlanRow({ matchup, onEditNotes }) {
    const hasNotes = matchup.quickNote || matchup.comment;
    return (
        <li className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3 border-t border-sheet-line">
            <HeroAvatar heroId={matchup.enemyId} className="w-12 h-12" />
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{heroName(matchup.enemyId)}</span>
                    <TierChip tier={matchup.tier} size="sm" />
                    <span className="text-xs text-sheet-muted">{matchup.tier ? TIER_LABELS[matchup.tier] : 'Not rated'}{matchup.groupName ? `, from ${matchup.groupName}` : ''}</span>
                    {matchup.weight > 1 && <span title={`Their jungler counts ${ENEMY_JUNGLER_WEIGHT} times`} className="label text-[11px] px-1 bg-sheet-ink text-sheet">Their jungler</span>}
                </div>
                {matchup.quickNote && <p className="font-semibold text-sm mt-1">{matchup.quickNote}</p>}
                {matchup.comment && <p className="text-sm mt-0.5">{matchup.comment}</p>}
                {!hasNotes && <p className="text-sm text-sheet-muted mt-1">No notes yet.</p>}
            </div>
            <button type="button" onClick={() => onEditNotes(matchup.enemyId)} aria-label={`${hasNotes ? 'Edit' : 'Add'} notes for ${heroName(matchup.enemyId)}`} className="sheet-btn !min-h-[2rem] !px-2">{hasNotes ? 'Edit' : 'Add note'}</button>
        </li>
    );
}

// What's left once you've locked in: your tips and notes for each enemy, without the scoring around them.
export default function GamePlanCard({ entry, skills, onUnlock, onEditNotes, resultLog }) {
    return (
        <section aria-label={`Game plan for ${heroName(entry.id)}`} className="sheet p-3 sm:p-4 lg:p-5 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="tab-cut tab-cut-ink">Game plan</span>
                <button type="button" onClick={onUnlock} className="sheet-btn">Change pick</button>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative w-[72px] h-[72px] sm:w-[92px] sm:h-[92px] shrink-0">
                    <div className="pentagon absolute inset-0 bg-sheet-ink" />
                    <HeroAvatar heroId={entry.id} className="pentagon absolute inset-[3px]" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="label text-sheet-muted">Locked in</div>
                    <div className="display text-3xl sm:text-4xl truncate mt-1">{heroName(entry.id)}</div>
                </div>
                <div className="flex items-stretch shrink-0 border-[2.5px] border-sheet-ink">
                    <div className="px-2.5 py-1.5"><div className="label text-[12px] text-sheet-muted">Viability</div><div className="display text-3xl mt-0.5">{Math.round(entry.total)}</div></div>
                    <div className={`w-12 flex items-center justify-center display text-3xl ${TIER_COLORS[entry.grade]}`}>{entry.grade}</div>
                </div>
            </div>

            {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="label text-sheet-muted">They have</span>
                    {skills.map(({ group, heroIds }) => (
                        <span key={group.id} title={heroIds.map(heroName).join(', ')} className="text-[13px] font-semibold px-2 py-0.5 border border-sheet-line">{group.name}{heroIds.length > 1 ? ` ×${heroIds.length}` : ''}</span>
                    ))}
                </div>
            )}

            <ul className="mt-3 border-b border-sheet-line">
                {entry.matchups.map((matchup) => <PlanRow key={matchup.enemyId} matchup={matchup} onEditNotes={onEditNotes} />)}
            </ul>

            <RiskSection entry={entry} />

            <div className="mt-4 pt-3 border-t-[2.5px] border-sheet-ink flex items-center gap-2">
                <Icons.Chart size={15} className="shrink-0" />
                <div className="flex-1 min-w-0"><ResultLog entry={entry} {...resultLog} /></div>
            </div>
        </section>
    );
}
