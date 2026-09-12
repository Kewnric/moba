import { useEffect, useMemo, useState } from 'react';
import {
    clearSlot,
    createDraft,
    isDraft,
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
export function useDraft() {
    const storage = useMemo(() => createSafeStorage(() => window.sessionStorage), []);
    const [draft, setDraft] = useState(() => storage.read(DRAFT_KEY, null, isDraft) || createDraft());
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
        clearSlot: (slot) => {
            commit(clearSlot(draft, slot));
            setSelectedSlot(slot);
        },
        setEnemyLane: (index, lane) => commit(setEnemyLane(draft, index, lane)),
        setBansPerTeam: (count) => {
            commit(setBansPerTeam(draft, count));
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
            commit(createDraft({ bansPerTeam: draft.bansPerTeam, firstPick: draft.firstPick }));
            setSelectedSlot(null);
        },
    };
}
