import { useState } from 'react';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import { SearchField } from './ui.jsx';

const COMFORT_LABELS = { 1: 'Rarely play', 2: 'Learning', 3: 'Comfortable', 4: 'Strong', 5: 'Main' };

// Every jungler's comfort on one screen. The order stays put while you tap, so rows don't jump around.
export default function ComfortPage({ junglers, comfort, comfortWeight, onSetComfort, onOpenJungler }) {
    const [search, setSearch] = useState('');
    const query = search.trim().toLowerCase();
    const rows = [...junglers]
        .sort((a, b) => heroName(a).localeCompare(heroName(b)))
        .filter((id) => !query || heroName(id).toLowerCase().includes(query));
    const setCount = junglers.filter((id) => comfort[id]).length;

    return (
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto scroll-thin">
            <header className="p-3 lg:p-5 bg-ink-2 border-b border-line">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                        <h1 className="display text-2xl lg:text-3xl">Comfort</h1>
                        <p className="text-xs text-fg-muted mt-0.5 tabular-nums">{setCount} of {junglers.length} set. Comfort is {comfortWeight}% of every score, and a jungler you haven't set counts as 3. Your pool is every jungler with a rating here.</p>
                    </div>
                    <div className="w-full sm:w-56"><SearchField value={search} onChange={setSearch} placeholder="Find a jungler" label="Find a jungler" /></div>
                </div>
                <div className="h-[3px] bg-ink-4 mt-3" aria-hidden="true"><div className="h-full bg-accent transition-all" style={{ width: `${junglers.length ? (setCount / junglers.length) * 100 : 0}%` }} /></div>
            </header>
            <ul className="p-3 lg:p-5 grid grid-cols-1 xl:grid-cols-2 gap-x-6">
                {rows.map((id) => {
                    const level = comfort[id] || null;
                    return (
                        <li key={id} className="flex items-center gap-2.5 py-1.5 border-b border-line min-w-0">
                            <button type="button" onClick={() => onOpenJungler(id)} title={`Open ${heroName(id)}'s tier list`} className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:text-accent">
                                <HeroAvatar heroId={id} className="w-10 h-10 shrink-0" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold truncate">{heroName(id)}</span>
                                    <span className="block text-xs text-fg-faint">{level ? COMFORT_LABELS[level] : 'Not set'}</span>
                                </span>
                            </button>
                            <div role="group" aria-label={`Comfort on ${heroName(id)}`} className="inline-flex gap-[3px] shrink-0">
                                {[1, 2, 3, 4, 5].map((option) => (
                                    <button key={option} type="button" aria-pressed={level === option} title={COMFORT_LABELS[option]} onClick={() => onSetComfort(id, level === option ? null : option)}
                                        className={`w-8 h-8 display text-[15px] transition-colors ${level && option <= level ? 'bg-accent text-accent-on' : 'tier-off'}`}>{option}</button>
                                ))}
                            </div>
                        </li>
                    );
                })}
            </ul>
            {rows.length === 0 && <p className="p-6 text-center text-sm text-fg-muted">No jungler matches that.</p>}
        </div>
    );
}
