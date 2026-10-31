import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { HEROES, HERO_BY_ID } from './data/heroes.js';
import { DEFAULT_DRAFT_PREFERENCES, findAllyJunglers, isDraftPreferences, normalizeDraftPreferences } from './lib/draft.js';
import { initialUndoable, undoableDataReducer } from './lib/undoableData.js';
import { normalizeSpeech, parseVoice } from './lib/voice.js';
import { addGame, createGameRecord, mergeHistory, removeGame } from './lib/history.js';
import { backupFileName, readBackupFile, serializeBackup } from './lib/backupFile.js';
import {
    STORAGE_KEYS,
    addNewDefaultJunglers,
    clearSave,
    countRatings,
    loadSave,
    mergeSaveData,
} from './lib/saveData.js';
import { banSuggestions, scoreJunglers } from './lib/scoring.js';
import { allEffectiveTiers, categoriesOf, makeGroupId, withSkillData } from './lib/skillGroups.js';
import { createSafeStorage } from './lib/storage.js';
import { downloadFile } from './lib/files.js';
import { useDraft } from './hooks/useDraft.js';
import { useVoiceControl, voiceSupported } from './hooks/useVoiceControl.js';
import { Icons } from './components/Icons.jsx';
import { heroName } from './components/HeroAvatar.jsx';
import { AddJunglerModal, ConfirmDialog, CopyTierListModal, ImportDialog, MatchupDialog, NewGroupModal, TeachVoiceModal } from './components/Modals.jsx';
import ThemePicker from './components/ThemePicker.jsx';
import VoiceBar from './components/VoiceBar.jsx';
import DraftView from './views/DraftView.jsx';
import TierListView from './views/TierListView.jsx';
import SkillGroupsView from './views/SkillGroupsView.jsx';
import History from './views/History.jsx';
import Settings from './views/Settings.jsx';

const NAV_TABS = [
    { id: 'draft', label: 'Draft', icon: Icons.Target },
    { id: 'tiers', label: 'Tier lists', icon: Icons.Grid },
    { id: 'skills', label: 'Skills', icon: Icons.Layers },
    { id: 'history', label: 'History', icon: Icons.Chart },
    { id: 'settings', label: 'Settings', icon: Icons.Sliders },
];

const WRITE_FAILED = "Your last change couldn't be saved because browser storage is full or blocked. Export a backup from Settings before closing this tab.";
const NAMES_LISTED = 8;
const ALL_HERO_IDS = HEROES.map((hero) => hero.id);

const lanesOf = (heroId) => (HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].lanes : []);

const countOf = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

// A short list for notices, so a backup full of unknown names doesn't flood the screen.
const listNames = (names) => {
    const hidden = names.length - NAMES_LISTED;
    return `${names.slice(0, NAMES_LISTED).join(', ')}${hidden > 0 ? `, and ${hidden} more` : ''}`;
};

// Loads the save once at startup, collecting storage problems instead of reporting them mid-render.
const readStartupSave = () => {
    const problems = [];
    const startupStorage = createSafeStorage(() => window.localStorage, (problem) => problems.push(problem));
    return { ...loadSave(startupStorage), problems };
};

const startupNotice = ({ problems, unmatched, addedJunglers }) => {
    if (problems.length) return "Saved data couldn't be loaded, so defaults are showing. Nothing was deleted.";
    const notes = [];
    if (unmatched.length) notes.push(`Your saved data was upgraded. These names didn't match a hero and were left out: ${listNames(unmatched)}.`);
    if (addedJunglers.length) notes.push(`New jungler${addedJunglers.length === 1 ? '' : 's'} added to your roster: ${addedJunglers.map(heroName).join(', ')}.`);
    return notes.join(' ') || null;
};

