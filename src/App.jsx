import { useEffect, useMemo, useReducer, useState } from 'react';
import { HEROES } from './data/heroes.js';
import { rankJunglers } from './lib/engine.js';
import { unavailableIds } from './lib/draft.js';
import { dataReducer } from './lib/dataReducer.js';
import { STORAGE_KEYS, buildExport, clearSave, countRatings, loadSave, normalizeImport } from './lib/saveData.js';
import { createSafeStorage } from './lib/storage.js';
import { compressImage, downloadJson } from './lib/files.js';
import { useDraft } from './hooks/useDraft.js';
import { Icons } from './components/Icons.jsx';
import GlobalTooltip from './components/GlobalTooltip.jsx';
import { heroName } from './components/HeroAvatar.jsx';
import { AddJunglerModal, QuickTipModal, TacticalNoteModal } from './components/Modals.jsx';
import DraftLab from './views/DraftLab.jsx';
import DatabaseEditor from './views/DatabaseEditor.jsx';
import AssetManager from './views/AssetManager.jsx';
import DataHub from './views/DataHub.jsx';

const NAV_TABS = [
    { id: 'draft', label: 'Draft Lab', shortLabel: 'Draft', icon: Icons.Target, activeClass: 'bg-cyan-600' },
    { id: 'editor', label: 'Database', shortLabel: 'Ratings', icon: Icons.Edit3, activeClass: 'bg-purple-600' },
    { id: 'assets', label: 'Assets', shortLabel: 'Icons', icon: Icons.Image, activeClass: 'bg-orange-600' },
    { id: 'data', label: 'Data Hub', shortLabel: 'Data', icon: Icons.Database, activeClass: 'bg-emerald-600' },
];

const WRITE_FAILED = "Your last change couldn't be saved because browser storage is full or blocked. Export a backup from Data Hub before closing this tab.";

// Loads the save once at startup, collecting storage problems instead of reporting them mid-render.
const readStartupSave = () => {
    const problems = [];
    const startupStorage = createSafeStorage(() => window.localStorage, (problem) => problems.push(problem));
    return { ...loadSave(startupStorage), problems };
};

const startupWarning = ({ problems, unmatched }) => {
    if (problems.length) return "Saved data couldn't be loaded, so defaults are showing. Nothing was deleted.";
    if (unmatched.length) return `Your saved data was upgraded. These names didn't match a hero and were left out: ${unmatched.join(', ')}.`;
    return null;
};

export default function App() {
    const [startup] = useState(readStartupSave);
    const [data, dispatch] = useReducer(dataReducer, startup.data);
    const [customImages, setCustomImages] = useState(startup.images);
    const [storageWarning, setStorageWarning] = useState(() => startupWarning(startup));
    const draftState = useDraft();

    const [view, setView] = useState('draft');
    const [editorJungler, setEditorJungler] = useState(null);
    const [editingNote, setEditingNote] = useState(null); // { field: 'quickNote' | 'comment', enemyId, text }
    const [isAddingJungler, setIsAddingJungler] = useState(false);
    const [newJunglerId, setNewJunglerId] = useState('');
    const [draggingSource, setDraggingSource] = useState(null);
    const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, content: null });

    const storage = useMemo(() => createSafeStorage(() => window.localStorage, ({ action, key, error }) => {
        console.warn(`JunglerOS could not ${action} "${key}"`, error);
        if (action === 'write') setStorageWarning(WRITE_FAILED);
    }), []);

    // Save after every change. The startup state is already what's stored, so it isn't written back.
    useEffect(() => { if (data !== startup.data) storage.write(STORAGE_KEYS.data, data); }, [data, startup, storage]);
    useEffect(() => { if (customImages !== startup.images) storage.write(STORAGE_KEYS.images, customImages); }, [customImages, startup, storage]);

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
        downloadJson(buildExport(data, customImages), `jungleros_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = normalizeImport(JSON.parse(ev.target.result));
                dispatch({ type: 'load', data: imported.data });
                setCustomImages(imported.images);
                setEditorJungler(null);
                const skipped = imported.unmatched.length ? ` Skipped names that aren't heroes: ${imported.unmatched.join(', ')}.` : '';
                alert(`Restored ${imported.data.junglers.length} junglers, ${countRatings(imported.data.matchups)} ratings and ${Object.keys(imported.images).length} icons.${skipped}`);
            } catch (error) {
                alert(error instanceof SyntaxError ? "That file isn't valid JSON, so nothing was restored." : `${error.message} Nothing was restored.`);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const handleReset = () => {
        if (confirm("Are you sure? This will wipe all data.")) {
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
    const enemyIds = useMemo(() => draft.enemy.filter(Boolean), [draft]);
    const unavailable = useMemo(() => unavailableIds(draft), [draft]);

    const { ranked: sortedJunglers, recommended: priorityPick } = useMemo(
        () => rankJunglers(data.junglers, enemyIds, data.matchups, unavailable),
        [data, enemyIds, unavailable]
    );

    const stats = useMemo(() => ({
        junglerCount: data.junglers.length,
        imageCount: Object.keys(customImages).length,
        matchupCount: countRatings(data.matchups),
    }), [data, customImages]);

    const addJunglerOptions = useMemo(
        () => HEROES.filter(hero => !data.junglers.includes(hero.id)).map(hero => ({ id: hero.id, name: hero.name })),
        [data.junglers]
    );

    return (
        <div className="h-dvh w-full flex flex-col bg-[#0f172a] text-gray-100">
            <GlobalTooltip {...tooltipState} />

            <nav className="h-14 lg:h-16 bg-slate-900/80 backdrop-blur border-b border-white/10 flex items-center justify-between gap-3 px-3 lg:px-8 z-30 shrink-0">
                <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                    <div className="bg-cyan-500/10 p-1.5 lg:p-2 rounded-lg border border-cyan-500/30 shrink-0"><Icons.Swords size={20} className="text-cyan-400" /></div>
                    <div className="hidden sm:block"><h1 className="text-lg lg:text-xl font-bold text-white tracking-wider">JUNGLER<span className="text-cyan-400">OS</span></h1><div className="hidden lg:block text-[10px] text-gray-500 tracking-[0.2em] uppercase">Tactical Counter Engine</div></div>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                    {NAV_TABS.map(({ id, label, shortLabel, icon: TabIcon, activeClass }) => (
                        <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)} className={`shrink-0 px-3 lg:px-5 py-2 rounded-md text-[11px] lg:text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 lg:gap-2 ${view === id ? `${activeClass} text-white shadow-lg` : 'text-gray-400 hover:text-white'}`}>
                            <TabIcon size={14} /><span className="lg:hidden">{shortLabel}</span><span className="hidden lg:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {storageWarning && (
                <div role="alert" className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-3 lg:px-8 py-2 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2"><Icons.Info size={14} className="shrink-0" /> {storageWarning}</span>
                    <button type="button" onClick={() => setStorageWarning(null)} className="text-amber-300 hover:text-white font-bold uppercase tracking-wide shrink-0">Dismiss</button>
                </div>
            )}

            <main className="flex-1 flex min-h-0 overflow-hidden relative">
                {view === 'draft' && (
                    <DraftLab
                        draftState={draftState}
                        enemyIds={enemyIds}
                        sortedJunglers={sortedJunglers}
                        priorityPick={priorityPick}
                        customImages={customImages}
                        setTooltip={setTooltipState}
                        onOpenDatabase={() => setView('editor')}
                    />
                )}
                {view === 'editor' && (
                    <DatabaseEditor
                        junglers={data.junglers}
                        matchups={data.matchups}
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
        </div>
    );
}
