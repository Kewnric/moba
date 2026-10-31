import { useMemo, useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { TIERS, TIER_COLORS, TIER_LABELS, TIER_POINTS } from '../data/tiers.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { categoriesOf, groupsOfHero } from '../lib/skillGroups.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar, { heroName } from '../components/HeroAvatar.jsx';
import { EmptyState, LaneChips, SearchField, TierButtons } from '../components/ui.jsx';

const UNRATE = 'unrate';
const COMFORT_LABELS = { 1: 'Rarely play', 2: 'Learning', 3: 'Comfortable', 4: 'Strong', 5: 'Main' };
const OPPONENTS = HEROES.length - 1;
// Drag data types, so files or text dragged in from elsewhere are ignored.
const HERO_DRAG = 'application/x-jungleros-rate-hero';
const GROUP_DRAG = 'application/x-jungleros-rate-group';

const dragKind = (e) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(GROUP_DRAG)) return 'group';
    if (types.includes(HERO_DRAG)) return 'hero';
    return null;
};

function RosterRail({ junglers, comfort, tiersByJungler, selectedId, onSelect, onAdd }) {
    const [search, setSearch] = useState('');
    const query = search.trim().toLowerCase();
    const sorted = [...junglers]
        .filter((id) => !query || heroName(id).toLowerCase().includes(query))
        .sort((a, b) => ((comfort[b] || 0) - (comfort[a] || 0)) || heroName(a).localeCompare(heroName(b)));

    return (
        <aside aria-label="Your junglers" className="lg:w-[216px] lg:shrink-0 bg-ink-2 border-b lg:border-b-0 lg:border-r border-line flex flex-col min-h-0">
            <div className="hidden lg:block p-3 space-y-2 border-b border-line">
                <div className="flex items-center justify-between gap-2">
                    <span className="tab-cut">Junglers · {junglers.length}</span>
                    <button type="button" onClick={onAdd} aria-label="Add a jungler to your roster" title="Add a jungler" className="btn !min-h-[2rem] !px-2"><Icons.Plus size={15} /></button>
                </div>
                <SearchField value={search} onChange={setSearch} placeholder="Find" label="Find a jungler" />
            </div>
            <ul className="flex lg:block gap-1 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:flex-1 scroll-thin scrollbar-hide lg:scrollbar-auto p-1.5 lg:p-0">
                <li className="lg:hidden shrink-0">
                    <button type="button" onClick={onAdd} aria-label="Add a jungler to your roster" className="btn w-12 h-12 !px-0"><Icons.Plus size={16} /></button>
                </li>
                {sorted.map((id) => {
                    const rated = Object.keys(tiersByJungler[id] || {}).length;
                    const selected = id === selectedId;
                    return (
                        <li key={id} className="shrink-0">
                            <button type="button" onClick={() => onSelect(id)} aria-current={selected ? 'true' : undefined}
                                className={`flex items-center gap-2 w-12 lg:w-full lg:px-2 lg:py-1.5 text-left transition-colors ${selected ? 'outline outline-2 -outline-offset-2 outline-accent lg:outline-0 lg:bg-ink-4' : 'lg:hover:bg-ink-3'}`}>
                                <HeroAvatar heroId={id} className="w-12 h-12 lg:w-9 lg:h-9 shrink-0" />
                                <span className="hidden lg:block min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-fg truncate leading-tight">{heroName(id)}</span>
                                    <span className="flex items-center gap-2 mt-0.5">
                                        <span className="inline-flex gap-[2px]" aria-label={comfort[id] ? `Comfort ${comfort[id]} of 5` : 'Comfort not set'}>
                                            {[1, 2, 3, 4, 5].map((level) => <span key={level} className={`w-[5px] h-[5px] ${comfort[id] && level <= comfort[id] ? 'bg-accent' : 'bg-ink-4'}`} />)}
                                        </span>
                                        <span className="text-[11.5px] text-fg-faint tabular-nums">{rated}/{OPPONENTS}</span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}

// A hero in a tier row. A dashed outline and tag mean the tier comes from a skill group.
function HeroTile({ heroId, rating, note, onDragStart, onDragEnd, onTap }) {
    const fromGroup = rating.source === 'group';
    const title = fromGroup
        ? `${heroName(heroId)}: ${TIER_LABELS[rating.tier]}, from ${rating.groupName}. Tap to rate this hero directly.`
        : `${heroName(heroId)}: ${TIER_LABELS[rating.tier]}${rating.overrides ? `. Your rating replaces ${rating.overrides.groupName} (${rating.overrides.tier}).` : ''}`;
    return (
        <button type="button" draggable onDragStart={(e) => onDragStart(e, heroId)} onDragEnd={onDragEnd} onClick={() => onTap(heroId)} title={title}
            className="relative w-[56px] lg:w-[60px] text-center cursor-grab active:cursor-grabbing">
            <div className={`relative ${fromGroup ? 'outline outline-1 outline-dashed outline-fg-muted -outline-offset-1' : ''}`}>
                <HeroAvatar heroId={heroId} className="w-full aspect-square pointer-events-none" />
                {fromGroup && <span className="absolute bottom-0 inset-x-0 text-[10.5px] leading-[14px] font-semibold text-center truncate px-0.5 bg-ink/90 text-fg">{rating.groupName}</span>}
                {rating.overrides && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent" aria-hidden="true" />}
                {note && <span className="absolute top-0 left-0 w-4 h-4 flex items-center justify-center bg-ink/90 text-accent"><Icons.MessageSquare size={10} /></span>}
            </div>
            <span className="block text-[11.5px] leading-tight text-fg-muted truncate mt-0.5">{heroName(heroId)}</span>
        </button>
    );
}

function GroupChip({ group, onDragStart, onDragEnd, onRemove }) {
    return (
        <div draggable onDragStart={(e) => onDragStart(e, group.id)} onDragEnd={onDragEnd} title={`All ${group.heroIds.length} heroes in ${group.name} get this tier, unless you rated one directly.`}
            className="self-start flex items-center gap-1.5 pl-2 pr-1 h-9 bg-ink-4 border border-line-strong cursor-grab active:cursor-grabbing">
            <Icons.Layers size={13} className="text-accent shrink-0" />
            <span className="label text-[13px] normal-case tracking-normal text-fg whitespace-nowrap">{group.name}</span>
            <span className="label text-fg-faint tabular-nums">{group.heroIds.length}</span>
            <button type="button" onClick={() => onRemove(group.id)} aria-label={`Remove the rating for ${group.name}`} className="w-6 h-6 flex items-center justify-center text-fg-muted hover:text-fg"><Icons.X size={13} /></button>
        </div>
    );
}

function TierRow({ tier, groups, heroes, notes, isDropTarget, dropProps, chipDrag, onRemoveGroup, heroDrag, onHeroTap, quick, onToggleQuick }) {
    return (
        <div {...dropProps} className={`flex border transition-colors ${isDropTarget ? 'border-accent drop-target' : 'border-line'}`}>
            <button type="button" onClick={onToggleQuick} aria-pressed={quick} title={`Tap heroes to rate them ${TIER_LABELS[tier]}`}
                className={`w-16 lg:w-20 shrink-0 flex flex-col items-center justify-center gap-1 py-2 ${TIER_COLORS[tier]} ${quick ? 'outline outline-[3px] -outline-offset-[3px] outline-fg' : ''}`}>
                <span className="display text-3xl lg:text-4xl">{tier}</span>
                <span className="label text-[11px] text-center leading-none px-1">{TIER_LABELS[tier]}</span>
            </button>
            <div className="flex-1 min-w-0 p-2 flex flex-wrap gap-2 content-start min-h-[92px]">
                {groups.map((group) => <GroupChip key={group.id} group={group} onDragStart={chipDrag.onStart} onDragEnd={chipDrag.onEnd} onRemove={onRemoveGroup} />)}
                {heroes.map(([heroId, rating]) => <HeroTile key={heroId} heroId={heroId} rating={rating} note={notes[heroId] && (notes[heroId].quickNote || notes[heroId].comment)} onDragStart={heroDrag.onStart} onDragEnd={heroDrag.onEnd} onTap={onHeroTap} />)}
                {!groups.length && !heroes.length && <span className="self-center w-full text-center text-sm text-fg-faint pointer-events-none">{isDropTarget ? `Drop to rate ${TIER_LABELS[tier]}` : 'Drop a skill group or hero here'}</span>}
            </div>
        </div>
    );
}

function GroupCard({ group, tier, junglerName, onDragStart, onDragEnd, onSetTier, onClearTier }) {
    return (
        <li draggable onDragStart={(e) => onDragStart(e, group.id)} onDragEnd={onDragEnd} title={`Drag onto a tier to rate all of ${group.name} for ${junglerName}`}
            className="p-2 bg-ink-3 border border-line cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-fg truncate">{group.name}</span>
                <span className="label text-fg-faint tabular-nums">{group.heroIds.length}</span>
            </div>
            <div className="flex gap-[3px] mt-1.5 h-7 overflow-hidden">
                {group.heroIds.slice(0, 8).map((heroId) => <HeroAvatar key={heroId} heroId={heroId} className="w-7 h-7 shrink-0 pointer-events-none" />)}
                {group.heroIds.length === 0 && <span className="text-xs text-fg-faint self-center">No heroes yet</span>}
                {group.heroIds.length > 8 && <span className="label text-fg-faint self-center pl-0.5">+{group.heroIds.length - 8}</span>}
            </div>
            <div className="mt-2">
                <TierButtons compact value={tier} label={`Rate ${group.name}`} onChange={(next) => (next === tier ? onClearTier(group.id) : onSetTier(group.id, next))} />
            </div>
        </li>
    );
}

export default function TierListView({ data, tiersByJungler, junglerId, setJunglerId, dispatch, onAddJungler, onRemoveJungler, onCopyTierList, onClearTierList, onOpenMatchup, onOpenSkills }) {
    const { junglers, matchups, skillGroups = [], groupRatings = {} } = data;
    const comfort = data.comfort || {};
    const [panel, setPanel] = useState('groups');
    const [search, setSearch] = useState('');
    const [lane, setLane] = useState('All');
    const [groupFilter, setGroupFilter] = useState('');
    const [quickTier, setQuickTier] = useState(null); // the tier a tapped hero gets, or UNRATE
    const [dragOverTier, setDragOverTier] = useState(null);
    const [dragFromBoard, setDragFromBoard] = useState(false);
    const [notice, setNotice] = useState(null);

    const tiers = (junglerId && tiersByJungler[junglerId]) || {};
    const notes = (junglerId && matchups[junglerId]) || {};
    const ownGroups = (junglerId && groupRatings[junglerId]) || {};
    const comfortLevel = (junglerId && comfort[junglerId]) || null;
    const ratedCount = Object.keys(tiers).length;
    const categories = useMemo(() => categoriesOf(skillGroups), [skillGroups]);

    const rate = (enemyId, tier) => dispatch({ type: 'setTier', junglerId, enemyId, tier });
    const unrate = (enemyId) => {
        dispatch({ type: 'clearTier', junglerId, enemyId });
        const rating = tiers[enemyId];
        if (rating && (rating.source === 'group' || rating.overrides)) {
            const from = rating.source === 'group' ? rating.groupName : rating.overrides.groupName;
            setNotice(`${heroName(enemyId)} keeps its tier from ${from}. Remove that group's rating, or take the hero out of the group in Skills.`);
        }
    };
    const setGroupTier = (groupId, tier) => dispatch({ type: 'setGroupTier', junglerId, groupId, tier });
    const clearGroupTier = (groupId) => dispatch({ type: 'clearGroupTier', junglerId, groupId });

    const heroesInPanel = filterHeroes(HEROES, { lane, search, hideIds: [junglerId, ...Object.keys(tiers)] })
        .filter((hero) => !groupFilter || groupsOfHero(skillGroups, hero.id).some((group) => group.id === groupFilter));

    const endDrag = () => {
        setDragOverTier(null);
        setDragFromBoard(false);
    };

    const startDrag = (type, fromBoard) => (e, id) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(type, id);
        // Changing the page while the browser is still starting the drag can cancel it, so wait a tick.
        if (fromBoard) setTimeout(() => setDragFromBoard(true), 0);
    };

    const tierDropProps = (tier) => ({
        onDragOver: (e) => {
            if (!dragKind(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverTier !== tier) setDragOverTier(tier);
        },
        onDragLeave: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget) && dragOverTier === tier) setDragOverTier(null);
        },
        onDrop: (e) => {
            const kind = dragKind(e);
            if (!kind) return;
            e.preventDefault();
            if (kind === 'group') setGroupTier(e.dataTransfer.getData(GROUP_DRAG), tier);
            else rate(e.dataTransfer.getData(HERO_DRAG), tier);
            endDrag();
        },
    });

    const handleDropOnPanel = (e) => {
        const kind = dragKind(e);
        if (!kind || !dragFromBoard) return;
        e.preventDefault();
        if (kind === 'group') clearGroupTier(e.dataTransfer.getData(GROUP_DRAG));
        else unrate(e.dataTransfer.getData(HERO_DRAG));
        endDrag();
    };

    const handleHeroTap = (heroId) => {
        if (quickTier === UNRATE) unrate(heroId);
        else if (quickTier) rate(heroId, quickTier);
        else onOpenMatchup(heroId);
    };

    const toggleQuick = (tier) => {
        setQuickTier((current) => (current === tier ? null : tier));
        setPanel('heroes');
    };

    const roster = <RosterRail junglers={junglers} comfort={comfort} tiersByJungler={tiersByJungler} selectedId={junglerId} onSelect={setJunglerId} onAdd={onAddJungler} />;

    if (!junglerId) {
        return (
            <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row animate-fadeIn">
                {roster}
                <div className="flex-1 flex items-center justify-center">
                    <EmptyState icon={Icons.Layers} title="Choose a jungler">Pick a jungler, then drag skill groups or heroes onto S to D. These tiers are the only ratings JunglerOS uses.</EmptyState>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row animate-fadeIn">
            {roster}

            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row scroll-thin">
                <div className="lg:flex-1 lg:min-w-0 lg:overflow-y-auto scroll-thin">
                    <header className="p-3 lg:p-5 bg-ink-2 border-b border-line">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <HeroAvatar heroId={junglerId} className="w-12 h-12 shrink-0" />
                                <div className="min-w-0">
                                    <h1 className="display text-2xl lg:text-3xl truncate">{heroName(junglerId)}</h1>
                                    <p className="text-xs text-fg-muted tabular-nums">{ratedCount} of {OPPONENTS} rated. Unrated counts as Even ({TIER_POINTS.B}).</p>
                                </div>
                            </div>
                            <div role="group" aria-label={`How comfortable you are playing ${heroName(junglerId)}`} className="flex items-center gap-1">
                                <span className="label text-fg-faint mr-1">Comfort</span>
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <button key={level} type="button" aria-pressed={comfortLevel === level} title={COMFORT_LABELS[level]} onClick={() => dispatch({ type: 'setComfort', junglerId, comfort: comfortLevel === level ? null : level })}
                                        className={`w-8 h-8 display text-[15px] transition-colors ${comfortLevel && level <= comfortLevel ? 'bg-accent text-accent-on' : 'tier-off'}`}>{level}</button>
                                ))}
                                <span className="text-xs text-fg-muted ml-1 w-[5.5rem]">{comfortLevel ? COMFORT_LABELS[comfortLevel] : 'Not set'}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                                <button type="button" onClick={onCopyTierList} className="btn btn-quiet" title="Copy another jungler's tier list onto this one"><Icons.Copy size={14} /> Copy from</button>
                                <button type="button" onClick={onClearTierList} className="btn btn-quiet" disabled={ratedCount === 0}>Clear</button>
                                <button type="button" onClick={onRemoveJungler} aria-label={`Remove ${heroName(junglerId)} from your roster`} title="Remove from roster" className="btn btn-quiet !px-2"><Icons.Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div className="h-[3px] bg-ink-4 mt-3" aria-hidden="true"><div className="h-full bg-accent transition-all" style={{ width: `${(ratedCount / OPPONENTS) * 100}%` }} /></div>
                    </header>

                    {notice && (
                        <div role="status" className="mx-3 lg:mx-5 mt-3 flex items-start gap-2 border border-accent px-3 py-2 text-sm">
                            <Icons.Info size={15} className="text-accent shrink-0 mt-0.5" />
                            <span className="flex-1">{notice}</span>
                            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-fg-muted hover:text-fg"><Icons.X size={15} /></button>
                        </div>
                    )}

                    <div className="p-3 lg:p-5 space-y-1.5">
                        {TIERS.map((tier) => (
                            <TierRow key={tier} tier={tier}
                                groups={skillGroups.filter((group) => ownGroups[group.id] === tier)}
                                heroes={Object.entries(tiers).filter(([, rating]) => rating.tier === tier).sort(([a], [b]) => heroName(a).localeCompare(heroName(b)))}
                                notes={notes}
                                isDropTarget={dragOverTier === tier}
                                dropProps={tierDropProps(tier)}
                                chipDrag={{ onStart: startDrag(GROUP_DRAG, true), onEnd: endDrag }}
                                onRemoveGroup={clearGroupTier}
                                heroDrag={{ onStart: startDrag(HERO_DRAG, true), onEnd: endDrag }}
                                onHeroTap={handleHeroTap}
                                quick={quickTier === tier}
                                onToggleQuick={() => toggleQuick(tier)} />
                        ))}
                        <p className="text-xs text-fg-faint pt-1">A dashed hero takes its tier from a skill group. In two rated groups the worse tier wins, and rating a hero directly always beats its groups.</p>
                    </div>
                </div>

                <aside aria-label="Skill groups and heroes" onDragOver={(e) => { if (dragKind(e) && dragFromBoard) e.preventDefault(); }} onDrop={handleDropOnPanel}
                    className={`lg:w-[320px] lg:shrink-0 bg-ink-2 border-t lg:border-t-0 lg:border-l border-line flex flex-col lg:min-h-0 ${dragFromBoard ? 'drop-target' : ''}`}>
                    <div className="p-3 border-b border-line space-y-2">
                        <div role="tablist" aria-label="Rate by" className="flex gap-1">
                            <button type="button" role="tab" aria-selected={panel === 'groups'} onClick={() => setPanel('groups')} className={`flex-1 btn ${panel === 'groups' ? 'btn-primary' : ''}`}><Icons.Layers size={14} /> Skill groups</button>
                            <button type="button" role="tab" aria-selected={panel === 'heroes'} onClick={() => setPanel('heroes')} className={`flex-1 btn ${panel === 'heroes' ? 'btn-primary' : ''}`}>Heroes</button>
                        </div>
                        {dragFromBoard && <p className="label text-accent text-center">Drop here to remove the rating</p>}
                    </div>

                    {panel === 'groups' ? (
                        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto scroll-thin p-3 space-y-3">
                            <p className="text-xs text-fg-muted">Drag a group onto a tier, or tap its letter, to rate every hero in it at once for {heroName(junglerId)}.</p>
                            {categories.map(({ category, groups }) => (
                                <div key={category}>
                                    <div className="label text-fg-faint mb-1.5">{category}</div>
                                    <ul className="space-y-1.5">
                                        {groups.map((group) => (
                                            <GroupCard key={group.id} group={group} tier={ownGroups[group.id] || null} junglerName={heroName(junglerId)}
                                                onDragStart={startDrag(GROUP_DRAG, false)} onDragEnd={endDrag} onSetTier={setGroupTier} onClearTier={clearGroupTier} />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            {skillGroups.length === 0 && <p className="text-sm text-fg-muted">You don't have any skill groups yet.</p>}
                            <button type="button" onClick={onOpenSkills} className="btn w-full"><Icons.Plus size={14} /> Create or edit groups</button>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 space-y-2 border-b border-line">
                                <div role="group" aria-label="Rate tapped heroes as" className="flex items-center gap-1.5 flex-wrap">
                                    <span className="label text-fg-faint mr-0.5">Tap to rate</span>
                                    {TIERS.map((tier) => (
                                        <button key={tier} type="button" aria-pressed={quickTier === tier} title={TIER_LABELS[tier]} onClick={() => setQuickTier((current) => (current === tier ? null : tier))}
                                            className={`w-8 h-8 display text-[15px] transition-all ${quickTier === tier ? `${TIER_COLORS[tier]} outline outline-2 outline-offset-1 outline-fg` : 'tier-off'}`}>{tier}</button>
                                    ))}
                                    <button type="button" aria-pressed={quickTier === UNRATE} onClick={() => setQuickTier((current) => (current === UNRATE ? null : UNRATE))} className="chip">Unrate</button>
                                </div>
                                {quickTier && <p className="text-xs text-accent" aria-live="polite">{quickTier === UNRATE ? 'Tap rated heroes to remove their rating.' : `Tap heroes to rate them ${TIER_LABELS[quickTier]}.`}</p>}
                                <SearchField value={search} onChange={setSearch} placeholder="Search unrated heroes" label="Search unrated heroes" />
                                <LaneChips value={lane} onChange={setLane} />
                                {skillGroups.length > 0 && (
                                    <select aria-label="Only show heroes in a skill group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="field !min-h-[2.25rem]">
                                        <option value="">All skill groups</option>
                                        {skillGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto scroll-thin p-2">
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
                                    {heroesInPanel.map((hero) => (
                                        <button key={hero.id} type="button" draggable onDragStart={(e) => startDrag(HERO_DRAG, false)(e, hero.id)} onDragEnd={endDrag} onClick={() => handleHeroTap(hero.id)} title={hero.name}
                                            className={`p-1 text-center cursor-grab active:cursor-grabbing transition-colors hover:bg-ink-4 ${quickTier && quickTier !== UNRATE ? 'outline outline-1 -outline-offset-1 outline-accent' : ''}`}>
                                            <HeroAvatar heroId={hero.id} className="w-full aspect-square pointer-events-none" />
                                            <span className="block text-[11.5px] leading-tight text-fg-muted truncate mt-1">{hero.name}</span>
                                        </button>
                                    ))}
                                </div>
                                {heroesInPanel.length === 0 && <p className="p-6 text-center text-sm text-fg-muted">No unrated heroes match.</p>}
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
