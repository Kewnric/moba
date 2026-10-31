import { TIER_POINTS } from '../data/tiers.js';
import { COMFORT_WEIGHTS, ENEMY_JUNGLER_WEIGHT } from '../lib/scoring.js';
import { Icons } from '../components/Icons.jsx';
import MicTester from '../components/MicTester.jsx';
import ThemePicker from '../components/ThemePicker.jsx';
import { Segmented, Switch } from '../components/ui.jsx';

const BAN_COUNTS = [3, 4, 5];
const TILE = 'flex items-center gap-3 border border-line bg-ink-3 hover:bg-ink-4 hover:border-line-strong p-4 text-left transition-colors';

function SettingRow({ title, description, children }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 py-3 border-t border-line first:border-t-0">
            <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">{title}</div>
                {description && <div className="text-xs text-fg-muted mt-0.5">{description}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function Section({ id, title, children, danger = false }) {
    return (
        <section aria-labelledby={id} className={`panel p-4 lg:p-5 ${danger ? 'border-bad' : ''}`}>
            <h2 id={id} className={`tab-cut ${danger ? 'tab-cut-enemy' : ''}`}>{title}</h2>
            {children}
        </section>
    );
}

export default function Settings({ preferences, onPreferencesChange, onEnemyOnlyChange, voice, onTeach, onForgetWord, stats, onExport, onImport, onReset }) {
    const comfort = preferences.comfortWeight;
    return (
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 lg:p-6 animate-fadeIn">
            <div className="max-w-3xl mx-auto space-y-4">
                <Section id="settings-theme" title="Color theme">
                    <p className="text-sm text-fg-muted mt-3 mb-3">Changes the whole app. Tier colors stay the same in every theme.</p>
                    <ThemePicker value={preferences.theme} onChange={(theme) => onPreferencesChange({ theme })} />
                </Section>

                <Section id="settings-scoring" title="How scores work">
                    <p className="text-sm text-fg-muted mt-3">Viability is built only from your own tier lists and comfort. There are no win rates, no meta and no team-fit guesses, and risk never lowers a score.</p>
                    <ul className="text-sm text-fg-muted mt-2 space-y-1 list-disc pl-5">
                        <li>Each enemy pick scores S {TIER_POINTS.S}, A {TIER_POINTS.A}, B {TIER_POINTS.B}, C {TIER_POINTS.C} or D {TIER_POINTS.D} from your tier for that jungler. Unrated counts as {TIER_POINTS.B}.</li>
                        <li>Matchups are the average of those. A hero you mark as their jungler counts {ENEMY_JUNGLER_WEIGHT} times.</li>
                        <li>Comfort 1 to 5 scores 0, 25, 50, 75 or 100. Not set counts as 50.</li>
                    </ul>
                    <div className="mt-3">
                        <SettingRow title="How much comfort counts" description={`Score = matchups × ${100 - comfort}% + comfort × ${comfort}%.`}>
                            <Segmented label="How much comfort counts" value={comfort} onChange={(value) => onPreferencesChange({ comfortWeight: value })}
                                options={COMFORT_WEIGHTS.map((value) => ({ value, label: `${value}%` }))} />
                        </SettingRow>
                    </div>
                </Section>

                <Section id="settings-voice" title="Voice and mic">
                    <div className="mt-3">
                        <SettingRow title="Voice control" description="Say hero names to fill slots. It only acts when what you said is clearly a hero or a command, so normal talk is ignored.">
                            <Switch label={voice.on ? 'On' : 'Off'} checked={voice.on} disabled={!voice.supported} onChange={voice.setOn} />
                        </SettingRow>
                    </div>
                    {voice.error && <p role="alert" className="text-sm text-bad">{voice.error}</p>}
                    <MicTester preferences={preferences} onPreferencesChange={onPreferencesChange} voiceOn={voice.on} onVoiceOff={() => voice.setOn(false)} onTeach={onTeach} onForgetWord={onForgetWord} />
                </Section>

                <Section id="settings-draft" title="New drafts">
                    <div className="mt-3">
                        <SettingRow title="Track your team" description="Off keeps the draft to the enemy lineup. On adds your team's slots, and their picks stop being suggested.">
                            <Switch label={preferences.enemyOnly ? 'Off' : 'On'} checked={!preferences.enemyOnly} onChange={(on) => onEnemyOnlyChange(!on)} />
                        </SettingRow>
                        <SettingRow title="Ban phase" description="Banned heroes are never suggested. Turn off for modes without bans.">
                            <Switch label={preferences.banPhase ? 'On' : 'Off'} checked={preferences.banPhase} onChange={(on) => onPreferencesChange({ banPhase: on })} />
                        </SettingRow>
                        <SettingRow title="Bans per team" description="Match the number your draft screen shows.">
                            <Segmented label="Bans per team" value={preferences.bansPerTeam} disabled={!preferences.banPhase} onChange={(count) => onPreferencesChange({ bansPerTeam: count })}
                                options={BAN_COUNTS.map((count) => ({ value: count, label: String(count) }))} />
                        </SettingRow>
                        <SettingRow title="First pick" description="Sets the draft order when you track your team.">
                            <Segmented label="First pick" value={preferences.firstPick} onChange={(team) => onPreferencesChange({ firstPick: team })}
                                options={[{ value: 'ally', label: 'Your team' }, { value: 'enemy', label: 'Enemy' }]} />
                        </SettingRow>
                    </div>
                </Section>

                <Section id="settings-backup" title="Backup and restore">
                    <p className="text-sm text-fg-muted mt-3">Everything is saved in this browser. Export a backup to keep it safe or move it to another device.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <button type="button" onClick={onExport} className={TILE}>
                            <Icons.Download size={22} className="text-accent shrink-0" />
                            <span><span className="block text-sm font-semibold text-fg">Export backup</span><span className="block text-xs text-fg-muted">Tier lists, skill groups, notes, comfort and games in one small JSON file.</span></span>
                        </button>
                        <label className={`${TILE} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-accent`}>
                            <Icons.Upload size={22} className="text-accent shrink-0" />
                            <span><span className="block text-sm font-semibold text-fg">Restore backup</span><span className="block text-xs text-fg-muted">Preview a JunglerOS .json backup, then merge it or replace your data.</span></span>
                            <input type="file" accept=".json,application/json" className="sr-only" onChange={onImport} />
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted mt-3 tabular-nums">
                        <span>Roster <span className="text-fg font-semibold">{stats.junglerCount}</span></span>
                        <span>Hero ratings <span className="text-fg font-semibold">{stats.matchupCount}</span></span>
                        <span>Skill groups <span className="text-fg font-semibold">{stats.groupCount}</span></span>
                        <span>Group ratings <span className="text-fg font-semibold">{stats.groupRatingCount}</span></span>
                        <span>Games <span className="text-fg font-semibold">{stats.gameCount}</span></span>
                    </div>
                </Section>

                <Section id="settings-reset" title="Reset" danger>
                    <p className="text-sm text-fg-muted mt-3">Deletes your tier lists, skill groups, notes, roster, comfort, game history and settings from this browser. Export a backup first if you might want them back.</p>
                    <button type="button" onClick={onReset} className="btn btn-danger mt-3">Reset to factory defaults</button>
                </Section>

                <p className="text-xs text-fg-faint text-center">Hero portraits and game data © Moonton. JunglerOS is a fan-made tool and isn't affiliated with Moonton.</p>
            </div>
        </div>
    );
}
