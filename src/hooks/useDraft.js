import { useEffect, useMemo, useState } from 'react';
import {
    clearSlot,
    draftFromPreferences,
    isDraft,
    moveBetweenSlots,
    nextSlot,
    setBansPerTeam,
    setEnemyLane,
    setFirstPick,
    setSlot,
} from '../lib/draft.js';
import { createSafeStorage } from '../lib/storage.js';

const DRAFT_KEY = 'jungleros_draft_v1';
const HISTORY_LIMIT = 50;

const sameSlot = (a, b) => Boolean(a && b && a.group === b.group && a.index === b.index);

// The draft in progress. It survives a refresh (per browser tab), keeps an undo history, and tracks
// the slot the next tapped hero goes into: the one you selected, or the next slot in draft order.
// New drafts follow your draft preferences, and turning the ban phase on or off (or changing the number
// of bans) on the board updates those preferences too.
export function useDraft(preferences, updatePreferences) {
    const storage = useMemo(() => createSafeStorage(() => window.sessionStorage), []);
    const [draft, setDraft] = useState(() => storage.read(DRAFT_KEY, null, isDraft) || draftFromPreferences(preferences));
    const [history, setHistory] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    useEffect(() => { storage.write(DRAFT_KEY, draft); }, [draft, storage]);

    const commit = (next) => {
        if (next === draft) return false;
        setHistory((past) => [...past.slice(-(HISTORY_LIMIT - 1)), draft]);
        setDraft(next);
        return true;
    };

    const activeSlot = selectedSlot || nextSlot(draft);

    return {
        draft,
        activeSlot,
        canUndo: history.length > 0,
        selectSlot: (slot) => setSelectedSlot((current) => (sameSlot(current, slot) ? null : slot)),
        pickHero: (heroId) => {
            if (activeSlot && commit(setSlot(draft, activeSlot, heroId))) setSelectedSlot(null);
        },
        placeHero: (slot, heroId) => {
            if (commit(setSlot(draft, slot, heroId))) setSelectedSlot(null);
        },
        moveHero: (from, to) => {
            if (commit(moveBetweenSlots(draft, from, to))) setSelectedSlot(null);
        },
        clearSlot: (slot) => {
            commit(clearSlot(draft, slot));
            setSelectedSlot(slot);
        },
        setEnemyLane: (index, lane) => commit(setEnemyLane(draft, index, lane)),
        setBanPhase: (enabled) => {
            commit(setBansPerTeam(draft, enabled ? preferences.bansPerTeam : 0));
            updatePreferences({ banPhase: enabled });
            setSelectedSlot(null);
        },
        setBansPerTeam: (count) => {
            commit(setBansPerTeam(draft, count));
            updatePreferences({ banPhase: true, bansPerTeam: count });
            setSelectedSlot(null);
        },
        setFirstPick: (team) => commit(setFirstPick(draft, team)),
        undo: () => {
            if (!history.length) return;
            setDraft(history[history.length - 1]);
            setHistory((past) => past.slice(0, -1));
            setSelectedSlot(null);
        },
        newDraft: () => {
            commit(draftFromPreferences(preferences));
            setSelectedSlot(null);
        },
    };
}
