import { useState } from 'react';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import { Segmented, Switch } from './ui.jsx';

const BAN_COUNTS = [3, 4, 5];
const SLOT_NAMES = { ally: 'Your pick', enemy: 'Enemy pick', allyBans: 'Your ban', enemyBans: 'Enemy ban' };

const sameSlot = (a, b) => Boolean(a && b && a.group === b.group && a.index === b.index);
const slotName = (slot) => `${SLOT_NAMES[slot.group]} ${slot.index + 1}`;

// Drag handlers shared by pick and ban slots: a filled slot can be dragged, and every slot accepts drops.
const slotDragProps = (drag, slot, heroId) => ({
    draggable: Boolean(heroId),
    onDragStart: heroId ? (e) => drag.onStart(e, slot, heroId) : undefined,
    onDragEnd: drag.onEnd,
    onDragOver: (e) => drag.onOver(e, slot),
    onDragLeave: () => drag.onLeave(slot),
    onDrop: (e) => drag.onDrop(e, slot),
});

function PickSlot({ heroId, slot, active, team, drag, onSelect, onClear, isJungler, onToggleJungler }) {
    const filledBorder = team === 'ally' ? 'border-ally' : 'border-enemy';
    const isDropTarget = sameSlot(drag.overSlot, slot);
    return (
        <div className="min-w-0 flex flex-col items-center gap-1">
            <div className={`relative w-full max-w-[64px] lg:max-w-[88px] transition-transform ${isDropTarget ? 'drop-target scale-105' : ''} ${heroId ? 'cursor-grab active:cursor-grabbing' : ''}`} {...slotDragProps(drag, slot, heroId)}>
                <button type="button" onClick={() => onSelect(slot)} aria-pressed={active} aria-label={heroId ? `${slotName(slot)}: ${heroName(heroId)}` : `${slotName(slot)}: empty`}
                    className={`w-full aspect-square border-2 flex items-center justify-center overflow-hidden transition-colors ${heroId ? `bg-ink-3 ${filledBorder}` : 'bg-ink-2 border-dashed border-line-strong text-fg-faint hover:text-fg hover:border-fg-muted'} ${active ? 'slot-active border-transparent' : ''}`}>
                    {heroId ? <HeroAvatar heroId={heroId} className="w-full h-full pointer-events-none" /> : <span className="display text-xl lg:text-2xl">{slot.index + 1}</span>}
                </button>
                {heroId && (
                    <button type="button" onClick={() => onClear(slot)} aria-label={`Remove ${heroName(heroId)}`}
                        className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-ink border border-line-strong text-fg-muted hover:text-fg hover:bg-enemy flex items-center justify-center">
                        <Icons.X size={12} />
                    </button>
                )}
                {isJungler && <span className="absolute bottom-0 inset-x-0 label text-[11px] text-center bg-accent text-accent-on pointer-events-none">Jungler</span>}
            </div>
            <div className="w-full text-center h-[1.1rem] label text-[12px] text-fg-muted truncate normal-case tracking-normal">{heroId ? heroName(heroId) : ''}</div>
            {team === 'enemy' && (
                heroId
                    ? <button type="button" aria-pressed={isJungler} onClick={() => onToggleJungler(heroId)} title="Mark as their jungler. That matchup then counts 1.5 times."
                        className={`w-full max-w-[64px] lg:max-w-[88px] h-6 label text-[11px] border transition-colors ${isJungler ? 'bg-accent border-accent text-accent-on' : 'border-line text-fg-faint hover:text-fg hover:border-line-strong'}`}>JG</button>
                    : <div className="h-6" aria-hidden="true" />
            )}
        </div>
    );
}

function BanSlot({ heroId, slot, active, drag, onSelect, onClear }) {
    const isDropTarget = sameSlot(drag.overSlot, slot);
    return (
        <div className={`relative shrink-0 ${isDropTarget ? 'drop-target' : ''} ${heroId ? 'cursor-grab active:cursor-grabbing' : ''}`} {...slotDragProps(drag, slot, heroId)}>
            <button type="button" onClick={() => (active && heroId ? onClear(slot) : onSelect(slot))} aria-pressed={active} aria-label={heroId ? `${slotName(slot)}: ${heroName(heroId)}` : `${slotName(slot)}: empty`}
                className={`w-8 h-8 lg:w-9 lg:h-9 border overflow-hidden flex items-center justify-center ${heroId ? 'border-line-strong' : 'border-dashed border-line text-fg-faint hover:border-line-strong'} ${active ? 'slot-active border-transparent' : ''}`}>
                {heroId ? <HeroAvatar heroId={heroId} className="w-full h-full grayscale pointer-events-none" /> : <Icons.X size={12} />}
            </button>
        </div>
    );
}

