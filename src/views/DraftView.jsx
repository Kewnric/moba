import { useEffect, useMemo, useRef, useState } from 'react';
import { isBanSlot } from '../lib/draft.js';
import { graphOptions } from '../lib/scoring.js';
import { lineupSkills } from '../lib/skillGroups.js';
import { Icons } from '../components/Icons.jsx';
import { heroName } from '../components/HeroAvatar.jsx';
import DraftBoard from '../components/DraftBoard.jsx';
import GamePlanCard from '../components/GamePlanCard.jsx';
import HeroPicker from '../components/HeroPicker.jsx';
import RankingPanel from '../components/RankingPanel.jsx';
import StatSheet from '../components/StatSheet.jsx';

const TAKEN_LABELS = { ally: 'Ally', enemy: 'Enemy', allyBans: 'Banned', enemyBans: 'Banned' };
// Drag data types, so the board ignores files, links and text dragged in from elsewhere.
const HERO_TYPE = 'application/x-jungleros-hero';
const FROM_TYPE = 'application/x-jungleros-from';
const FROM_PICKER = 'picker';

const slotKey = (slot) => `${slot.group}:${slot.index}`;
const parseSlotKey = (key) => {
    const [group, index] = key.split(':');
    return { group, index: Number(index) };
};
const isHeroDrag = (e) => Array.from(e.dataTransfer.types).includes(HERO_TYPE);

