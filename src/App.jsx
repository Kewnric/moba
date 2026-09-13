import { useEffect, useMemo, useReducer, useState } from 'react';
import { HEROES, HERO_BY_ID } from './data/heroes.js';
import { HERO_META } from './data/stats.js';
import { resolveEnemyLanes } from './lib/draft.js';
import { dataReducer } from './lib/dataReducer.js';
import { addGame, createGameRecord, mergeHistory, removeGame } from './lib/history.js';
import {
    STORAGE_KEYS,
    addNewDefaultJunglers,
    buildExport,
    clearSave,
    countRatings,
    loadSave,
    mergeSaveData,
    normalizeImport,
} from './lib/saveData.js';
import { scoreJunglers } from './lib/scoring.js';
import { MATCHUPS } from './lib/stats.js';
import { createSafeStorage } from './lib/storage.js';
import { compressImage, downloadJson } from './lib/files.js';
import { useDraft } from './hooks/useDraft.js';
import { Icons } from './components/Icons.jsx';
import GlobalTooltip from './components/GlobalTooltip.jsx';
import { heroName } from './components/HeroAvatar.jsx';
import { AddJunglerModal, ImportDialog, QuickTipModal, TacticalNoteModal } from './components/Modals.jsx';
import DraftLab from './views/DraftLab.jsx';
import DatabaseEditor from './views/DatabaseEditor.jsx';
import History from './views/History.jsx';
import AssetManager from './views/AssetManager.jsx';
import DataHub from './views/DataHub.jsx';

const NAV_TABS = [
    { id: 'draft', label: 'Draft Lab', shortLabel: 'Draft', icon: Icons.Target, activeClass: 'bg-cyan-600' },
    { id: 'editor', label: 'Database', shortLabel: 'Ratings', icon: Icons.Edit3, activeClass: 'bg-purple-600' },
    { id: 'history', label: 'History', shortLabel: 'History', icon: Icons.Chart, activeClass: 'bg-teal-600' },
    { id: 'assets', label: 'Assets', shortLabel: 'Icons', icon: Icons.Image, activeClass: 'bg-orange-600' },
    { id: 'data', label: 'Data Hub', shortLabel: 'Data', icon: Icons.Database, activeClass: 'bg-emerald-600' },
];

const WRITE_FAILED = "Your last change couldn't be saved because browser storage is full or blocked. Export a backup from Data Hub before closing this tab.";

const heroInfo = (heroId) => HERO_BY_ID[heroId] || null;
const lanesOf = (heroId) => (HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].lanes : []);

// Loads the save once at startup, collecting storage problems instead of reporting them mid-render.
const readStartupSave = () => {
    const problems = [];
    const startupStorage = createSafeStorage(() => window.localStorage, (problem) => problems.push(problem));
    return { ...loadSave(startupStorage), problems };
};

const startupNotice = ({ problems, unmatched, addedJunglers }) => {
    if (problems.length) return "Saved data couldn't be loaded, so defaults are showing. Nothing was deleted.";
    const notes = [];
    if (unmatched.length) notes.push(`Your saved data was upgraded. These names didn't match a hero and were left out: ${unmatched.join(', ')}.`);
    if (addedJunglers.length) notes.push(`New jungler${addedJunglers.length === 1 ? '' : 's'} added to your roster: ${addedJunglers.map(heroName).join(', ')}.`);
    return notes.join(' ') || null;
};

