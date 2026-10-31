import { useEffect, useState } from 'react';
import { VOICE_LANGUAGES } from '../data/voiceCommands.js';
import { useMicDevices } from '../hooks/useMicLevel.js';
import { installVoicePack, useVoiceControl, voicePackStatus, voiceSupported } from '../hooks/useVoiceControl.js';
import { parseVoice } from '../lib/voice.js';
import { Icons } from './Icons.jsx';
import { heroName } from './HeroAvatar.jsx';
import MicMeter from './MicMeter.jsx';
import { Switch } from './ui.jsx';
import { LocalFileNotice, VoiceCommandList } from './VoiceBar.jsx';

const describe = (action) => {
    switch (action.type) {
        case 'pick': return `${action.target === 'ban' ? 'Ban' : 'Pick'} ${heroName(action.heroId)}`;
        case 'remove': return `Remove ${heroName(action.heroId)}`;
        case 'jungler': return `${heroName(action.heroId)} is their jungler`;
        case 'lock': return action.heroId ? `Lock in ${heroName(action.heroId)}` : 'Lock in the top pick';
        case 'unlock': return 'Unlock';
        case 'undo': return 'Undo';
        case 'erase': return 'Remove the last hero added';
        case 'newDraft': return 'New draft';
        case 'stopVoice': return 'Stop listening';
        default: return '';
    }
};

// The browser's offline voice pack, which listens on this device and is told every hero's name ahead of time. Only
// shown where the browser offers one.
function VoicePackRow({ lang, enabled, onChange }) {
    const [status, setStatus] = useState('unavailable');
    const [problem, setProblem] = useState(null);

    useEffect(() => {
        let current = true;
        voicePackStatus(lang).then((next) => { if (current) setStatus(next); });
        return () => { current = false; };
    }, [lang]);

    if (status === 'unavailable') return null;

    const download = async () => {
        setStatus('downloading');
        setProblem(null);
        try {
            const installed = await installVoicePack(lang);
            setStatus(installed ? 'available' : 'downloadable');
            if (installed) onChange(true);
            else setProblem("The voice pack couldn't be downloaded for this language.");
        } catch (_) {
            setStatus('downloadable');
            setProblem("The voice pack couldn't be downloaded. Check your connection and try again.");
        }
    };

    return (
        <div className="border-t border-line pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
            <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">Offline voice pack</div>
                <div className="text-xs text-fg-muted mt-0.5">Your browser listens on this device instead of its online service, and is told every hero's name first, which should help it catch them. If it does worse for you, turn it off.</div>
                {problem && <p className="text-xs text-bad mt-1">{problem}</p>}
            </div>
            <div className="shrink-0">
                {status === 'available' && <Switch label={enabled ? 'On' : 'Off'} checked={enabled} onChange={onChange} />}
                {status === 'downloadable' && <button type="button" onClick={download} className="btn">Download</button>}
                {status === 'downloading' && <span className="label text-fg-muted">Downloading...</span>}
            </div>
        </div>
    );
}

