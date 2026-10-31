import { useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { isBanSlot } from '../lib/draft.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import { LaneChips, SearchField } from './ui.jsx';

const SLOT_NAMES = { ally: 'your team', enemy: 'enemy pick', allyBans: 'ban', enemyBans: 'ban' };

const slotText = (slot) => (slot ? `Adding ${SLOT_NAMES[slot.group]}${isBanSlot(slot) ? '' : ` ${slot.index + 1}`}` : 'Draft full');

// The hero list for the draft. A column on desktop. On phones it's a sheet that opens when a slot is tapped.
export default function HeroPicker({ open, onClose, activeSlot, takenLabels, banIdeas, onPick, dragging, onDragStart, onDragEnd, onDropBack }) {
    const [lane, setLane] = useState('All');
    const [search, setSearch] = useState('');
    const heroes = filterHeroes(HEROES, { lane, search });
    const filling = isBanSlot(activeSlot);

    const pick = (heroId) => {
        onPick(heroId);
        setSearch('');
    };

    const pickFirstMatch = () => {
        const match = heroes.find((hero) => !takenLabels[hero.id]);
        if (match && activeSlot) pick(match.id);
    };

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
                    <SearchField value={search} onChange={setSearch} placeholder="Search, Enter adds the top match" label="Search heroes" enterKeyHint="done"
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