export default function App() {
    const [startup] = useState(readStartupSave);
    const [undoable, dispatch] = useReducer(undoableDataReducer, startup.data, initialUndoable);
    const data = undoable.present;
    const undoLabel = undoable.past.length ? undoable.past[undoable.past.length - 1].label : null;
    const undoData = useCallback(() => dispatch({ type: 'undo' }), []);
    const [history, setHistory] = useState(startup.history);
    const [notice, setNotice] = useState(() => startupNotice(startup));
    const [draftPreferences, setDraftPreferences] = useState(() => normalizeDraftPreferences(
        createSafeStorage(() => window.localStorage).read(STORAGE_KEYS.preferences, DEFAULT_DRAFT_PREFERENCES, isDraftPreferences)));
    const updateDraftPreferences = useCallback((changes) => setDraftPreferences((current) => ({ ...current, ...changes })), []);
    const draftState = useDraft(draftPreferences, updateDraftPreferences);

    const [view, setView] = useState('draft');
    const [editorJungler, setEditorJungler] = useState(null);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [tierPage, setTierPage] = useState('board'); // board or comfort
    const [openMatchup, setOpenMatchup] = useState(null); // { junglerId, enemyId }
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const [voiceOn, setVoiceOn] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState(null); // { heard, note, ok, canTeach }
    const [teaching, setTeaching] = useState(null); // { phrase, apply }
    const [isAddingJungler, setIsAddingJungler] = useState(false);
    const [newJunglerId, setNewJunglerId] = useState('');
    const [isCopyingTiers, setIsCopyingTiers] = useState(false);
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [pendingImport, setPendingImport] = useState(null);
    const [confirmRequest, setConfirmRequest] = useState(null); // { title, message, confirmLabel, onConfirm }
    const [lastRecord, setLastRecord] = useState(null);

    const storage = useMemo(() => createSafeStorage(() => window.localStorage, ({ action, key, error }) => {
        console.warn(`JunglerOS could not ${action} "${key}"`, error);
        if (action === 'write') setNotice(WRITE_FAILED);
    }), []);

    // Save after every change, including an undo that lands back on the data loaded at startup.
    const savedData = useRef(startup.data);
    useEffect(() => {
        if (data === savedData.current) return;
        storage.write(STORAGE_KEYS.data, data);
        savedData.current = data;
    }, [data, storage]);
    useEffect(() => { if (history !== startup.history) storage.write(STORAGE_KEYS.history, history); }, [history, startup, storage]);
    useEffect(() => { storage.write(STORAGE_KEYS.preferences, draftPreferences); }, [draftPreferences, storage]);

    useLayoutEffect(() => { document.documentElement.dataset.theme = draftPreferences.theme; }, [draftPreferences.theme]);

    // Ctrl+Z on the tier list and skill group screens. The draft screen undoes the draft instead.
    useEffect(() => {
        if (view !== 'tiers' && view !== 'skills') return undefined;
        const handleKey = (e) => {
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
            const focused = document.activeElement;
            if (document.querySelector('[role="dialog"]') || (focused && ['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName))) return;
            e.preventDefault();
            undoData();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [view, undoData]);

    const handleAddJungler = () => {
        if (!newJunglerId) return;
        dispatch({ type: 'addJungler', junglerId: newJunglerId });
        setEditorJungler(newJunglerId);
        setNewJunglerId(''); setIsAddingJungler(false);
    };

    const handleDeleteJungler = () => {
        if (!editorJungler) return;
        const junglerId = editorJungler;
        setConfirmRequest({
            title: `Remove ${heroName(junglerId)}?`,
            message: `${heroName(junglerId)} leaves your roster, along with their whole tier list, notes and comfort rating.`,
            confirmLabel: 'Remove',
            onConfirm: () => {
                dispatch({ type: 'removeJungler', junglerId });
                setEditorJungler(null);
            },
        });
    };

    const handleClearTierList = () => {
        const junglerId = editorJungler;
        setConfirmRequest({
            title: `Clear ${heroName(junglerId)}'s tier list?`,
            message: 'Every hero and skill group rating for this jungler goes back to unrated. Your notes stay.',
            confirmLabel: 'Clear',
            onConfirm: () => dispatch({ type: 'clearTierList', junglerId }),
        });
    };

    const handleDeleteGroup = (group) => {
        setConfirmRequest({
            title: `Delete ${group.name}?`,
            message: 'The group goes away, and so do the tiers it gave your junglers. Heroes you rated directly keep their tier.',
            confirmLabel: 'Delete',
            onConfirm: () => {
                dispatch({ type: 'deleteGroup', groupId: group.id });
                setEditingGroupId(null);
            },
        });
    };

    const handleCreateGroup = ({ name, category }) => {
        const id = makeGroupId(name.trim(), data.skillGroups || []);
        dispatch({ type: 'addGroup', id, name, category });
        setEditingGroupId(id);
        setIsAddingGroup(false);
    };

    const handleExport = () => {
        try {
            downloadFile(serializeBackup(data, history), backupFileName());
        } catch (error) {
            console.warn('JunglerOS could not export a backup', error);
            setNotice("The backup couldn't be created. Try again, or use another browser.");
        }
    };

    // Reading a backup only opens a preview; nothing changes until you choose Merge or Replace.
    const handleImport = async (e) => {
        const file = e.target.files[0];
        // Cleared right away so choosing the same file again still works.
        e.target.value = '';
        if (!file) return;
        try {
            setPendingImport(await readBackupFile(file));
        } catch (error) {
            setNotice(error.message);
        }
    };

    const applyImport = (mode) => {
        const incoming = pendingImport;
        const merging = mode === 'merge';
        const nextData = withSkillData(addNewDefaultJunglers(merging ? mergeSaveData(data, incoming.data) : incoming.data).data);
        dispatch({ type: 'load', data: nextData });
        setHistory(merging ? mergeHistory(history, incoming.history) : incoming.history);
        setEditorJungler(null);
        setEditingGroupId(null);
        setPendingImport(null);
        const skipped = incoming.unmatched.length ? ` Skipped names that aren't heroes: ${listNames(incoming.unmatched)}.` : '';
        setNotice(`${merging ? 'Merged' : 'Restored'} ${countOf(incoming.data.junglers.length, 'jungler')}, ${countOf(countRatings(incoming.data.matchups), 'rating')} and ${countOf(incoming.history.length, 'game')} from ${incoming.fileName}.${skipped}`);
    };

    const handleReset = () => {
        setConfirmRequest({
            title: 'Reset JunglerOS?',
            message: "This deletes your tier lists, skill groups, notes, roster, comfort, game history and settings from this browser. It can't be undone.",
            confirmLabel: 'Reset everything',
            onConfirm: () => {
                clearSave(storage);
                window.location.reload();
            },
        });
    };

    const requestDeleteGame = (game) => {
        setConfirmRequest({
            title: 'Delete this game?',
            message: `The ${game.result === 'win' ? 'win' : 'loss'} with ${heroName(game.playedId)} will be removed from your history and records.`,
            confirmLabel: 'Delete',
            onConfirm: () => setHistory((current) => removeGame(current, game.id)),
        });
    };

    const { draft } = draftState;
    const comfort = useMemo(() => data.comfort || {}, [data.comfort]);
    const hasPool = Object.keys(comfort).length > 0;
    const allyJunglers = useMemo(() => findAllyJunglers(draft, lanesOf), [draft]);
    const tiersByJungler = useMemo(() => allEffectiveTiers(data), [data]);
    const takenIds = useMemo(() => [...draft.ally, ...draft.allyBans, ...draft.enemyBans].filter(Boolean), [draft]);

    const scoringInputs = useMemo(() => ({
        junglerIds: data.junglers,
        enemyIds: draft.enemy.filter(Boolean),
        enemyJunglerId: draft.enemyJungler || null,
        unavailableIds: takenIds,
        tiersByJungler,
        matchups: data.matchups,
        comfort,
        comfortWeight: draftPreferences.comfortWeight,
        onlyPool: draftPreferences.onlyPool && hasPool,
        safeOnly: draftPreferences.safeOnly,
        heroIds: ALL_HERO_IDS,
    }), [data.junglers, data.matchups, draft, takenIds, tiersByJungler, comfort, draftPreferences.comfortWeight, draftPreferences.onlyPool, draftPreferences.safeOnly, hasPool]);

    const scoring = useMemo(() => scoreJunglers(scoringInputs), [scoringInputs]);

    const banIdeas = useMemo(() => banSuggestions({
        junglerIds: data.junglers,
        tiersByJungler,
        comfort,
        takenIds: [...draft.enemy, ...takenIds].filter(Boolean),
    }), [data.junglers, tiersByJungler, comfort, draft.enemy, takenIds]);

    // Any edit to the draft means the saved result no longer describes it.
    useEffect(() => { setLastRecord(null); }, [draft]);

    const recordResult = ({ result, playedId }) => {
        const withYourSlotOpen = scoreJunglers({ ...scoringInputs, unavailableIds: scoringInputs.unavailableIds.filter((id) => id !== playedId) });
        const record = createGameRecord({
            draft,
            result,
            playedId,
            topPickId: withYourSlotOpen.top ? withYourSlotOpen.top.id : null,
        });
        setHistory((current) => addGame(current, record));
        setLastRecord(record);
    };

    const undoRecord = () => {
        if (!lastRecord) return;
        setHistory((current) => removeGame(current, lastRecord.id));
        setLastRecord(null);
    };

    // Editing a tier from the stat sheet: tapping your own rating again removes it.
    const setTierFromSheet = (junglerId) => (matchup, tier) => {
        if (matchup.source === 'hero' && matchup.tier === tier) dispatch({ type: 'clearTier', junglerId, enemyId: matchup.enemyId });
        else dispatch({ type: 'setTier', junglerId, enemyId: matchup.enemyId, tier });
    };

    // What was just said goes through the parser, then into the draft. Anything it can't use stays on screen,
    // so a misheard name can be taught.
    const handleVoiceResult = (alternatives) => {
        const parsed = parseVoice(alternatives, { aliases: draftPreferences.voiceAliases, takenIds: [...draft.enemy, ...takenIds].filter(Boolean) });
        if (parsed.ignored) {
            setVoiceFeedback({ heard: parsed.heard, note: 'Not a hero or command.', ok: false, canTeach: true, guesses: parsed.guesses, phrase: parsed.heard, picked: null });
            return;
        }
        if (parsed.actions.some((action) => action.type === 'stopVoice')) {
            setVoiceOn(false);
            return;
        }
        const results = draftState.applyVoice(parsed.actions.map((action) => (
            action.type === 'lock' && !action.heroId ? { ...action, heroId: scoring.top ? scoring.top.id : null } : action
        )));
        const [firstPick] = parsed.actions.filter((action) => action.type === 'pick');
        setVoiceFeedback({
            heard: parsed.heard,
            note: results.map((result) => result.note).join(' '),
            ok: results.every((result) => result.ok),
            canTeach: false,
            guesses: parsed.guesses,
            phrase: parsed.fuzzyPhrase,
            picked: parsed.fuzzyPhrase ? firstPick || null : null,
        });
    };

    // Tapping a "did you mean" hero fixes this pick and remembers the phrase, so it's right from now on.
    const correctVoice = (heroId) => {
        const { phrase, picked } = voiceFeedback;
        updateDraftPreferences({ voiceAliases: { ...draftPreferences.voiceAliases, [normalizeSpeech(phrase)]: heroId } });
        const target = picked ? picked.target : 'next';
        const results = draftState.applyVoice([
            ...(picked ? [{ type: 'remove', heroId: picked.heroId }] : []),
            { type: 'pick', heroId, target },
        ]);
        const last = results[results.length - 1];
        setVoiceFeedback({ heard: phrase, note: last.note, ok: last.ok, canTeach: false, guesses: [], phrase: null, picked: null });
    };

    const voiceListener = useVoiceControl({
        enabled: voiceOn,
        lang: draftPreferences.voiceLang,
        micDeviceId: draftPreferences.micDeviceId,
        useVoicePack: draftPreferences.voiceUsePack,
        onResult: handleVoiceResult,
        onStop: () => setVoiceOn(false),
    });

    const voice = {
        on: voiceOn,
        setOn: (on) => {
            voiceListener.clearError();
            if (on) setVoiceFeedback(null);
            setVoiceOn(on);
        },
        supported: voiceSupported(),
        status: voiceListener.status,
        interim: voiceListener.interim,
        error: voiceListener.error,
    };

    const saveTaughtWord = (heroId) => {
        const { phrase, apply } = teaching;
        updateDraftPreferences({ voiceAliases: { ...draftPreferences.voiceAliases, [normalizeSpeech(phrase)]: heroId } });
        if (apply) {
            const [result] = draftState.applyVoice([{ type: 'pick', heroId, target: 'next' }]);
            setVoiceFeedback({ heard: phrase, note: result.note, ok: result.ok, canTeach: false, guesses: [], phrase: null, picked: null });
        }
        setTeaching(null);
    };

    const forgetWord = (phrase) => {
        const { [phrase]: _forgotten, ...rest } = draftPreferences.voiceAliases;
        updateDraftPreferences({ voiceAliases: rest });
    };

    const openComfort = () => {
        setTierPage('comfort');
        setView('tiers');
    };

    const stats = useMemo(() => ({
        junglerCount: data.junglers.length,
        matchupCount: countRatings(data.matchups),
        groupCount: (data.skillGroups || []).length,
        groupRatingCount: Object.values(data.groupRatings || {}).reduce((sum, ratings) => sum + Object.keys(ratings).length, 0),
        gameCount: history.length,
    }), [data, history]);

    const addJunglerOptions = useMemo(
        () => HEROES.filter((hero) => !data.junglers.includes(hero.id)).map((hero) => ({ id: hero.id, name: hero.name })),
        [data.junglers]
    );

    const copyOptions = data.junglers
        .filter((id) => id !== editorJungler)
        .map((id) => ({ id, name: heroName(id), rated: Object.keys(tiersByJungler[id] || {}).length }))
        .sort((a, b) => (b.rated - a.rated) || a.name.localeCompare(b.name));

    const openNote = openMatchup ? (data.matchups[openMatchup.junglerId] || {})[openMatchup.enemyId] || {} : null;

    return (
        <div className="app-tone h-dvh w-full flex flex-col bg-ink text-fg">
            <nav aria-label="Main" className="order-last lg:order-first shrink-0 z-30 bg-ink-2 border-t lg:border-t-0 lg:border-b border-line flex items-stretch lg:items-center lg:gap-6 lg:px-5 lg:h-14 pb-[env(safe-area-inset-bottom)]">
                <div className="hidden lg:flex items-center gap-2.5">
                    <span className="pentagon w-7 h-7 bg-accent" aria-hidden="true" />
                    <span className="display text-2xl tracking-wide">Jungler<span className="text-accent">OS</span></span>
                </div>
                <div className="flex flex-1 lg:flex-none lg:gap-1 lg:h-full">
                    {NAV_TABS.map(({ id, label, icon: TabIcon }) => (
                        <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}
                            className={`relative flex-1 lg:flex-none min-h-[3.25rem] lg:min-h-0 px-1 lg:px-4 flex flex-col lg:flex-row items-center justify-center gap-0.5 lg:gap-2 label transition-colors ${view === id ? 'text-accent' : 'text-fg-muted hover:text-fg'}`}>
                            <TabIcon size={17} />
                            <span className="text-[12px] lg:text-[14px]">{label}</span>
                            {view === id && <span className="absolute top-0 lg:top-auto lg:bottom-0 inset-x-0 h-[3px] bg-accent" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
                <div className="hidden lg:block relative ml-auto">
                    <button type="button" aria-expanded={themeMenuOpen} onClick={() => setThemeMenuOpen((open) => !open)} className="btn btn-quiet"><Icons.Palette size={16} /> Theme</button>
                    {themeMenuOpen && (
                        <>
                            <button type="button" aria-label="Close theme menu" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setThemeMenuOpen(false)} />
                            <div className="absolute right-0 top-full mt-2 z-50 w-80 panel p-2 animate-fadeIn">
                                <ThemePicker compact value={draftPreferences.theme} onChange={(theme) => updateDraftPreferences({ theme })} />
                            </div>
                        </>
                    )}
                </div>
            </nav>

            {notice && (
                <div role="alert" className="shrink-0 border-b border-accent bg-ink-3 text-fg text-sm px-3 lg:px-5 py-2 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2"><Icons.Info size={15} className="shrink-0 text-accent" /> {notice}</span>
                    <button type="button" onClick={() => setNotice(null)} className="btn btn-quiet !min-h-[1.75rem] shrink-0">Dismiss</button>
                </div>
            )}

            <main className="flex-1 flex min-h-0 overflow-hidden relative">
                {view === 'draft' && (
                    <DraftView
                        draftState={draftState}
                        enemyOnly={draftPreferences.enemyOnly}
                        defaultBanCount={draftPreferences.bansPerTeam}
                        comfortWeight={draftPreferences.comfortWeight}
                        scoring={scoring}
                        skillGroups={data.skillGroups || []}
                        banIdeas={banIdeas}
                        allyJunglers={draftPreferences.enemyOnly ? [] : allyJunglers}
                        onlyPool={draftPreferences.onlyPool}
                        setOnlyPool={(on) => updateDraftPreferences({ onlyPool: on })}
                        safeOnly={draftPreferences.safeOnly}
                        setSafeOnly={(on) => updateDraftPreferences({ safeOnly: on })}
                        hasPool={hasPool}
                        onSetTier={setTierFromSheet}
                        onSetComfort={(junglerId, level) => dispatch({ type: 'setComfort', junglerId, comfort: level })}
                        onOpenTierLists={() => setView('tiers')}
                        onOpenComfort={openComfort}
                        onEditNotes={(junglerId, enemyId) => setOpenMatchup({ junglerId, enemyId })}
                        resultLog={{ lastRecord, onRecord: recordResult, onUndoRecord: undoRecord, onNewDraft: draftState.newDraft }}
                        voice={voice}
                        voiceBar={<VoiceBar voice={voice} feedback={voiceFeedback} micDeviceId={draftPreferences.micDeviceId} onTeach={(phrase) => setTeaching({ phrase, apply: true })} onCorrect={correctVoice} onOpenSettings={() => setView('settings')} onExport={handleExport} />}
                    />
                )}
                {view === 'tiers' && (
                    <TierListView
                        data={data}
                        tiersByJungler={tiersByJungler}
                        junglerId={editorJungler}
                        setJunglerId={(id) => { setEditorJungler(id); setTierPage('board'); }}
                        page={tierPage}
                        onOpenComfort={() => setTierPage((page) => (page === 'comfort' ? 'board' : 'comfort'))}
                        comfortWeight={draftPreferences.comfortWeight}
                        undoLabel={undoLabel}
                        onUndo={undoData}
                        dispatch={dispatch}
                        onAddJungler={() => setIsAddingJungler(true)}
                        onRemoveJungler={handleDeleteJungler}
                        onCopyTierList={() => setIsCopyingTiers(true)}
                        onClearTierList={handleClearTierList}
                        onOpenMatchup={(enemyId) => setOpenMatchup({ junglerId: editorJungler, enemyId })}
                        onOpenSkills={() => setView('skills')}
                    />
                )}
                {view === 'skills' && (
                    <SkillGroupsView
                        data={data}
                        selectedId={editingGroupId}
                        setSelectedId={setEditingGroupId}
                        dispatch={dispatch}
                        onNewGroup={() => setIsAddingGroup(true)}
                        onDeleteGroup={handleDeleteGroup}
                        undoLabel={undoLabel}
                        onUndo={undoData}
                    />
                )}
                {view === 'history' && (
                    <History
                        history={history}
                        tiersByJungler={tiersByJungler}
                        skillGroups={data.skillGroups || []}
                        onDeleteGame={requestDeleteGame}
                        onSetTier={(junglerId, enemyId, tier) => dispatch({ type: 'setTier', junglerId, enemyId, tier })}
                        onOpenDraft={() => setView('draft')}
                    />
                )}
                {view === 'settings' && (
                    <Settings
                        preferences={draftPreferences}
                        onPreferencesChange={updateDraftPreferences}
                        onEnemyOnlyChange={draftState.setEnemyOnly}
                        voice={voice}
                        onTeach={(phrase) => setTeaching({ phrase, apply: false })}
                        onForgetWord={forgetWord}
                        stats={stats}
                        onExport={handleExport}
                        onImport={handleImport}
                        onReset={handleReset}
                    />
                )}
            </main>

            {openMatchup && (
                <MatchupDialog
                    key={`${openMatchup.junglerId}|${openMatchup.enemyId}`}
                    junglerName={heroName(openMatchup.junglerId)}
                    enemyName={heroName(openMatchup.enemyId)}
                    enemyId={openMatchup.enemyId}
                    rating={(tiersByJungler[openMatchup.junglerId] || {})[openMatchup.enemyId] || null}
                    note={openNote}
                    onSetTier={(tier) => dispatch({ type: 'setTier', junglerId: openMatchup.junglerId, enemyId: openMatchup.enemyId, tier })}
                    onClearTier={() => dispatch({ type: 'clearTier', junglerId: openMatchup.junglerId, enemyId: openMatchup.enemyId })}
                    onSaveNotes={({ quickNote, comment }) => dispatch({ type: 'setNotes', junglerId: openMatchup.junglerId, enemyId: openMatchup.enemyId, quickNote, comment })}
                    onClose={() => setOpenMatchup(null)}
                />
            )}
            {teaching && <TeachVoiceModal phrase={teaching.phrase} onSave={saveTaughtWord} onCancel={() => setTeaching(null)} />}
            {isAddingJungler && (
                <AddJunglerModal options={addJunglerOptions} value={newJunglerId} onChange={setNewJunglerId} onCancel={() => { setIsAddingJungler(false); setNewJunglerId(''); }} onAdd={handleAddJungler} />
            )}
            {isCopyingTiers && editorJungler && (
                <CopyTierListModal junglerName={heroName(editorJungler)} options={copyOptions} onCancel={() => setIsCopyingTiers(false)}
                    onCopy={(fromId) => { dispatch({ type: 'copyTierList', fromId, toId: editorJungler }); setIsCopyingTiers(false); }} />
            )}
            {isAddingGroup && (
                <NewGroupModal existingCategories={categoriesOf(data.skillGroups || []).map(({ category }) => category)} onCreate={handleCreateGroup} onCancel={() => setIsAddingGroup(false)} />
            )}
            {pendingImport && (
                <ImportDialog
                    summary={{
                        fileName: pendingImport.fileName,
                        junglers: pendingImport.data.junglers.length,
                        ratings: countRatings(pendingImport.data.matchups),
                        comfort: Object.keys(pendingImport.data.comfort || {}).length,
                        groups: (pendingImport.data.skillGroups || []).length,
                        games: pendingImport.history.length,
                        skippedIcons: pendingImport.skippedIcons,
                        unmatched: pendingImport.unmatched,
                    }}
                    onMerge={() => applyImport('merge')}
                    onReplace={() => applyImport('replace')}
                    onCancel={() => setPendingImport(null)}
                />
            )}
            {confirmRequest && (
                <ConfirmDialog
                    title={confirmRequest.title}
                    message={confirmRequest.message}
                    confirmLabel={confirmRequest.confirmLabel}
                    onConfirm={() => {
                        setConfirmRequest(null);
                        confirmRequest.onConfirm();
                    }}
                    onCancel={() => setConfirmRequest(null)}
                />
            )}
        </div>
    );
}
