import { useState } from 'react';
import { ONLINE_URL, VOICE_COMMANDS } from '../data/voiceCommands.js';
import { openedAsFile } from '../hooks/useVoiceControl.js';
import { Icons } from './Icons.jsx';
import HeroAvatar, { heroName } from './HeroAvatar.jsx';
import MicMeter from './MicMeter.jsx';

// Phones usually can't share the mic between speech recognition and a volume meter.
const canShareMic = () => !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function VoiceCommandList() {
    return (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {VOICE_COMMANDS.map(({ say, does }) => (
                <li key={say} className="min-w-0"><span className="font-semibold text-fg">{say}</span> <span className="text-fg-muted">· {does}</span></li>
            ))}
        </ul>
    );
}

// Browsers never remember mic permission for a page opened from a file, so it's worth moving to the online version.
export function LocalFileNotice({ onExport, onDismiss }) {
    if (!openedAsFile()) return null;
    return (
        <div role="note" className="flex items-start gap-2 border border-accent px-2.5 py-2 text-sm">
            <Icons.Info size={15} className="shrink-0 mt-0.5 text-accent" />
            <div className="min-w-0">
                <p>You opened JunglerOS as a file, so your browser can't remember that you allowed the mic. On the online version, you only allow it once. Your tier lists are saved separately for each, so export a backup here and restore it there.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    <button type="button" onClick={onExport} className="btn !min-h-[2rem]"><Icons.Download size={14} /> Export backup</button>
                    <a href={ONLINE_URL} target="_blank" rel="noreferrer" className="btn btn-primary !min-h-[2rem]">Open online version</a>
                    {onDismiss && <button type="button" onClick={onDismiss} className="btn btn-quiet !min-h-[2rem]">Not now</button>}
                </div>
            </div>
        </div>
    );
}

// What voice control is doing right now: listening, how loud you are, what it heard and what it did about it.
export default function VoiceBar({ voice, feedback, micDeviceId, onTeach, onCorrect, onOpenSettings, onExport }) {
    const [showHelp, setShowHelp] = useState(false);
    const [fileNoticeOpen, setFileNoticeOpen] = useState(true);
    const listening = voice.status === 'listening';

    if (!voice.on) {
        if (!voice.error) return null;
        return (
            <div role="alert" className="mt-2 flex items-start gap-2 border border-bad px-2.5 py-1.5 text-sm">
                <Icons.Info size={15} className="shrink-0 mt-0.5 text-bad" />
                <span className="flex-1 min-w-0">{voice.error}</span>
                <button type="button" onClick={onOpenSettings} className="btn btn-quiet !min-h-[1.75rem] shrink-0">Mic test</button>
            </div>
        );
    }

    const live = voice.interim;
    return (
        <div className="mt-2 border border-line bg-ink-3 px-2.5 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
                <span className={`flex items-center gap-1.5 label shrink-0 ${listening ? 'text-accent' : 'text-fg-muted'}`}>
                    <span className={`w-2 h-2 bg-current ${listening ? 'listen-dot' : ''}`} aria-hidden="true" />
                    {listening ? 'Listening' : 'Starting'}
                </span>
                {canShareMic() && <div className="w-16 sm:w-24 shrink-0"><MicMeter active={voice.on} deviceId={micDeviceId} height="h-2.5" /></div>}
                <p className="flex-1 min-w-0 text-sm truncate" aria-live="polite">
                    {live ? <span className="text-fg-muted italic">{live}</span> : feedback ? (
                        <>
                            <span className="text-fg-muted">"{feedback.heard}"</span>
                            {feedback.note && <span className={`ml-1.5 font-semibold ${feedback.ok ? 'text-fg' : 'text-bad'}`}>{feedback.note}</span>}
                        </>
                    ) : <span className="text-fg-faint">Say a hero's name.</span>}
                </p>
                {feedback && feedback.canTeach && !live && <button type="button" onClick={() => onTeach(feedback.heard)} className="btn !min-h-[1.75rem] !px-2 shrink-0">Teach</button>}
                <button type="button" onClick={() => setShowHelp((open) => !open)} aria-expanded={showHelp} aria-label="Voice commands" className="btn btn-quiet !min-h-[1.75rem] !px-1.5 shrink-0"><Icons.Info size={15} /></button>
            </div>
            {feedback && feedback.guesses && feedback.guesses.length > 0 && !live && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="label text-fg-faint">{feedback.picked ? 'Wrong? Did you mean' : 'Did you mean'}</span>
                    {feedback.guesses.map((heroId) => (
                        <button key={heroId} type="button" onClick={() => onCorrect(heroId)} className="flex items-center gap-1.5 h-8 pr-2 bg-ink-4 border border-line-strong hover:border-accent text-sm font-semibold transition-colors">
                            <HeroAvatar heroId={heroId} className="w-8 h-8" />
                            {heroName(heroId)}
                        </button>
                    ))}
                </div>
            )}
            {showHelp && <div className="mt-2 pt-2 border-t border-line animate-fadeIn"><VoiceCommandList /></div>}
            {openedAsFile() && fileNoticeOpen && <div className="mt-2"><LocalFileNotice onExport={onExport} onDismiss={() => setFileNoticeOpen(false)} /></div>}
        </div>
    );
}
