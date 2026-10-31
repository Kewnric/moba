import { useEffect, useId, useRef, useState } from 'react';
import { GROUP_IDEAS } from '../data/skillGroups.js';
import { TIER_LABELS } from '../data/tiers.js';
import { Icons } from './Icons.jsx';
import HeroAvatar from './HeroAvatar.jsx';
import { TierButtons } from './ui.jsx';

const UNMATCHED_NAMES_SHOWN = 8;
const NON_TEXT_INPUTS = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'range', 'color'];
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

// Shared pop-up. Esc or a click outside closes it, Enter submits it, Tab keeps focus inside it, and focus
// moves to the element marked data-autofocus (or the first field) and back to where it was on close.
export function Dialog({ title, icon: TitleIcon, onClose, onSubmit, children, footer, wide = false }) {
    const titleId = useId();
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const outside = !focusable.includes(document.activeElement);
            if (e.shiftKey && (outside || document.activeElement === first)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (outside || document.activeElement === last)) {
                e.preventDefault();
                first.focus();
            }
            return;
        }
        // Enter is handled on keydown because some keyboards never trigger the browser's own form submit.
        // Fields with their own Enter handling call preventDefault first, and textareas keep Enter for new lines.
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
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseRef.current(); }}>
            <form ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
                onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit(); }}
                onKeyDown={handleKeyDown}
                className={`bg-ink-2 border border-line-strong p-4 w-full ${wide ? 'max-w-md' : 'max-w-sm'} max-h-full overflow-y-auto scroll-thin focus:outline-none animate-rise`}>
                <h3 id={titleId} className="display text-xl mb-3 flex items-center gap-2 text-fg">{TitleIcon && <TitleIcon size={17} className="text-accent shrink-0" />}<span className="min-w-0">{title}</span></h3>
                {children}
                <div className="flex flex-wrap justify-end gap-2 mt-4">{footer}</div>
            </form>
        </div>
    );
}

// Asks before a destructive action. Focus starts on Cancel, so pressing Enter by habit changes nothing.
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
    return (
        <Dialog title={title} icon={Icons.Trash2} onClose={onCancel} onSubmit={onConfirm}
            footer={<>
                <button type="button" data-autofocus onClick={onCancel} className="btn btn-quiet">Cancel</button>
                <button type="submit" className="btn btn-danger">{confirmLabel}</button>
            </>}>
            <p className="text-sm text-fg-muted">{message}</p>
        </Dialog>
    );
}

// One matchup: its tier, where that tier comes from, and your notes. Opened by tapping a hero on a tier list.
export function MatchupDialog({ junglerName, enemyName, enemyId, rating, note, onSetTier, onClearTier, onSaveNotes, onClose }) {
    const [quickNote, setQuickNote] = useState(note.quickNote || '');
    const [comment, setComment] = useState(note.comment || '');
    const save = () => {
        onSaveNotes({ quickNote, comment });
        onClose();
    };
    return (
        <Dialog title={<>{junglerName} <span className="text-fg-faint">vs</span> {enemyName}</>} wide onClose={onClose} onSubmit={save}
            footer={<>
                <button type="button" onClick={onClose} className="btn btn-quiet">Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
            </>}>
            <div className="flex items-center gap-3">
                <HeroAvatar heroId={enemyId} className="w-14 h-14 shrink-0" />
                <div className="min-w-0">
                    <TierButtons value={rating ? rating.tier : null} inherited={Boolean(rating && rating.source === 'group')} label={`Rate ${enemyName}`}
                        onChange={(tier) => (rating && rating.source === 'hero' && rating.tier === tier ? onClearTier() : onSetTier(tier))} />
                    <p className="text-xs text-fg-muted mt-1.5">
                        {!rating && 'Not rated. Counts as Even.'}
                        {rating && rating.source === 'group' && `${TIER_LABELS[rating.tier]}, from ${rating.groupName}. Tap a letter to rate this hero directly.`}
                        {rating && rating.source === 'hero' && `${TIER_LABELS[rating.tier]}, your rating${rating.overrides ? `, replacing ${rating.overrides.groupName} (${rating.overrides.tier})` : ''}. Tap it again to remove it.`}
                    </p>
                </div>
            </div>
            <label className="block mt-3">
                <span className="label text-fg-faint block mb-1">Quick tip</span>
                <input type="text" maxLength={30} className="field" placeholder="Ult cancels their S2 (30 characters)" value={quickNote} onChange={(e) => setQuickNote(e.target.value)} />
            </label>
            <label className="block mt-3">
                <span className="label text-fg-faint block mb-1">Long note</span>
                <textarea rows={3} className="field resize-none" placeholder="How you play this matchup. Shows on the stat sheet." value={comment} onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }} />
            </label>
        </Dialog>
    );
}

