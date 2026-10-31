import { useEffect, useRef, useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { isBanSlot } from '../lib/draft.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import { LaneChips, SearchField } from './ui.jsx';

const SLOT_NAMES = { ally: 'your team', enemy: 'enemy pick', allyBans: 'ban', enemyBans: 'ban' };

const slotText = (slot) => (slot ? `Adding ${SLOT_NAMES[slot.group]}${isBanSlot(slot) ? '' : ` ${slot.index + 1}`}` : 'Draft full');

// The hero list for the draft. A column on desktop. On phones it's a sheet that opens when a slot is tapped.
export default function HeroPicker({ open, onClose, activeSlot, takenLabels, banIdeas, onPick, onChooseEnemySlot, onUndo, dragging, onDragStart, onDragEnd, onDropBack }) {
    const [lane, setLane] = useState('All');
    const [search, setSearch] = useState('');
    const heroes = filterHeroes(HEROES, { lane, search });
    const filling = isBanSlot(activeSlot);
    const searchRef = useRef(null);

    const pick = (heroId) => {
        onPick(heroId);
        setSearch('');
    };

    const pickFirstMatch = () => {
        const match = heroes.find((hero) => !takenLabels[hero.id]);
        if (!match || !activeSlot) return;
        pick(match.id);
        // Off the search box, the next letter starts a new search and number keys choose slots again.
        if (searchRef.current) searchRef.current.blur();
    };

    // Keyboard shortcuts on PC: start typing anywhere to search, 1 to 5 choose an enemy slot, Ctrl+Z undoes.
    useEffect(() => {
        const handleKey = (e) => {
            if (document.querySelector('[role="dialog"]')) return;
            const focused = document.activeElement;
            if (e.key === 'Escape' && focused === searchRef.current) {
                setSearch('');
                focused.blur();
                return;
            }
            if (focused && (['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName) || focused.isContentEditable)) return;
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                onUndo();
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (/^[1-5]$/.test(e.key)) {
                e.preventDefault();
                onChooseEnemySlot(Number(e.key) - 1);
            } else if (/^[a-z]$/i.test(e.key) && searchRef.current && searchRef.current.offsetParent !== null) {
                // Moving focus now means this same key press lands in the search box.
                searchRef.current.focus();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    return (
        <aside aria-label="Hero picker"
            onDragOver={(e) => { if (dragging) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
            onDrop={onDropBack}
            className={`${open ? 'fixed inset-0 z-40 flex animate-rise' : 'hidden'} lg:static lg:z-auto lg:flex lg:animate-none flex-col min-h-0 lg:w-[292px] lg:shrink-0 bg-ink-2 lg:border-r border-line ${dragging ? 'drop-target' : ''}`}>
            <div className="p-3 space-y-2 border-b border-line">
                <div className="flex items-center justify-between gap-2 min-h-[2.25rem]">
                    <span className={`tab-cut ${activeSlot && activeSlot.group === 'enemy' ? 'tab-cut-enemy' : activeSlot && activeSlot.group === 'ally' ? 'tab-cut-ally' : ''}`} aria-live="polite">
                        {dragging ? 'Drop to remove' : slotText(activeSlot)}
                    </span>
                    <button type="button" onClick={onClose} aria-label="Close hero list" className="btn btn-quiet lg:hidden !px-2"><Icons.X size={18} /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); pickFirstMatch(); }}>
                    <SearchField inputRef={searchRef} value={search} onChange={setSearch} placeholder="Type a name, Enter adds it" label="Search heroes" enterKeyHint="done"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pickFirstMatch(); } }} />
                </form>
                <LaneChips value={lane} onChange={setLane} />
            </div>

            {filling && banIdeas.length > 0 && (
                <div className="p-3 border-b border-line">
                    <div className="label text-accent mb-1.5">Ban these: they counter the most of your pool</div>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {banIdeas.map((idea) => (
                            <button key={idea.heroId} type="button" onClick={() => pick(idea.heroId)} title={`${heroName(idea.heroId)} counters ${idea.counters.map(heroName).join(', ') || 'none'}${idea.unfavored.length ? `, and is unfavored for ${idea.unfavored.length} more` : ''}`} className="w-12 shrink-0 text-center">
                                <HeroAvatar heroId={idea.heroId} className="w-12 h-12" />
                                <span className="block text-[11px] text-fg-muted truncate mt-0.5">{heroName(idea.heroId)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-2">
                {heroes.length === 0 ? (
                    <p className="p-6 text-center text-sm text-fg-muted">No heroes match.</p>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
                        {heroes.map((hero) => {
                            const label = takenLabels[hero.id];
                            return (
                                <button key={hero.id} type="button" disabled={Boolean(label) || !activeSlot} onClick={() => pick(hero.id)}
                                    draggable={!label} onDragStart={label ? undefined : (e) => onDragStart(e, hero.id)} onDragEnd={label ? undefined : onDragEnd}
                                    title={label ? `${hero.name} (${label})` : hero.name}
                                    className={`relative p-1 text-center transition-colors ${label ? 'opacity-35' : 'hover:bg-ink-4 active:bg-ink-4'}`}>
                                    <HeroAvatar heroId={hero.id} className={`w-full aspect-square ${label ? 'grayscale' : ''}`} />
                                    <span className="block text-[11.5px] leading-tight text-fg-muted truncate mt-1">{hero.name}</span>
                                    {label && <span className="absolute top-1 inset-x-1 label text-[11px] bg-ink text-fg text-center">{label}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
}
