import { useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { RATING_SOURCES } from '../data/ratingSources.js';
import { STATS_INFO } from '../data/stats.js';
import { filterHeroes } from '../lib/heroFilter.js';
import { Icons } from '../components/Icons.jsx';
import { Switch } from '../components/DraftBoard.jsx';
import HeroAvatar from '../components/HeroAvatar.jsx';

const STATS_RANK = `${STATS_INFO.rank[0].toUpperCase()}${STATS_INFO.rank.slice(1)}`;
const BAN_COUNTS = [3, 4, 5];
const SECTIONS = [
    { id: 'settings-draft', label: 'Draft' },
    { id: 'settings-backup', label: 'Backup' },
    { id: 'settings-icons', label: 'Icons' },
    { id: 'settings-stats', label: 'Stats' },
    { id: 'settings-reset', label: 'Reset' },
];
const CARD = 'rounded-2xl border border-white/10 bg-slate-900/60 p-4 lg:p-6 scroll-mt-3';
const TITLE = 'text-base font-bold text-white flex items-center gap-2';
const INTRO = 'text-xs text-gray-400 mt-1';
const TILE = 'flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-slate-800 hover:border-white/20 p-4 text-left transition-colors';

function Choice({ label, options, value, onChange, disabled = false }) {
    return (
        <div role="group" aria-label={label} className={`inline-flex rounded-md border border-white/10 overflow-hidden ${disabled ? 'opacity-40' : ''}`}>
            {options.map(option => (
                <button key={option.value} type="button" disabled={disabled} aria-pressed={option.value === value} onClick={() => onChange(option.value)}
                    className={`px-3 h-8 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 disabled:cursor-not-allowed ${option.value === value ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'}`}>
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function SettingRow({ title, description, children }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 py-3 border-t border-white/5 first:border-t-0">
            <div className="min-w-0">
                <div className="text-sm text-white">{title}</div>
                {description && <div className="text-[11px] text-gray-500 mt-0.5">{description}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

export default function Settings({ preferences, onPreferencesChange, stats, onExport, onImport, onReset, customImages, onUploadIcon, onResetIcon }) {
    const [iconSearch, setIconSearch] = useState('');
    const [onlyCustom, setOnlyCustom] = useState(false);
    const customCount = Object.keys(customImages).length;
    const iconHeroes = filterHeroes(HEROES, { search: iconSearch }).filter(hero => !onlyCustom || customImages[hero.id]);

    const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-8 animate-fadeIn">
            <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2"><Icons.Sliders size={20} className="text-emerald-400" /> Settings</h1>
                    <nav aria-label="Settings sections" className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                        {SECTIONS.map(section => (
                            <button key={section.id} type="button" onClick={() => jumpTo(section.id)} className="shrink-0 px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-semibold text-gray-300 hover:text-white hover:border-white/30">{section.label}</button>
                        ))}
                    </nav>
                </div>

                <section id="settings-draft" aria-labelledby="settings-draft-title" className={CARD}>
                    <h2 id="settings-draft-title" className={TITLE}><Icons.Target size={16} className="text-cyan-400" /> Draft</h2>
                    <p className={INTRO}>Defaults for new drafts. The Bans switch on the draft board changes the current draft and these settings together.</p>
                    <div className="mt-3">
                        <SettingRow title="Ban phase" description="Turn off for modes without bans, such as Classic or low ranks.">
                            <Switch label={preferences.banPhase ? 'On' : 'Off'} checked={preferences.banPhase} onChange={(on) => onPreferencesChange({ banPhase: on })} />
                        </SettingRow>
                        <SettingRow title="Bans per team" description="Match the number your draft screen shows.">
                            <Choice label="Bans per team" value={preferences.bansPerTeam} disabled={!preferences.banPhase} onChange={(count) => onPreferencesChange({ bansPerTeam: count })}
                                options={BAN_COUNTS.map(count => ({ value: count, label: String(count) }))} />
                        </SettingRow>
                        <SettingRow title="First pick in a new draft" description="You can still switch it on the board for each game.">
                            <Choice label="First pick in a new draft" value={preferences.firstPick} onChange={(team) => onPreferencesChange({ firstPick: team })}
                                options={[{ value: 'ally', label: 'Your team' }, { value: 'enemy', label: 'Enemy' }]} />
                        </SettingRow>
                        <SettingRow title="Recommendations use" description={`${(RATING_SOURCES.find(source => source.value === preferences.ratingSource) || RATING_SOURCES[1]).description} Applies right away, and you can also switch it on the recommendation.`}>
                            <Choice label="Recommendations use" value={preferences.ratingSource} onChange={(source) => onPreferencesChange({ ratingSource: source })}
                                options={RATING_SOURCES.map(({ value, label }) => ({ value, label }))} />
                        </SettingRow>
                    </div>
                </section>

                <section id="settings-backup" aria-labelledby="settings-backup-title" className={CARD}>
                    <h2 id="settings-backup-title" className={TITLE}><Icons.Database size={16} className="text-purple-400" /> Backup and restore</h2>
                    <p className={INTRO}>Everything is saved in this browser. Export a backup to keep it safe or move it to another device.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        <button type="button" onClick={onExport} className={TILE}>
                            <Icons.Download size={24} className="text-cyan-400 shrink-0" />
                            <div><div className="text-sm font-bold text-white">Export backup</div><div className="text-[11px] text-gray-400">Ratings, notes, roster, comfort, custom icons and game history as a JSON file.</div></div>
                        </button>
                        <label className={`${TILE} cursor-pointer focus-within:ring-2 focus-within:ring-purple-400`}>
                            <Icons.Upload size={24} className="text-purple-400 shrink-0" />
                            <div><div className="text-sm font-bold text-white">Restore backup</div><div className="text-[11px] text-gray-400">Preview a backup file, then merge it with your data or replace your data.</div></div>
                            <input type="file" accept=".json,application/json" className="sr-only" onChange={onImport} />
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500 mt-3">
                        <span>Roster <span className="text-white font-mono">{stats.junglerCount}</span></span>
                        <span>Ratings <span className="text-white font-mono">{stats.matchupCount}</span></span>
                        <span>Games <span className="text-white font-mono">{stats.gameCount}</span></span>
                        <span>Custom icons <span className="text-white font-mono">{stats.imageCount}</span></span>
                    </div>
                </section>

                <section id="settings-icons" aria-labelledby="settings-icons-title" className={CARD}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 id="settings-icons-title" className={TITLE}><Icons.Image size={16} className="text-orange-400" /> Custom icons</h2>
                            <p className={INTRO}>Tap a hero to upload your own picture. It's cropped to a square and replaces the official portrait everywhere.</p>
                        </div>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{customCount} custom</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="relative flex-1 min-w-[180px]">
                            <Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input type="search" aria-label="Search heroes" placeholder="Search heroes..." className="w-full bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5" value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} />
                        </div>
                        <Switch label="Only custom" checked={onlyCustom} onChange={setOnlyCustom} />
                    </div>
                    {iconHeroes.length === 0 ? (
                        <p className="text-xs text-gray-500 mt-4">{onlyCustom ? 'No custom icons yet.' : 'No heroes match.'}</p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-4 max-h-[26rem] overflow-y-auto pr-1 scrollbar-hide">
                            {iconHeroes.map(hero => {
                                const custom = Boolean(customImages[hero.id]);
                                return (
                                    <div key={hero.id} className="flex flex-col items-center gap-1 pt-1.5">
                                        <label className="relative group cursor-pointer rounded-xl focus-within:ring-2 focus-within:ring-orange-400">
                                            <HeroAvatar heroId={hero.id} size="lg" showTooltip={false} customImages={customImages} />
                                            <span className="absolute inset-0 rounded-xl bg-black/60 opacity-0 [@media(hover:hover)]:group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none"><Icons.Upload size={20} className="text-white" /></span>
                                            {custom && <span className="absolute -top-1.5 -left-1.5 z-10 text-[8px] font-bold uppercase bg-orange-500 text-black rounded px-1">Custom</span>}
                                            <input type="file" accept="image/*" className="sr-only" aria-label={`Upload an icon for ${hero.name}`} onChange={(e) => onUploadIcon(e, hero.id)} />
                                        </label>
                                        <span className="text-[11px] text-gray-400 text-center truncate max-w-full">{hero.name}</span>
                                        {custom && <button type="button" onClick={() => onResetIcon(hero.id)} className="text-[10px] font-semibold text-orange-300 hover:underline">Reset</button>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section id="settings-stats" aria-labelledby="settings-stats-title" className={CARD}>
                    <h2 id="settings-stats-title" className={TITLE}><Icons.Chart size={16} className="text-amber-400" /> Matchup and win-rate stats</h2>
                    <p className={INTRO}>From {STATS_RANK}-rank games, updated {STATS_INFO.updated} (win rates cover the last {STATS_INFO.days} days). They fill in any matchup you haven't rated, at half the weight of your own ratings. Duo win rates with your teammates adjust team fit.</p>
                    <p className="text-[10px] text-gray-500 mt-2">Powered by the Rone Arena API · Game data © Moonton (Mobile Legends: Bang Bang) · API maintained by ridwaanhall / RoneAI</p>
                </section>

                <section id="settings-reset" aria-labelledby="settings-reset-title" className={`${CARD} border-red-500/30`}>
                    <h2 id="settings-reset-title" className={TITLE}><Icons.Trash2 size={16} className="text-red-400" /> Reset</h2>
                    <p className={INTRO}>Deletes your ratings, notes, roster, comfort, custom icons, game history and settings from this browser. Export a backup first if you might want them back.</p>
                    <button type="button" onClick={onReset} className="mt-4 px-4 py-2 rounded-lg border border-red-500/50 text-red-300 hover:bg-red-500/20 text-xs font-bold uppercase tracking-wide">Reset to factory defaults</button>
                </section>
            </div>
        </div>
    );
}