// Picks a hero to add to the jungler roster; `options` are the heroes not in it yet.
export function AddJunglerModal({ options, value, onChange, onCancel, onAdd }) {
    const add = () => { if (value) onAdd(); };
    return (
        <Dialog title="Add a jungler" icon={Icons.Plus} onClose={onCancel} onSubmit={add}
            footer={<>
                <button type="button" onClick={onCancel} className="btn btn-quiet">Cancel</button>
                <button type="submit" disabled={!value} className="btn btn-primary">Add hero</button>
            </>}>
            <select data-autofocus aria-label="Hero to add" className="field" value={value} onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && value) { e.preventDefault(); add(); } }}>
                <option value="" disabled>Choose a hero...</option>
                {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
        </Dialog>
    );
}

export function CopyTierListModal({ junglerName, options, onCopy, onCancel }) {
    const [fromId, setFromId] = useState('');
    const copy = () => { if (fromId) onCopy(fromId); };
    return (
        <Dialog title={`Copy a tier list to ${junglerName}`} icon={Icons.Copy} onClose={onCancel} onSubmit={copy}
            footer={<>
                <button type="button" onClick={onCancel} className="btn btn-quiet">Cancel</button>
                <button type="submit" disabled={!fromId} className="btn btn-primary">Replace and copy</button>
            </>}>
            <select data-autofocus aria-label="Jungler to copy from" className="field" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="" disabled>Copy from...</option>
                {options.map((option) => <option key={option.id} value={option.id}>{option.name} ({option.rated} rated)</option>)}
            </select>
            <p className="text-xs text-fg-muted mt-2">Good for junglers that play alike. This replaces all of {junglerName}'s tiers and group ratings. Their notes stay.</p>
        </Dialog>
    );
}

export function NewGroupModal({ existingCategories, onCreate, onCancel }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const listId = useId();
    const create = () => { if (name.trim()) onCreate({ name, category }); };
    return (
        <Dialog title="New skill group" icon={Icons.Layers} wide onClose={onCancel} onSubmit={create}
            footer={<>
                <button type="button" onClick={onCancel} className="btn btn-quiet">Cancel</button>
                <button type="submit" disabled={!name.trim()} className="btn btn-primary">Create</button>
            </>}>
            <label className="block">
                <span className="label text-fg-faint block mb-1">Name</span>
                <input type="text" data-autofocus maxLength={40} className="field" placeholder="What skill do these heroes share?" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block mt-3">
                <span className="label text-fg-faint block mb-1">Category</span>
                <input type="text" maxLength={40} className="field" list={listId} placeholder="Movement, Evasion, Threat..." value={category} onChange={(e) => setCategory(e.target.value)} />
                <datalist id={listId}>{existingCategories.map((option) => <option key={option} value={option} />)}</datalist>
            </label>
            <div className="mt-3">
                <div className="label text-fg-faint mb-1.5">Or start from an idea</div>
                <div className="flex flex-wrap gap-1">
                    {GROUP_IDEAS.map((idea) => (
                        <button key={idea.name} type="button" className="chip !normal-case !tracking-normal" onClick={() => { setName(idea.name); setCategory(idea.category); }}>{idea.name}</button>
                    ))}
                </div>
            </div>
        </Dialog>
    );
}

// Shown after choosing a backup file, before anything changes.
export function ImportDialog({ summary, onMerge, onReplace, onCancel }) {
    const counts = [
        [summary.junglers, 'jungler'],
        [summary.ratings, 'matchup rating'],
        [summary.comfort, 'comfort rating'],
        [summary.groups, 'skill group'],
        [summary.games, 'recorded game'],
    ];
    const shownNames = summary.unmatched.slice(0, UNMATCHED_NAMES_SHOWN);
    const hiddenNames = summary.unmatched.length - shownNames.length;
    return (
        <Dialog title="Restore backup" icon={Icons.Upload} onClose={onCancel} onSubmit={onMerge}
            footer={<>
                <button type="button" onClick={onCancel} className="btn btn-quiet">Cancel</button>
                <button type="button" onClick={onReplace} className="btn btn-danger">Replace my data</button>
                <button type="submit" data-autofocus className="btn btn-primary">Merge</button>
            </>}>
            <p className="text-xs text-fg-muted mb-2 break-all">{summary.fileName}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-fg-muted mb-3">
                {counts.map(([count, label]) => <li key={label}><span className="font-semibold text-fg tabular-nums">{count}</span> {label}{count === 1 ? '' : 's'}</li>)}
            </ul>
            {summary.unmatched.length > 0 && (
                <p className="text-xs text-accent mb-3">These names aren't heroes and will be skipped: {shownNames.join(', ')}{hiddenNames > 0 ? `, and ${hiddenNames} more` : ''}.</p>
            )}
            {summary.skippedIcons > 0 && (
                <p className="text-xs text-fg-muted mb-3">This backup has {summary.skippedIcons} custom icon{summary.skippedIcons === 1 ? '' : 's'} from an older version. JunglerOS now always uses the official portraits, so they're skipped.</p>
            )}
            <p className="text-xs text-fg-muted"><span className="text-fg font-semibold">Merge</span> keeps your data and adds the backup's. Where both rate the same matchup, the backup wins.</p>
            <p className="text-xs text-fg-muted mt-1"><span className="text-bad font-semibold">Replace</span> deletes your current ratings, notes, comfort, skill groups and games first.</p>
        </Dialog>
    );
}