// Checks the mic before relying on it: which one is in use, a live volume bar, and a safe way to try commands.
export default function MicTester({ preferences, onPreferencesChange, voiceOn, onVoiceOff, onTeach, onForgetWord, onExport }) {
    const [testing, setTesting] = useState(false);
    const [hearing, setHearing] = useState(false);
    const [heard, setHeard] = useState(null);
    const [mic, setMic] = useState({ status: 'idle', error: null, micName: '' });
    const [verdict, setVerdict] = useState(null);
    const { devices, refresh } = useMicDevices();
    const { micDeviceId, voiceLang, voiceAliases, voiceUsePack } = preferences;
    const taught = Object.entries(voiceAliases);

    const recognition = useVoiceControl({
        enabled: hearing,
        lang: voiceLang,
        micDeviceId,
        useVoicePack: voiceUsePack,
        onStop: () => setHearing(false),
        onResult: (alternatives) => setHeard(parseVoice(alternatives, { aliases: voiceAliases })),
    });

    // Device names only appear once the mic has been allowed.
    useEffect(() => { if (mic.status === 'live') refresh(); }, [mic.status]); // eslint-disable-line react-hooks/exhaustive-deps

    const startHearing = () => {
        // The browser can only run one listener at a time.
        if (voiceOn) onVoiceOff();
        setHeard(null);
        setHearing((on) => !on);
    };

    const active = testing || hearing;

    return (
        <div className="mt-3 space-y-4">
            <LocalFileNotice onExport={onExport} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block min-w-0">
                    <span className="label text-fg-faint block mb-1">Microphone</span>
                    <select className="field" value={micDeviceId} onChange={(e) => onPreferencesChange({ micDeviceId: e.target.value })}>
                        <option value="">Browser default</option>
                        {devices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}
                    </select>
                </label>
                <label className="block min-w-0">
                    <span className="label text-fg-faint block mb-1">Voice language</span>
                    <select className="field" value={voiceLang} onChange={(e) => onPreferencesChange({ voiceLang: e.target.value })}>
                        {VOICE_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                    </select>
                </label>
            </div>

            <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button type="button" aria-pressed={testing} onClick={() => setTesting((on) => !on)} className={`btn ${testing ? '' : 'btn-primary'}`}>{testing ? 'Stop mic test' : 'Test mic'}</button>
                    <span className="text-sm text-fg-muted min-w-0 truncate">
                        {active && mic.status === 'live' ? <>In use: <span className="text-fg font-semibold">{mic.micName}</span></> : active && mic.status === 'starting' ? 'Opening the mic...' : 'Talk after you start, and watch the bar move.'}
                    </span>
                </div>
                <MicMeter active={active} deviceId={micDeviceId} height="h-6" onVerdict={setVerdict} onMicState={setMic} />
                <div className="mt-1.5 min-h-[1.25rem] text-sm" aria-live="polite">
                    {mic.status === 'error' && active && <span className="text-bad">{mic.error}</span>}
                    {mic.status === 'live' && active && verdict && <><span className="font-semibold text-fg">{verdict.label}.</span> <span className="text-fg-muted">{verdict.hint}</span></>}
                </div>
            </div>

            <div className="border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" aria-pressed={hearing} disabled={!voiceSupported()} onClick={startHearing} className="btn">{hearing ? 'Stop listening' : 'Try a command'}</button>
                    <span className="text-sm text-fg-muted">Says what it understood, without touching your draft.</span>
                </div>
                {!voiceSupported() && <p className="text-sm text-bad mt-2">Voice commands need Chrome or Edge. This browser has no speech recognition, but the mic test above still works.</p>}
                {recognition.error && <p className="text-sm text-bad mt-2">{recognition.error}</p>}
                {hearing && <p className="text-sm text-fg-muted italic mt-2 min-h-[1.25rem]">{recognition.interim || (recognition.status === 'listening' ? 'Listening...' : 'Starting...')}</p>}
                {heard && (
                    <div className="mt-2 text-sm bg-ink-3 border border-line px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1" aria-live="polite">
                        <span className="text-fg-muted">Heard "{heard.heard}":</span>
                        {heard.ignored
                            ? <><span className="font-semibold text-bad">not a hero or command.</span><button type="button" onClick={() => onTeach(heard.heard)} className="btn !min-h-[1.75rem] !px-2">Teach</button></>
                            : <span className="font-semibold text-fg">{heard.actions.map(describe).join(', ')}</span>}
                        {heard.guesses.length > 0 && <span className="text-fg-muted">Close to: {heard.guesses.map(heroName).join(', ')}.</span>}
                    </div>
                )}
            </div>

            <VoicePackRow lang={voiceLang} enabled={voiceUsePack} onChange={(on) => onPreferencesChange({ voiceUsePack: on })} />

            <div className="border-t border-line pt-3">
                <div className="label text-fg-faint mb-2">What you can say</div>
                <VoiceCommandList />
            </div>

            {taught.length > 0 && (
                <div className="border-t border-line pt-3">
                    <div className="label text-fg-faint mb-2">Words you taught it</div>
                    <ul className="flex flex-wrap gap-1.5">
                        {taught.map(([phrase, heroId]) => (
                            <li key={phrase} className="flex items-center gap-1 pl-2 h-8 bg-ink-3 border border-line text-sm">
                                <span>"{phrase}" = <span className="font-semibold">{heroName(heroId)}</span></span>
                                <button type="button" onClick={() => onForgetWord(phrase)} aria-label={`Forget ${phrase}`} className="w-7 h-7 flex items-center justify-center text-fg-muted hover:text-fg"><Icons.X size={13} /></button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-xs text-fg-faint">While voice is on, your browser sends mic audio to its own speech service to turn it into text. JunglerOS doesn't record or keep any of it. Recent Chrome and Edge listen on the mic you choose here; other browsers use their default mic for commands, so set that in the browser if commands don't respond.</p>
        </div>
    );
}