export default function App() {
    const [startup] = useState(readStartupSave);
    const [data, dispatch] = useReducer(dataReducer, startup.data);
    const [customImages, setCustomImages] = useState(startup.images);
    const [history, setHistory] = useState(startup.history);
    const [notice, setNotice] = useState(() => startupNotice(startup));
    const draftState = useDraft();

    const [view, setView] = useState('draft');
    const [onlyPool, setOnlyPool] = useState(false);
    const [editorJungler, setEditorJungler] = useState(null);
    const [editingNote, setEditingNote] = useState(null); // { field: 'quickNote' | 'comment', enemyId, text }
    const [isAddingJungler, setIsAddingJungler] = useState(false);
    const [newJunglerId, setNewJunglerId] = useState('');
    const [pendingImport, setPendingImport] = useState(null);
    const [lastRecord, setLastRecord] = useState(null);
    const [draggingSource, setDraggingSource] = useState(null);
    const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, content: null });

    const storage = useMemo(() => createSafeStorage(() => window.localStorage, ({ action, key, error }) => {
        console.warn(`JunglerOS could not ${action} "${key}"`, error);
        if (action === 'write') setNotice(WRITE_FAILED);
    }), []);

    // Save after every change. The startup state is already what's stored, so it isn't written back.
    useEffect(() => { if (data !== startup.data) storage.write(STORAGE_KEYS.data, data); }, [data, startup, storage]);
    useEffect(() => { if (customImages !== startup.images) storage.write(STORAGE_KEYS.images, customImages); }, [customImages, startup, storage]);
    useEffect(() => { if (history !== startup.history) storage.write(STORAGE_KEYS.history, history); }, [history, startup, storage]);

    const handleAddJungler = () => {
        if (!newJunglerId) return;
        dispatch({ type: 'addJungler', junglerId: newJunglerId });
        setEditorJungler(newJunglerId);
        setNewJunglerId(''); setIsAddingJungler(false);
    };

    const handleDeleteJungler = () => {
        if (!editorJungler) return;
        if (confirm(`Delete ${heroName(editorJungler)} from roster?`)) {
            dispatch({ type: 'removeJungler', junglerId: editorJungler });
            setEditorJungler(null);
        }
    };

    const handleAssetUpload = (e, heroId) => {
        const file = e.target.files[0];
        if (file) compressImage(file, (base64) => setCustomImages(images => ({ ...images, [heroId]: base64 })));
    };

    const handleExport = () => {
        downloadJson(buildExport(data, customImages, history), `jungleros_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    };

    // Reading a backup only opens a preview; nothing changes until you choose Merge or Replace.
    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                setPendingImport({ ...normalizeImport(JSON.parse(ev.target.result)), fileName: file.name });
            } catch (error) {
                setNotice(error instanceof SyntaxError ? "That file isn't valid JSON, so nothing was restored." : `${error.message} Nothing was restored.`);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const applyImport = (mode) => {
        const incoming = pendingImport;
        const merging = mode === 'merge';
        const nextData = addNewDefaultJunglers(merging ? mergeSaveData(data, incoming.data) : incoming.data).data;
        dispatch({ type: 'load', data: nextData });
        setCustomImages(merging ? { ...customImages, ...incoming.images } : incoming.images);
        setHistory(merging ? mergeHistory(history, incoming.history) : incoming.history);
        setEditorJungler(null);
        setPendingImport(null);
        const skipped = incoming.unmatched.length ? ` Skipped names that aren't heroes: ${incoming.unmatched.join(', ')}.` : '';
        setNotice(`${merging ? 'Merged' : 'Restored'} ${incoming.data.junglers.length} junglers, ${countRatings(incoming.data.matchups)} ratings, ${incoming.history.length} games and ${Object.keys(incoming.images).length} icons from ${incoming.fileName}.${skipped}`);
    };

    const handleReset = () => {
        if (confirm("Are you sure? This will wipe all data, including your game history.")) {
            clearSave(storage);
            window.location.reload();
        }
    };

    const saveNote = () => {
        const type = editingNote.field === 'quickNote' ? 'setQuickNote' : 'setComment';
        dispatch({ type, junglerId: editorJungler, enemyId: editingNote.enemyId, text: editingNote.text });
        setEditingNote(null);
    };

    const handleDragStart = (e, heroId, source, index = null) => {
        e.dataTransfer.setData('hero', heroId);
        e.dataTransfer.setData('source', source);
        if (index !== null) e.dataTransfer.setData('slotIndex', index);
        setDraggingSource(source);
    };
    const handleDragEnd = () => setDraggingSource(null);

    const { draft } = draftState;
    const comfort = useMemo(() => data.comfort || {}, [data.comfort]);
    const hasPool = Object.keys(comfort).length > 0;
    const enemyLanes = useMemo(() => resolveEnemyLanes(draft, lanesOf), [draft]);

    const scoringInputs = useMemo(() => ({
        junglerIds: data.junglers,
        enemies: draft.enemy.map((heroId, index) => (heroId ? { heroId, lane: enemyLanes[index] } : null)).filter(Boolean),
        allyIds: draft.ally.filter(Boolean),
        unavailableIds: [...draft.allyBans, ...draft.enemyBans].filter(Boolean),
        ratings: data.matchups,
        comfort,
        onlyPool: onlyPool && hasPool,
        matchupStats: MATCHUPS,
        meta: HERO_META,
        heroInfo,
    }), [data, draft, enemyLanes, onlyPool, hasPool, comfort]);

    const scoring = useMemo(() => scoreJunglers(scoringInputs), [scoringInputs]);

    // Any edit to the draft means the saved result no longer describes it.
    useEffect(() => { setLastRecord(null); }, [draft]);

    const recordResult = ({ result, playedId }) => {
        const withYourSlotOpen = scoreJunglers({ ...scoringInputs, allyIds: scoringInputs.allyIds.filter(id => id !== playedId) });
        const record = createGameRecord({
            draft: { ...draft, enemyLanes },
            result,
            playedId,
            topPickId: withYourSlotOpen.ranked.length ? withYourSlotOpen.ranked[0].id : null,
        });
        setHistory(current => addGame(current, record));
        setLastRecord(record);
    };

    const undoRecord = () => {
        if (!lastRecord) return;
        setHistory(current => removeGame(current, lastRecord.id));
        setLastRecord(null);
    };

    const stats = useMemo(() => ({
        junglerCount: data.junglers.length,
        imageCount: Object.keys(customImages).length,
        matchupCount: countRatings(data.matchups),
        gameCount: history.length,
    }), [data, customImages, history]);

    const addJunglerOptions = useMemo(
        () => HEROES.filter(hero => !data.junglers.includes(hero.id)).map(hero => ({ id: hero.id, name: hero.name })),
        [data.junglers]
    );

    return (
        <div className="h-dvh w-full flex flex-col bg-[#0f172a] text-gray-100">
            <GlobalTooltip {...tooltipState} />

            <nav className="h-14 lg:h-16 bg-slate-900/80 backdrop-blur border-b border-white/10 flex items-center justify-between gap-2 px-2 sm:px-3 lg:px-8 z-30 shrink-0">
                <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                    <div className="bg-cyan-500/10 p-1.5 lg:p-2 rounded-lg border border-cyan-500/30 shrink-0"><Icons.Swords size={20} className="text-cyan-400" /></div>
                    <div className="hidden md:block"><h1 className="text-lg lg:text-xl font-bold text-white tracking-wider">JUNGLER<span className="text-cyan-400">OS</span></h1><div className="hidden lg:block text-[10px] text-gray-500 tracking-[0.2em] uppercase">Tactical Counter Engine</div></div>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                    {NAV_TABS.map(({ id, label, shortLabel, icon: TabIcon, activeClass }) => (
                        <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}
                            className={`shrink-0 px-1.5 sm:px-3 lg:px-5 py-1 sm:py-2 rounded-md text-[9px] sm:text-[11px] lg:text-xs font-bold uppercase sm:tracking-wide transition-all flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 lg:gap-2 ${view === id ? `${activeClass} text-white shadow-lg` : 'text-gray-400 hover:text-white'}`}>
                            <TabIcon size={14} /><span className="lg:hidden">{shortLabel}</span><span className="hidden lg:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {notice && (
                <div role="alert" className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-3 lg:px-8 py-2 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2"><Icons.Info size={14} className="shrink-0" /> {notice}</span>
                    <button type="button" onClick={() => setNotice(null)} className="text-amber-300 hover:text-white font-bold uppercase tracking-wide shrink-0">Dismiss</button>
                </div>
            )}

            <main className="flex-1 flex min-h-0 overflow-hidden relative">
                {view === 'draft' && (
                    <DraftLab
                        draftState={draftState}
                        enemyLanes={enemyLanes}
                        scoring={scoring}
                        onlyPool={onlyPool}
                        setOnlyPool={setOnlyPool}
                        hasPool={hasPool}
                        customImages={customImages}
                        setTooltip={setTooltipState}
                        onOpenDatabase={() => setView('editor')}
                        resultRecorder={{ junglerIds: data.junglers, lastRecord, onRecord: recordResult, onUndoRecord: undoRecord, onNewDraft: draftState.newDraft }}
                    />
                )}
                {view === 'editor' && (
                    <DatabaseEditor
                        junglers={data.junglers}
                        matchups={data.matchups}
                        comfort={comfort}
                        editorJungler={editorJungler}
                        setEditorJungler={setEditorJungler}
                        dispatch={dispatch}
                        onAddJungler={() => setIsAddingJungler(true)}
                        onDeleteJungler={handleDeleteJungler}
                        onEditQuickNote={(enemyId, text) => setEditingNote({ field: 'quickNote', enemyId, text })}
                        onEditComment={(enemyId, text) => setEditingNote({ field: 'comment', enemyId, text })}
                        customImages={customImages}
                        setTooltip={setTooltipState}
                        draggingSource={draggingSource}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                )}
                {view === 'history' && (
                    <History
                        history={history}
                        ratings={data.matchups}
                        customImages={customImages}
                        onDeleteGame={(id) => setHistory(current => removeGame(current, id))}
                        onSetTier={(junglerId, enemyId, tier) => dispatch({ type: 'setTier', junglerId, enemyId, tier })}
                        onOpenDraft={() => setView('draft')}
                    />
                )}
                {view === 'assets' && <AssetManager customImages={customImages} onUpload={handleAssetUpload} />}
                {view === 'data' && <DataHub stats={stats} onExport={handleExport} onImport={handleImport} onReset={handleReset} />}
            </main>

            {editingNote && editingNote.field === 'comment' && (
                <TacticalNoteModal heroName={heroName(editingNote.enemyId)} text={editingNote.text} onChange={(text) => setEditingNote({ ...editingNote, text })} onCancel={() => setEditingNote(null)} onSave={saveNote} />
            )}
            {editingNote && editingNote.field === 'quickNote' && (
                <QuickTipModal heroName={heroName(editingNote.enemyId)} text={editingNote.text} onChange={(text) => setEditingNote({ ...editingNote, text })} onCancel={() => setEditingNote(null)} onSave={saveNote} />
            )}
            {isAddingJungler && (
                <AddJunglerModal options={addJunglerOptions} value={newJunglerId} onChange={setNewJunglerId} onCancel={() => { setIsAddingJungler(false); setNewJunglerId(''); }} onAdd={handleAddJungler} />
            )}
            {pendingImport && (
                <ImportDialog
                    summary={{
                        fileName: pendingImport.fileName,
                        junglers: pendingImport.data.junglers.length,
                        ratings: countRatings(pendingImport.data.matchups),
                        comfort: Object.keys(pendingImport.data.comfort || {}).length,
                        games: pendingImport.history.length,
                        icons: Object.keys(pendingImport.images).length,
                        unmatched: pendingImport.unmatched,
                    }}
                    onMerge={() => applyImport('merge')}
                    onReplace={() => applyImport('replace')}
                    onCancel={() => setPendingImport(null)}
                />
            )}
        </div>
    );
}
