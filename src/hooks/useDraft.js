import { useEffect, useMemo, useState } from 'react';
import {
    clearAllyPicks,
    clearSlot,
    draftFromPreferences,
    isBanSlot,
    isDraft,
    moveBetweenSlots,
    nextBanSlot,
    nextSlot,
    setBansPerTeam,
    setFirstPick,
    setSlot,
    toggleEnemyJungler,
} from '../lib/draft.js';
import { createSafeStorage } from '../lib/storage.js';

const DRAFT_KEY = 'jungleros_draft_v1';
const HISTORY_LIMIT = 50;

const sameSlot = (a, b) => Boolean(a && b && a.group === b.group && a.index === b.index);

// The draft in progress. It survives a refresh (per browser tab), keeps an undo history, and tracks the
// slot the next tapped hero goes into: the one you selected, or the next slot for this kind of draft.
// New drafts follow your draft preferences, and changing the bans or your team on the board updates them too.
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

    const { enemyOnly } = preferences;
    const activeSlot = selectedSlot || nextSlot(draft, { enemyOnly });

    return {
        draft,
        activeSlot,
        canUndo: history.length > 0,
        selectSlot: (slot) => setSelectedSlot((current) => (sameSlot(current, slot) ? null : slot)),
        pickHero: (heroId) => {
            if (!activeSlot) return;
            const next = setSlot(draft, activeSlot, heroId);
            if (!commit(next)) return;
            // Bans get entered in one go, so stay on them until they're full.
            setSelectedSlot(enemyOnly && isBanSlot(activeSlot) ? nextBanSlot(next) : null);
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
        toggleEnemyJungler: (heroId) => commit(toggleEnemyJungler(draft, heroId)),
        // Turning your team off clears its picks, so nothing hidden keeps affecting the ranking. Undo brings them back.
        setEnemyOnly: (on) => {
            if (on) commit(clearAllyPicks(draft));
            updatePreferences({ enemyOnly: on });
            setSelectedSlot(null);
        },
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
