import { useEffect, useId, useRef } from 'react';
import { Icons } from './Icons.jsx';

const CANCEL_BUTTON = 'px-3 py-2 rounded text-xs text-gray-400 hover:text-white';
const NON_TEXT_INPUTS = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'range', 'color'];

// Shared pop-up. Esc or a click outside closes it, Enter submits it, focus moves to the element
// marked data-autofocus (or the first field) and returns to where it was when the pop-up closes.
export function Dialog({ title, icon: TitleIcon, titleClass, borderClass, onClose, onSubmit, children, footer }) {
    const titleId = useId();
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Enter is handled on keydown because some keyboards never trigger the browser's own form submit.
    // Fields with their own Enter handling call preventDefault first, and textareas keep Enter for new lines.
    const handleKeyDown = (e) => {
        if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) return;
        const { tagName, type } = e.target;
        const isTextField = tagName === 'INPUT' && !NON_TEXT_INPUTS.includes(type);
        const isSubmitButton = tagName === 'BUTTON' && type === 'submit';
        if (!isTextField && !isSubmitButton) return;
        e.preventDefault();
        if (onSubmit) onSubmit();
    };

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const panel = panelRef.current;
        const target = panel.querySelector('[data-autofocus]') || panel.querySelector('input, textarea, select') || panel;
        target.focus();
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseRef.current(); }}>
            <form ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
                onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit(); }}
                onKeyDown={handleKeyDown}
                className={`bg-slate-900 border ${borderClass} p-5 rounded-2xl w-full max-w-sm shadow-2xl focus:outline-none`}>
                <h3 id={titleId} className={`text-sm font-bold mb-3 flex items-center gap-2 ${titleClass}`}>{TitleIcon && <TitleIcon size={16} />}<span>{title}</span></h3>
                {children}
                <div className="flex flex-wrap justify-end gap-2 mt-4">{footer}</div>
            </form>
        </div>
    );
}

// Long matchup note, opened from the speech-bubble button (or a double-click) on a rated hero.
export function TacticalNoteModal({ heroName, text, onChange, onCancel, onSave }) {
    return (
        <Dialog title={<>vs <span className="text-white">{heroName}</span></>} icon={Icons.MessageSquare} titleClass="text-cyan-400" borderClass="border-white/10"
            onClose={onCancel} onSubmit={onSave}
            footer={<>
                <button type="button" onClick={onCancel} className={CANCEL_BUTTON}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg">Save Tactics</button>
            </>}>
            <textarea data-autofocus aria-label={`Long note for ${heroName}`} className="w-full h-32 bg-slate-800 border border-white/10 rounded p-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="Enter deep tactical analysis..." value={text} onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSave(); } }} />
            <p className="text-[10px] text-gray-500 mt-1">Ctrl+Enter to save · Esc to cancel</p>
        </Dialog>
    );
}

export function QuickTipModal({ heroName, text, onChange, onCancel, onSave }) {
    return (
        <Dialog title={`Quick Tip: ${heroName}`} icon={Icons.Pencil} titleClass="text-yellow-400" borderClass="border-yellow-500/30"
            onClose={onCancel} onSubmit={onSave}
            footer={<>
                <button type="button" onClick={onCancel} className={CANCEL_BUTTON}>Cancel</button>
                <button type="submit" className="px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold shadow-lg">Save Tip</button>
            </>}>
            <input data-autofocus type="text" maxLength="30" aria-label={`Quick tip for ${heroName}`} className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                placeholder="Ex: Ult cancels S2 (Max 30 chars)" value={text} onChange={(e) => onChange(e.target.value)} />
            <p className="text-[10px] text-gray-500 mt-1">Enter to save · Esc to cancel</p>
        </Dialog>
    );
}

// Picks a hero to add to the jungler roster; `options` are the heroes not in it yet.
export function AddJunglerModal({ options, value, onChange, onCancel, onAdd }) {
    const add = () => { if (value) onAdd(); };
    return (
        <Dialog title="Add Jungler" icon={Icons.Plus} titleClass="text-green-400" borderClass="border-green-500/30"
            onClose={onCancel} onSubmit={add}
            footer={<>
                <button type="button" onClick={onCancel} className={CANCEL_BUTTON}>Cancel</button>
                <button type="submit" disabled={!value} className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">Add Hero</button>
            </>}>
            <select data-autofocus aria-label="Hero to add" className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                value={value} onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && value) { e.preventDefault(); add(); } }}>
                <option value="" disabled>Choose a hero...</option>
                {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
        </Dialog>
    );
}

// Shown after choosing a backup file, before anything changes.
export function ImportDialog({ summary, onMerge, onReplace, onCancel }) {
    const counts = [
        [summary.junglers, 'junglers'],
        [summary.ratings, 'matchup ratings'],
        [summary.comfort, 'comfort ratings'],
        [summary.games, 'recorded games'],
        [summary.icons, 'custom icons'],
    ];
    return (
        <Dialog title="Restore backup" icon={Icons.Upload} titleClass="text-purple-400" borderClass="border-purple-500/30"
            onClose={onCancel} onSubmit={onMerge}
            footer={<>
                <button type="button" onClick={onCancel} className={CANCEL_BUTTON}>Cancel</button>
                <button type="button" onClick={onReplace} className="px-3 py-2 rounded border border-red-500/50 text-red-300 hover:bg-red-500/20 text-xs font-bold">Replace my data</button>
                <button type="submit" data-autofocus className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg">Merge</button>
            </>}>
            <p className="text-xs text-gray-400 mb-2 break-all">{summary.fileName}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300 mb-3">
                {counts.map(([count, label]) => <li key={label}><span className="font-mono font-bold text-white">{count}</span> {label}</li>)}
            </ul>
            {summary.unmatched.length > 0 && (
                <p className="text-[11px] text-amber-300 mb-3">These names aren't heroes and will be skipped: {summary.unmatched.join(', ')}.</p>
            )}
            <p className="text-[11px] text-gray-400"><span className="text-white font-semibold">Merge</span> keeps your data and adds the backup's. Where both rate the same matchup, the backup wins.</p>
            <p className="text-[11px] text-gray-400 mt-1"><span className="text-red-300 font-semibold">Replace</span> deletes your current ratings, notes, comfort, icons and games first.</p>
        </Dialog>
    );
}
