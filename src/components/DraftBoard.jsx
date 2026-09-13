import { useState } from 'react';
import { LANES } from '../data/heroes.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';

const BAN_COUNTS = [3, 4, 5];
const LANE_SHORT = { [LANES.ROAM]: 'Roam', [LANES.GOLD]: 'Gold', [LANES.EXP]: 'EXP', [LANES.MID]: 'Mid', [LANES.JUNGLE]: 'Jungle' };
const SLOT_NAMES = { ally: 'Your pick', enemy: 'Enemy pick', allyBans: 'Your ban', enemyBans: 'Enemy ban' };
const BUTTON = 'inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-white/10 bg-slate-800/80 text-[11px] font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400';
// Pick slots stay small until desktop so the board fits above the hero picker on phones and tablets.
const SLOT_WIDTH = 'max-w-[64px] lg:max-w-[84px]';
const DROP_TARGET = 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-[#0f172a] scale-105';

const sameSlot = (a, b) => Boolean(a && b && a.group === b.group && a.index === b.index);
const slotName = (slot) => `${SLOT_NAMES[slot.group]} ${slot.index + 1}`;

function Segmented({ label, options, value, onChange, disabled = false }) {
    return (
        <div role="group" aria-label={label} className={`inline-flex rounded-md border border-white/10 overflow-hidden ${disabled ? 'opacity-40' : ''}`}>
            {options.map(option => (
                <button key={option.value} type="button" disabled={disabled} aria-pressed={option.value === value} onClick={() => onChange(option.value)}
                    className={`px-2.5 h-7 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 disabled:cursor-not-allowed ${option.value === value ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'}`}>
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export function Switch({ label, checked, onChange, title }) {
    return (
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={title}
            className="inline-flex items-center gap-2 h-8 px-2 rounded-md text-[11px] font-bold uppercase tracking-wide text-gray-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            <span className={`relative w-8 h-4 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
            </span>
            {label}
        </button>
    );
}

// Drag handlers shared by pick and ban slots: a filled slot can be dragged, and every slot accepts drops.
const slotDragProps = (drag, slot, heroId) => ({
    draggable: Boolean(heroId),
    onDragStart: heroId ? (e) => drag.onStart(e, slot, heroId) : undefined,
    onDragEnd: drag.onEnd,
    onDragOver: (e) => drag.onOver(e, slot),
    onDragLeave: () => drag.onLeave(slot),
    onDrop: (e) => drag.onDrop(e, slot),
});

function PickSlot({ heroId, slot, active, team, drag, onSelect, onClear }) {
    const filledBorder = team === 'ally' ? 'border-cyan-500/70' : 'border-red-500/70';
    const isDropTarget = sameSlot(drag.overSlot, slot);
    return (
        <div className={`relative w-full mx-auto rounded-xl transition-transform ${SLOT_WIDTH} ${isDropTarget ? DROP_TARGET : ''} ${heroId ? 'cursor-grab active:cursor-grabbing' : ''}`} {...slotDragProps(drag, slot, heroId)}>
            <button type="button" onClick={() => onSelect(slot)} aria-pressed={active}
                aria-label={heroId ? `${slotName(slot)}: ${heroName(heroId)}` : `${slotName(slot)}: empty`}
                className={`w-full aspect-square rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${heroId ? `bg-slate-800 ${filledBorder}` : 'bg-slate-900/60 border-dashed border-white/15 text-white/25'} ${active ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#0f172a]' : ''}`}>
                {heroId ? <HeroAvatar heroId={heroId} size="fill" className="w-full h-full pointer-events-none" showTooltip={false} /> : <Icons.Plus size={18} />}
            </button>
            {heroId && (
                <button type="button" onClick={() => onClear(slot)} aria-label={`Remove ${heroName(heroId)}`}
                    className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-slate-950 border border-white/25 text-gray-300 hover:text-white hover:bg-red-600 flex items-center justify-center text-sm leading-none">
                    ×
                </button>
            )}
        </div>
    );
}

function BanSlot({ heroId, slot, active, drag, onSelect }) {
    const isDropTarget = sameSlot(drag.overSlot, slot);
    return (
        <div className={`rounded-md transition-transform ${isDropTarget ? DROP_TARGET : ''} ${heroId ? 'cursor-grab active:cursor-grabbing' : ''}`} {...slotDragProps(drag, slot, heroId)}>
            <button type="button" onClick={() => onSelect(slot)} aria-pressed={active}
                aria-label={heroId ? `${slotName(slot)}: ${heroName(heroId)}` : `${slotName(slot)}: empty`}
                className={`w-7 h-7 lg:w-9 lg:h-9 rounded-md border overflow-hidden flex items-center justify-center shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${heroId ? 'border-white/20' : 'border-dashed border-white/15 bg-slate-900/60'} ${active ? 'ring-2 ring-yellow-400' : ''}`}>
                {heroId
                    ? <HeroAvatar heroId={heroId} size="fill" className="w-full h-full grayscale pointer-events-none" showTooltip={false} />
                    : <span className="text-[10px] text-white/20">—</span>}
            </button>
        </div>
    );
}

function TeamRow({ team, title, draftState, enemyLanes, drag }) {
    const { draft, activeSlot } = draftState;
    const banGroup = team === 'ally' ? 'allyBans' : 'enemyBans';
    const accent = team === 'ally' ? 'text-cyan-400' : 'text-red-400';
    const dot = team === 'ally' ? 'bg-cyan-400' : 'bg-red-400';

    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`}></span>
                    <h3 className={`text-[11px] font-bold uppercase tracking-widest whitespace-nowrap ${accent}`}>{title}</h3>
                    {draft.firstPick === team && <span className="text-[9px] uppercase tracking-wider text-gray-400 border border-white/10 rounded px-1 whitespace-nowrap">1st pick</span>}
                </div>
                {draft[banGroup].length > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 mr-0.5">Bans</span>
                        {draft[banGroup].map((heroId, index) => (
                            <BanSlot key={index} heroId={heroId} slot={{ group: banGroup, index }} active={sameSlot(activeSlot, { group: banGroup, index })} drag={drag} onSelect={draftState.selectSlot} />
                        ))}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-5 gap-2 lg:gap-4">
                {draft[team].map((heroId, index) => (
                    <div key={index} className="min-w-0 flex flex-col items-center gap-1">
                        <PickSlot heroId={heroId} slot={{ group: team, index }} team={team} active={sameSlot(activeSlot, { group: team, index })} drag={drag} onSelect={draftState.selectSlot} onClear={draftState.clearSlot} />
                        <div className="hidden lg:block h-4 max-w-full truncate text-[10px] font-semibold text-gray-300">{heroId ? heroName(heroId) : ''}</div>
                        {team === 'enemy' && (heroId ? (
                            <select aria-label={`Lane for ${heroName(heroId)}`} value={draft.enemyLanes[index] || ''} onChange={(e) => draftState.setEnemyLane(index, e.target.value || null)}
                                className={`w-full h-6 bg-slate-800 border border-white/10 rounded text-[10px] text-gray-300 px-1 focus:outline-none focus:border-cyan-500 ${SLOT_WIDTH}`}>
                                <option value="">{enemyLanes[index] ? `${LANE_SHORT[enemyLanes[index]]} (auto)` : 'Lane'}</option>
                                {Object.values(LANES).map(lane => <option key={lane} value={lane}>{LANE_SHORT[lane]}</option>)}
                            </select>
                        ) : <div className="h-6" aria-hidden="true"></div>)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DraftBoard({ draftState, enemyLanes, drag, defaultBanCount }) {
    const { draft, activeSlot, canUndo } = draftState;
    const [showSettings, setShowSettings] = useState(false);
    const activeHero = activeSlot ? draft[activeSlot.group][activeSlot.index] : null;
    const bansOn = draft.bansPerTeam > 0;

    return (
        <section aria-label="Draft board" className="px-3 py-3 lg:px-8 lg:pt-6 lg:pb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-400 min-w-0" aria-live="polite">
                    {activeSlot ? (
                        <><span className="text-yellow-300 font-bold">{activeHero ? 'Replacing' : 'Next'}:</span> {slotName(activeSlot)}{activeHero ? ` (${heroName(activeHero)})` : ''}</>
                    ) : 'Draft complete. Tap any slot to change it.'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                    {activeHero && <button type="button" onClick={() => draftState.clearSlot(activeSlot)} className={BUTTON}>Remove</button>}
                    <Switch label="Bans" checked={bansOn} onChange={draftState.setBanPhase} title={bansOn ? 'Turn off the ban phase' : 'Turn on the ban phase'} />
                    <button type="button" onClick={() => setShowSettings(open => !open)} aria-expanded={showSettings} aria-label="Draft settings" className={BUTTON}><Icons.Sliders size={12} /><span className="hidden sm:inline">Settings</span></button>
                    <button type="button" onClick={draftState.undo} disabled={!canUndo} aria-label="Undo" className={BUTTON}><Icons.RotateCcw size={12} /><span className="hidden sm:inline">Undo</span></button>
                    <button type="button" onClick={draftState.newDraft} className={BUTTON}>New</button>
                </div>
            </div>

            {showSettings && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-400 bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">First pick
                        <Segmented label="First pick" value={draft.firstPick} onChange={draftState.setFirstPick} options={[{ value: 'ally', label: 'Your team' }, { value: 'enemy', label: 'Enemy' }]} />
                    </div>
                    <div className="flex items-center gap-2">Bans per team
                        <Segmented label="Bans per team" value={bansOn ? draft.bansPerTeam : defaultBanCount} onChange={draftState.setBansPerTeam} disabled={!bansOn} options={BAN_COUNTS.map(count => ({ value: count, label: String(count) }))} />
                    </div>
                    <span className="text-[10px] text-gray-500">{bansOn ? 'Use the numbers your draft screen shows.' : 'Turn on Bans to set how many each team gets.'}</span>
                </div>
            )}

            <TeamRow team="ally" title="Your team" draftState={draftState} enemyLanes={enemyLanes} drag={drag} />
            <TeamRow team="enemy" title="Enemy" draftState={draftState} enemyLanes={enemyLanes} drag={drag} />
        </section>
    );
}
