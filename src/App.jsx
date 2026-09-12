import { useEffect, useMemo, useState } from 'react';
import { HERO_ROLES, RAW_HERO_DATA } from './data/heroes.js';
import { rankJunglers } from './lib/engine.js';
import { STORAGE_KEYS, createSafeStorage, isPlainObject, isStringArray } from './lib/storage.js';
import { compressImage, downloadJson } from './lib/files.js';
import { Icons } from './components/Icons.jsx';
import GlobalTooltip from './components/GlobalTooltip.jsx';
import { AddJunglerModal, QuickTipModal, TacticalNoteModal } from './components/Modals.jsx';
import DraftLab from './views/DraftLab.jsx';
import DatabaseEditor from './views/DatabaseEditor.jsx';
import AssetManager from './views/AssetManager.jsx';
import DataHub from './views/DataHub.jsx';

const NAV_TABS = [
    { id: 'draft', label: 'Draft Lab', icon: Icons.Target, activeClass: 'bg-cyan-600' },
    { id: 'editor', label: 'Database', icon: Icons.Edit3, activeClass: 'bg-purple-600' },
    { id: 'assets', label: 'Assets', icon: Icons.Image, activeClass: 'bg-orange-600' },
    { id: 'data', label: 'Data Hub', icon: Icons.Database, activeClass: 'bg-emerald-600' },
];