function BanStrip({ draftState, drag, onSelect }) {
    const { draft, activeSlot } = draftState;
    const first = `${draft.firstPick}Bans`;
    const second = first === 'allyBans' ? 'enemyBans' : 'allyBans';
    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="label text-fg-faint shrink-0">Bans</span>
            {[first, second].map((group, groupIndex) => (
                <div key={group} className={`flex gap-1 ${groupIndex ? 'pl-2 border-l border-line-strong' : ''}`}>
                    {draft[group].map((heroId, index) => (
                        <BanSlot key={index} heroId={heroId} slot={{ group, index }} active={sameSlot(activeSlot, { group, index })} drag={drag} onSelect={onSelect} onClear={draftState.clearSlot} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default function DraftBoard({ draftState, enemyOnly, defaultBanCount, drag, onSelectSlot, skills, voice, voiceBar }) {
    const { draft, activeSlot, canUndo } = draftState;
    const [showSettings, setShowSettings] = useState(false);
    const bansOn = draft.bansPerTeam > 0;
    const team = (group) => (
        <div className="grid grid-cols-5 gap-2 lg:gap-3 max-w-[520px]">
            {draft[group].map((heroId, index) => (
                <PickSlot key={index} heroId={heroId} slot={{ group, index }} team={group} active={sameSlot(activeSlot, { group, index })} drag={drag} onSelect={onSelectSlot} onClear={draftState.clearSlot}
                    isJungler={group === 'enemy' && Boolean(heroId) && draft.enemyJungler === heroId} onToggleJungler={draftState.toggleEnemyJungler} />
            ))}
        </div>
    );

    return (
        <>
        {/* Always pinned while you scroll. On PC the controls stay with the slots; on phones only the slots do. */}
        <div className="contents lg:block lg:sticky lg:top-0 lg:z-20">
        <div className="px-3 pt-3 lg:px-5 lg:pt-4 space-y-3 bg-ink-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="tab-cut tab-cut-enemy">Enemy lineup</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Switch label="Your team" checked={!enemyOnly} onChange={(on) => draftState.setEnemyOnly(!on)} title={enemyOnly ? 'Enemy-only draft. Turn on to also track your team.' : 'Turn off for an enemy-only draft.'} />
                    <Switch label="Bans" checked={bansOn} onChange={draftState.setBanPhase} title={bansOn ? 'Turn off the ban phase' : 'Turn on the ban phase'} />
                    <Switch label="Voice" checked={voice.on} disabled={!voice.supported} onChange={voice.setOn} title={voice.supported ? 'Say hero names to fill slots' : 'Voice control needs Chrome or Edge'} />
                    <button type="button" onClick={() => setShowSettings((open) => !open)} aria-expanded={showSettings} aria-label="Draft settings" className="btn btn-quiet !px-2"><Icons.Sliders size={15} /></button>
                    <button type="button" onClick={draftState.undo} disabled={!canUndo} aria-label="Undo" title="Undo" className="btn btn-quiet !px-2"><Icons.RotateCcw size={15} /></button>
                    <button type="button" onClick={draftState.newDraft} className="btn !min-h-[2rem]">New</button>
                </div>
            </div>

            {showSettings && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 bg-ink-3 border border-line animate-fadeIn">
                    {!enemyOnly && (
                        <div className="flex items-center gap-2"><span className="label text-fg-muted">First pick</span>
                            <Segmented label="First pick" value={draft.firstPick} onChange={draftState.setFirstPick} options={[{ value: 'ally', label: 'Your team' }, { value: 'enemy', label: 'Enemy' }]} />
                        </div>
                    )}
                    <div className="flex items-center gap-2"><span className="label text-fg-muted">Bans per team</span>
                        <Segmented label="Bans per team" value={bansOn ? draft.bansPerTeam : defaultBanCount} onChange={draftState.setBansPerTeam} disabled={!bansOn} options={BAN_COUNTS.map((count) => ({ value: count, label: String(count) }))} />
                    </div>
                </div>
            )}
        </div>

        <section aria-label="Draft board" className="sticky top-0 z-20 lg:static px-3 py-3 lg:px-5 bg-ink-2 border-b border-line">
            {team('enemy')}
            {voiceBar}
        </section>
        </div>

        <div className={`px-3 lg:px-5 space-y-3 bg-ink-2 border-b border-line empty:hidden ${skills.length || bansOn || !enemyOnly ? 'py-3' : 'hidden'}`}>
            {skills.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" aria-label="Skills in the enemy lineup">
                    <span className="label text-fg-faint shrink-0">They have</span>
                    {skills.map(({ group, heroIds }) => (
                        <span key={group.id} title={heroIds.map(heroName).join(', ')} className="label text-[12px] px-2 py-0.5 bg-ink-4 text-fg shrink-0 normal-case tracking-normal">
                            {group.name}{heroIds.length > 1 ? ` ×${heroIds.length}` : ''}
                        </span>
                    ))}
                </div>
            )}

            {bansOn && <BanStrip draftState={draftState} drag={drag} onSelect={onSelectSlot} />}

            {!enemyOnly && (
                <div className="space-y-2 pt-1 border-t border-line">
                    <span className="tab-cut tab-cut-ally mt-2">Your team</span>
                    {team('ally')}
                </div>
            )}
        </div>
        </>
    );
}