// The live draft: enemy slots on top, your options and the chosen jungler's stat sheet under them, every jungler ranked beside it.
// Heroes can be tapped into the highlighted slot or dragged onto any slot; dragging a slot onto the hero list removes it.
export default function DraftView({ draftState, enemyOnly, defaultBanCount, comfortWeight, scoring, skillGroups, banIdeas, allyJunglers, onlyPool, setOnlyPool, safeOnly, setSafeOnly, hasPool, onSetTier, onSetComfort, onOpenTierLists, onOpenComfort, onEditNotes, resultLog, voice, voiceBar }) {
    const { draft, activeSlot } = draftState;
    const [viewedId, setViewedId] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [dragFrom, setDragFrom] = useState(null); // FROM_PICKER or a slot key while a hero is dragged
    const [overSlot, setOverSlot] = useState(null);
    const sheetRef = useRef(null);

    const takenLabels = useMemo(() => {
        const labels = {};
        Object.entries(TAKEN_LABELS).forEach(([group, label]) => {
            draft[group].forEach((heroId) => { if (heroId) labels[heroId] = label; });
        });
        return labels;
    }, [draft]);

    const enemyIds = draft.enemy.filter(Boolean);
    const skills = useMemo(() => lineupSkills(skillGroups, enemyIds), [skillGroups, enemyIds.join()]); // eslint-disable-line react-hooks/exhaustive-deps

    // Any new pick or ban can reorder everything, so go back to the top pick.
    const lineupKey = `${enemyIds.join()}|${scoring.unavailable.map((entry) => entry.id).join()}`;
    useEffect(() => { setViewedId(null); }, [lineupKey]);

    const { top } = scoring;
    const viewed = (viewedId && scoring.ranked.find((entry) => entry.id === viewedId)) || top;

    const options = graphOptions(scoring.ranked, viewed ? viewed.id : null);
    const rankOfViewed = viewed ? scoring.ranked.findIndex((entry) => entry.id === viewed.id) + 1 : null;

    const openOption = (id) => setViewedId(top && id === top.id ? null : id);

    // A locked-in jungler stays on the game plan even if a filter hides them, unless they're picked or banned.
    const lockedEntry = draft.lockedJungler && !scoring.unavailable.some((entry) => entry.id === draft.lockedJungler)
        ? scoring.entries.find((entry) => entry.id === draft.lockedJungler) || null
        : null;

    const selectEntry = (id) => {
        if (lockedEntry) draftState.setLocked(null);
        openOption(id);
        // On phones and small windows the list sits under the sheet, so bring the sheet into view.
        if (window.matchMedia('(max-width: 1279px)').matches && sheetRef.current) sheetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const selectSlot = (slot) => {
        draftState.selectSlot(slot);
        setPickerOpen(true);
    };

    const pick = (heroId) => {
        const fillingBans = enemyOnly && isBanSlot(activeSlot);
        draftState.pickHero(heroId);
        if (!fillingBans) setPickerOpen(false);
    };

    const startDrag = (e, from, heroId) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(HERO_TYPE, heroId);
        e.dataTransfer.setData(FROM_TYPE, from);
        // Changing the page while the browser is still starting the drag can cancel it, so wait a tick.
        setTimeout(() => setDragFrom(from), 0);
    };
    const endDrag = () => {
        setDragFrom(null);
        setOverSlot(null);
    };

    const drag = {
        overSlot,
        onStart: (e, slot, heroId) => startDrag(e, slotKey(slot), heroId),
        onEnd: endDrag,
        onOver: (e, slot) => {
            if (!isHeroDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!overSlot || slotKey(overSlot) !== slotKey(slot)) setOverSlot(slot);
        },
        onLeave: (slot) => {
            if (overSlot && slotKey(overSlot) === slotKey(slot)) setOverSlot(null);
        },
        onDrop: (e, slot) => {
            if (!isHeroDrag(e)) return;
            e.preventDefault();
            const heroId = e.dataTransfer.getData(HERO_TYPE);
            const from = e.dataTransfer.getData(FROM_TYPE);
            if (from === FROM_PICKER) draftState.placeHero(slot, heroId);
            else if (from) draftState.moveHero(parseSlotKey(from), slot);
            endDrag();
        },
    };

    const draggingFromSlot = Boolean(dragFrom) && dragFrom !== FROM_PICKER;

    const handleDropBack = (e) => {
        if (!isHeroDrag(e)) return;
        e.preventDefault();
        const from = e.dataTransfer.getData(FROM_TYPE);
        if (from && from !== FROM_PICKER) draftState.clearSlot(parseSlotKey(from));
        endDrag();
    };

    return (
        <div className="flex-1 min-w-0 min-h-0 flex">
            <HeroPicker open={pickerOpen} onClose={() => setPickerOpen(false)} activeSlot={activeSlot} takenLabels={takenLabels} banIdeas={banIdeas} onPick={pick}
                onChooseEnemySlot={(index) => draftState.selectSlot({ group: 'enemy', index })} onUndo={draftState.undo}
                dragging={draggingFromSlot} onDragStart={(e, heroId) => startDrag(e, FROM_PICKER, heroId)} onDragEnd={endDrag} onDropBack={handleDropBack} />

            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto scroll-thin xl:overflow-hidden xl:flex">
                <div className="xl:flex-1 xl:min-w-0 xl:overflow-y-auto scroll-thin">
                    <DraftBoard draftState={draftState} enemyOnly={enemyOnly} defaultBanCount={defaultBanCount} drag={drag} onSelectSlot={selectSlot} skills={skills} voice={voice} voiceBar={voiceBar} />

                    {allyJunglers.length > 0 && (
                        <p role="status" className="mx-3 lg:mx-5 mt-3 flex items-start gap-2 border border-accent px-3 py-2 text-sm text-fg">
                            <Icons.Info size={15} className="shrink-0 mt-0.5 text-accent" />
                            <span>Your team already has {allyJunglers.map(heroName).join(' and ')}, who usually {allyJunglers.length === 1 ? 'jungles' : 'jungle'}. If you're jungling, ask for a lane swap.</span>
                        </p>
                    )}

                    <div ref={sheetRef} className="p-3 lg:p-5 scroll-mt-32">
                        {scoring.mode === 'waiting' ? (
                            <div className="panel p-8 text-center space-y-3 animate-fadeIn">
                                <p className="display text-3xl">Add the first enemy pick</p>
                                <p className="text-sm text-fg-muted">Your options show up once there's an enemy to score them against.</p>
                                <button type="button" onClick={() => setPickerOpen(true)} className="btn btn-primary lg:hidden">Add enemy</button>
                            </div>
                        ) : lockedEntry ? (
                            <GamePlanCard entry={lockedEntry} skills={skills} onUnlock={() => draftState.setLocked(null)} onEditNotes={(enemyId) => onEditNotes(lockedEntry.id, enemyId)} resultLog={resultLog} />
                        ) : viewed ? (
                            <StatSheet entry={viewed} top={top} rank={rankOfViewed} options={options} onSelectOption={openOption} comfortWeight={comfortWeight} hasPool={hasPool} isTopOverall={!top || viewed.id === top.id}
                                onBackToTop={() => setViewedId(null)} onLockIn={draftState.setLocked} onOpenComfort={onOpenComfort} resultLog={resultLog}
                                // An edit can reorder the ranking, so stay on this jungler instead of jumping to a new top pick.
                                onSetTier={(matchup, tier) => { setViewedId(viewed.id); onSetTier(viewed.id)(matchup, tier); }}
                                onSetComfort={(junglerId, level) => { setViewedId(viewed.id); onSetComfort(junglerId, level); }} />
                        ) : (
                            <div className="panel p-8 text-center space-y-3">
                                <p className="display text-2xl">No jungler left to pick</p>
                                <p className="text-sm text-fg-muted">{safeOnly && scoring.hiddenCounters > 0 ? 'Every available jungler has a D against this lineup. Turn off Safe picks to see them.' : onlyPool && hasPool ? 'Nobody in your pool is still available. Turn off My pool to see everyone.' : 'All of your junglers are picked or banned. Add more in Tier lists.'}</p>
                                {safeOnly && scoring.hiddenCounters > 0
                                    ? <button type="button" onClick={() => setSafeOnly(false)} className="btn">Turn off Safe picks</button>
                                    : <button type="button" onClick={onOpenTierLists} className="btn">Open tier lists</button>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="xl:w-[400px] 2xl:w-[432px] xl:shrink-0 xl:min-h-0">
                    <RankingPanel scoring={scoring} enemySlots={draft.enemy} viewedId={viewed ? viewed.id : null} onSelect={selectEntry} onlyPool={onlyPool} setOnlyPool={setOnlyPool} safeOnly={safeOnly} setSafeOnly={setSafeOnly} hasPool={hasPool} onOpenTierLists={onOpenTierLists} takenLabels={takenLabels} />
                </div>
            </div>
        </div>
    );
}