export default function App() {
    const [view, setView] = useState('draft');
    const [enemySlots, setEnemySlots] = useState([null, null, null, null, null]);

    // Database state
    const [junglerList, setJunglerList] = useState(RAW_HERO_DATA[HERO_ROLES.JUNGLE]);
    const [matchupData, setMatchupData] = useState({});
    const [customImages, setCustomImages] = useState({});
    const [editorJungler, setEditorJungler] = useState(null);

    // Modal state
    const [editingCommentHero, setEditingCommentHero] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [editingQuickNoteHero, setEditingQuickNoteHero] = useState(null);
    const [quickNoteText, setQuickNoteText] = useState('');
    const [isAddingJungler, setIsAddingJungler] = useState(false);
    const [newJunglerName, setNewJunglerName] = useState('');

    const [draggingSource, setDraggingSource] = useState(null);
    const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, content: null });
    const [storageWarning, setStorageWarning] = useState(null);

    const storage = useMemo(() => createSafeStorage(() => window.localStorage, ({ action, key, error }) => {
        console.warn(`JunglerOS could not ${action} "${key}"`, error);
        setStorageWarning(action === 'write'
            ? "Your last change couldn't be saved because browser storage is full or blocked. Export a backup from Data Hub before closing this tab."
            : "Saved data couldn't be loaded, so defaults are showing. Nothing was deleted.");
    }), []);

    useEffect(() => {
        setMatchupData(storage.read(STORAGE_KEYS.matchups, {}, isPlainObject));
        setJunglerList(storage.read(STORAGE_KEYS.junglers, RAW_HERO_DATA[HERO_ROLES.JUNGLE], isStringArray));
        setCustomImages(storage.read(STORAGE_KEYS.images, {}, isPlainObject));
    }, [storage]);

    const saveToStorage = (newData) => { setMatchupData(newData); storage.write(STORAGE_KEYS.matchups, newData); };
    const saveJunglerList = (newList) => { setJunglerList(newList); storage.write(STORAGE_KEYS.junglers, newList); };
    const saveCustomImages = (newImages) => { setCustomImages(newImages); storage.write(STORAGE_KEYS.images, newImages); };

    const handleAddJungler = () => {
        if (newJunglerName.trim() && !junglerList.includes(newJunglerName.trim())) {
            saveJunglerList([...junglerList, newJunglerName.trim()]);
            setEditorJungler(newJunglerName.trim());
            setNewJunglerName(''); setIsAddingJungler(false);
        }
    };

    const handleDeleteJungler = () => {
        if (!editorJungler) return;
        if (confirm(`Delete ${editorJungler} from roster?`)) {
            const newList = junglerList.filter(j => j !== editorJungler);
            saveJunglerList(newList);
            const newMatchupData = { ...matchupData };
            delete newMatchupData[editorJungler];
            saveToStorage(newMatchupData);
            setEditorJungler(null);
        }
    };

    const handleAssetUpload = (e, heroName) => {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, (base64) => {
                saveCustomImages({ ...customImages, [heroName]: base64 });
            });
        }
    };

    const handleExport = () => {
        const exportData = { version: "1.3", timestamp: new Date().toISOString(), matchupData, junglerList, customImages };
        downloadJson(exportData, `jungleros_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                if (!imported.matchupData && !imported.junglerList) throw new Error("Invalid file");
                if (imported.junglerList) saveJunglerList(imported.junglerList);
                if (imported.matchupData) saveToStorage(imported.matchupData);
                if (imported.customImages) saveCustomImages(imported.customImages);
                alert(`Restored: ${Object.keys(imported.customImages || {}).length} Assets, ${imported.junglerList?.length || 0} Junglers`);
            } catch { alert("Error parsing file."); }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const saveComment = () => {
        const d = { ...matchupData };
        if (!d[editorJungler]) d[editorJungler] = {};
        d[editorJungler][editingCommentHero] = { ...(d[editorJungler][editingCommentHero] || { tier: 'B' }), comment: commentText };
        saveToStorage(d); setEditingCommentHero(null); setCommentText('');
    };

    const saveQuickNote = () => {
        const d = { ...matchupData };
        if (!d[editorJungler]) d[editorJungler] = {};
        d[editorJungler][editingQuickNoteHero] = { ...(d[editorJungler][editingQuickNoteHero] || { tier: 'B' }), quickNote: quickNoteText };
        saveToStorage(d); setEditingQuickNoteHero(null); setQuickNoteText('');
    };

    const handleDragStart = (e, hero, source, index = null) => {
        e.dataTransfer.setData('hero', JSON.stringify(hero));
        e.dataTransfer.setData('source', source);
        if (index !== null) e.dataTransfer.setData('slotIndex', index);
        setDraggingSource(source);
    };
    const handleDragEnd = () => setDraggingSource(null);

    const enemyNames = useMemo(() => enemySlots.filter(Boolean).map(s => s.name), [enemySlots]);

    const { ranked: sortedJunglers, recommended: priorityPick } = useMemo(
        () => rankJunglers(junglerList, enemyNames, matchupData),
        [junglerList, enemyNames, matchupData]
    );

    const stats = useMemo(() => {
        let matchupCount = 0;
        Object.values(matchupData).forEach(d => matchupCount += Object.keys(d).length);
        return { junglerCount: junglerList.length, imageCount: Object.keys(customImages).length, matchupCount };
    }, [junglerList, customImages, matchupData]);

    const dragProps = { draggingSource, onDragStart: handleDragStart, onDragEnd: handleDragEnd };

    return (
        <div className="h-screen w-full flex flex-col bg-[#0f172a] text-gray-100">
            <GlobalTooltip {...tooltipState} />

            <nav className="h-16 bg-slate-900/80 backdrop-blur border-b border-white/10 flex items-center justify-between px-8 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/30"><Icons.Swords className="text-cyan-400" /></div>
                    <div><h1 className="text-xl font-bold text-white tracking-wider">JUNGLER<span className="text-cyan-400">OS</span></h1><div className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Tactical Counter Engine</div></div>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    {NAV_TABS.map(({ id, label, icon: TabIcon, activeClass }) => (
                        <button key={id} onClick={() => setView(id)} className={`px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${view === id ? `${activeClass} text-white shadow-lg` : 'text-gray-400 hover:text-white'}`}><TabIcon size={14} /> {label}</button>
                    ))}
                </div>
            </nav>

            {storageWarning && (
                <div role="alert" className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-8 py-2 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2"><Icons.Info size={14} /> {storageWarning}</span>
                    <button onClick={() => setStorageWarning(null)} className="text-amber-300 hover:text-white font-bold uppercase tracking-wide">Dismiss</button>
                </div>
            )}

            <main className="flex-1 flex overflow-hidden relative">
                {view === 'draft' && (
                    <DraftLab
                        enemySlots={enemySlots}
                        setEnemySlots={setEnemySlots}
                        enemyNames={enemyNames}
                        sortedJunglers={sortedJunglers}
                        priorityPick={priorityPick}
                        customImages={customImages}
                        setTooltip={setTooltipState}
                        onOpenDatabase={() => setView('editor')}
                        {...dragProps}
                    />
                )}
                {view === 'editor' && (
                    <DatabaseEditor
                        junglerList={junglerList}
                        matchupData={matchupData}
                        editorJungler={editorJungler}
                        setEditorJungler={setEditorJungler}
                        onAddJungler={() => setIsAddingJungler(true)}
                        onDeleteJungler={handleDeleteJungler}
                        onSaveMatchups={saveToStorage}
                        customImages={customImages}
                        setTooltip={setTooltipState}
                        onEditQuickNote={(heroName, note) => { setEditingQuickNoteHero(heroName); setQuickNoteText(note); }}
                        onEditComment={(heroName, comment) => { setEditingCommentHero(heroName); setCommentText(comment); }}
                        {...dragProps}
                    />
                )}
                {view === 'assets' && <AssetManager customImages={customImages} onUpload={handleAssetUpload} />}
                {view === 'data' && <DataHub stats={stats} onExport={handleExport} onImport={handleImport} />}
            </main>

            {editingCommentHero && <TacticalNoteModal heroName={editingCommentHero} text={commentText} onChange={setCommentText} onCancel={() => setEditingCommentHero(null)} onSave={saveComment} />}
            {editingQuickNoteHero && <QuickTipModal heroName={editingQuickNoteHero} text={quickNoteText} onChange={setQuickNoteText} onCancel={() => setEditingQuickNoteHero(null)} onSave={saveQuickNote} />}
            {isAddingJungler && <AddJunglerModal name={newJunglerName} onChange={setNewJunglerName} onCancel={() => setIsAddingJungler(false)} onAdd={handleAddJungler} />}
        </div>
    );
}
