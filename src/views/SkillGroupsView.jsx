import { useEffect, useMemo, useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { categoriesOf } from '../lib/skillGroups.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar, { heroName } from '../components/HeroAvatar.jsx';
import { EmptyState, LaneChips, SearchField, TierButtons } from '../components/ui.jsx';

// Saves a text field when it loses focus or Enter is pressed, so typing a name doesn't save on every key.
function SavedField({ label, value, onSave, list, placeholder }) {
    const [text, setText] = useState(value);
    useEffect(() => { setText(value); }, [value]);
    const save = () => {
        if (text.trim() && text.trim() !== value) onSave(text.trim());
        else setText(value);
    };
    return (
        <label className="block min-w-0">
            <span className="label text-fg-faint block mb-1">{label}</span>
            <input type="text" className="field" value={text} list={list} placeholder={placeholder} maxLength={40} onChange={(e) => setText(e.target.value)} onBlur={save}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
        </label>
    );
}

function GroupEditor({ group, data, categories, dispatch, onDelete, onBack }) {
    const [search, setSearch] = useState('');
    const [lane, setLane] = useState('All');
    const members = useMemo(() => new Set(group.heroIds), [group.heroIds]);
    const heroes = filterHeroes(HEROES, { lane, search });
    const comfort = data.comfort || {};
    const groupRatings = data.groupRatings || {};
    const roster = [...data.junglers].sort((a, b) => ((comfort[b] || 0) - (comfort[a] || 0)) || heroName(a).localeCompare(heroName(b)));

    const toggle = (heroId) => dispatch({ type: 'toggleGroupHero', groupId: group.id, heroId });

    return (
        <div className="p-3 lg:p-5 space-y-4 max-w-4xl">
            <button type="button" onClick={onBack} className="btn btn-quiet lg:hidden !px-1"><span aria-hidden="true">←</span> All groups</button>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end">
                <SavedField label="Group name" value={group.name} onSave={(name) => dispatch({ type: 'updateGroup', groupId: group.id, name })} />
                <SavedField label="Category" value={group.category} list="skill-categories" placeholder="Movement" onSave={(category) => dispatch({ type: 'updateGroup', groupId: group.id, category })} />
                <datalist id="skill-categories">{categories.map(({ category }) => <option key={category} value={category} />)}</datalist>
                <button type="button" onClick={() => onDelete(group)} className="btn btn-danger"><Icons.Trash2 size={14} /> Delete</button>
            </div>

            <section aria-label={`Heroes in ${group.name}`} className="panel">
                <div className="p-3 border-b border-line space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="tab-cut">Heroes · {group.heroIds.length}</span>
                        <span className="text-xs text-fg-muted">Tap to add or remove.</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[2.25rem]">
                        {group.heroIds.map((heroId) => (
                            <button key={heroId} type="button" onClick={() => toggle(heroId)} aria-label={`Remove ${heroName(heroId)} from ${group.name}`} className="flex items-center gap-1 pr-1.5 h-8 bg-ink-4 hover:bg-enemy hover:text-[#1a0603] text-fg transition-colors">
                                <HeroAvatar heroId={heroId} className="w-8 h-8" />
                                <span className="text-xs font-semibold">{heroName(heroId)}</span>
                                <Icons.X size={12} />
                            </button>
                        ))}
                        {group.heroIds.length === 0 && <span className="text-sm text-fg-faint self-center">No heroes yet. Tap some below.</span>}
                    </div>
                    <SearchField value={search} onChange={setSearch} placeholder="Search heroes" label="Search heroes" />
                    <LaneChips value={lane} onChange={setLane} />
                </div>
                <div className="p-2 max-h-[340px] overflow-y-auto scroll-thin">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
                        {heroes.map((hero) => {
                            const inGroup = members.has(hero.id);
                            return (
                                <button key={hero.id} type="button" aria-pressed={inGroup} onClick={() => toggle(hero.id)} title={hero.name}
                                    className={`relative p-1 text-center transition-colors ${inGroup ? 'bg-accent text-accent-on' : 'hover:bg-ink-4 text-fg-muted'}`}>
                                    <HeroAvatar heroId={hero.id} className="w-full aspect-square" />
                                    <span className="block text-[11.5px] leading-tight truncate mt-1">{hero.name}</span>
                                    {inGroup && <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-accent-on flex items-center justify-center"><Icons.Check size={12} /></span>}
                                </button>
                            );
                        })}
                    </div>
                    {heroes.length === 0 && <p className="p-6 text-center text-sm text-fg-muted">No heroes match.</p>}
                </div>
            </section>

            <section aria-label={`How your junglers handle ${group.name}`} className="panel">
                <div className="p-3 border-b border-line">
                    <span className="tab-cut">Your junglers vs {group.name}</span>
                    <p className="text-xs text-fg-muted mt-2">Set one tier per jungler here instead of opening each tier list. Tap a letter again to clear it.</p>
                </div>
                <ul className="max-h-[420px] overflow-y-auto scroll-thin">
                    {roster.map((junglerId) => {
                        const tier = (groupRatings[junglerId] || {})[group.id] || null;
                        return (
                            <li key={junglerId} className="flex items-center gap-2.5 px-3 py-1.5 border-b border-line last:border-b-0">
                                <HeroAvatar heroId={junglerId} className="w-9 h-9 shrink-0" />
                                <span className="flex-1 min-w-0 text-sm font-semibold truncate">{heroName(junglerId)}</span>
                                <TierButtons compact value={tier} label={`${heroName(junglerId)} against ${group.name}`}
                                    onChange={(next) => dispatch(next === tier ? { type: 'clearGroupTier', junglerId, groupId: group.id } : { type: 'setGroupTier', junglerId, groupId: group.id, tier: next })} />
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}

// Your skill categories: create groups of heroes with similar skills, then rate them in one move.
export default function SkillGroupsView({ data, selectedId, setSelectedId, dispatch, onNewGroup, onDeleteGroup }) {
    const groups = data.skillGroups || [];
    const categories = useMemo(() => categoriesOf(groups), [groups]);
    const selected = groups.find((group) => group.id === selectedId) || null;
    const ratedBy = (groupId) => Object.values(data.groupRatings || {}).filter((ratings) => ratings[groupId]).length;

    return (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row animate-fadeIn">
            <aside aria-label="Skill groups" className={`${selected ? 'hidden lg:flex' : 'flex'} flex-1 lg:flex-none lg:w-[300px] lg:shrink-0 flex-col min-h-0 bg-ink-2 lg:border-r border-line`}>
                <div className="p-3 border-b border-line space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="tab-cut">Skill groups · {groups.length}</span>
                        <button type="button" onClick={onNewGroup} className="btn btn-primary !min-h-[2rem]"><Icons.Plus size={14} /> New</button>
                    </div>
                    <p className="text-xs text-fg-muted">Group heroes that share a skill you have to play around. Rate a group once and every hero in it gets that tier.</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 space-y-3">
                    {categories.map(({ category, groups: inCategory }) => (
                        <div key={category}>
                            <div className="label text-fg-faint mb-1.5">{category}</div>
                            <ul className="space-y-1">
                                {inCategory.map((group) => (
                                    <li key={group.id}>
                                        <button type="button" onClick={() => setSelectedId(group.id)} aria-current={group.id === selectedId ? 'true' : undefined}
                                            className={`w-full text-left p-2 border transition-colors ${group.id === selectedId ? 'bg-ink-4 border-accent' : 'bg-ink-3 border-line hover:border-line-strong'}`}>
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-sm text-fg truncate">{group.name}</span>
                                                <span className="label text-fg-faint tabular-nums shrink-0">{group.heroIds.length}</span>
                                            </span>
                                            <span className="flex gap-[3px] mt-1.5 h-6 overflow-hidden">
                                                {group.heroIds.slice(0, 7).map((heroId) => <HeroAvatar key={heroId} heroId={heroId} className="w-6 h-6 shrink-0" />)}
                                                {group.heroIds.length === 0 && <span className="text-xs text-fg-faint self-center">Empty</span>}
                                            </span>
                                            <span className="block text-[11.5px] text-fg-faint mt-1">Rated for {ratedBy(group.id)} jungler{ratedBy(group.id) === 1 ? '' : 's'}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    {groups.length === 0 && <p className="text-sm text-fg-muted">No skill groups yet. Create one for each kind of skill that annoys you.</p>}
                </div>
            </aside>

            <div className={`${selected ? 'block' : 'hidden lg:block'} flex-1 min-w-0 min-h-0 overflow-y-auto scroll-thin`}>
                {selected ? (
                    <GroupEditor key={selected.id} group={selected} data={data} categories={categories} dispatch={dispatch} onDelete={onDeleteGroup} onBack={() => setSelectedId(null)} />
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <EmptyState icon={Icons.Layers} title="Pick a group to edit">Add or remove heroes, rename it, or set a tier for each of your junglers.</EmptyState>
                    </div>
                )}
            </div>
        </div>
    );
}
