import { useEffect, useRef, useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { acquireMic, releaseMic } from '../lib/mic.js';

const recognizer = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);

export const voiceSupported = () => Boolean(recognizer());

// True when the page was opened from a file on this computer, where the browser never remembers mic permission.
export const openedAsFile = () => typeof window !== 'undefined' && window.location.protocol === 'file:';

// The browser's offline voice pack, where it has one. Only that mode can be told hero names ahead of time.
export async function voicePackStatus(lang) {
    const Recognition = recognizer();
    if (!Recognition || !Recognition.available || !window.SpeechRecognitionPhrase) return 'unavailable';
    try {
        return await Recognition.available({ langs: [lang], processLocally: true });
    } catch (_) {
        return 'unavailable';
    }
}

export async function installVoicePack(lang) {
    return recognizer().install({ langs: [lang], processLocally: true });
}

const HERO_NAME_BOOST = 8;
const ALTERNATIVES = 5;
const MAX_NETWORK_FAILURES = 3;
const RESTART_MS = 200;
const RETRY_MS = 1500;

const STOP_ERRORS = {
    'not-allowed': "Mic access is blocked. Allow the microphone for this site in your browser's settings, then turn voice back on.",
    'service-not-allowed': "Voice control is blocked in this browser. Allow the microphone for this site, or try Chrome or Edge.",
    'audio-capture': 'No microphone was found. Plug one in, then turn voice back on.',
    'language-not-supported': "This browser can't listen in that language. Pick another one in Settings.",
};

// Listens through the browser's speech recognition while `enabled`. Browsers stop listening after a silence, so it
// restarts until turned off. onResult gets every spelling of a finished phrase, best guess first.
export function useVoiceControl({ enabled, lang, micDeviceId, useVoicePack = false, onResult, onStop }) {
    const [status, setStatus] = useState('off'); // off, starting, listening
    const [interim, setInterim] = useState('');
    const [error, setError] = useState(null);
    const onResultRef = useRef(onResult);
    const onStopRef = useRef(onStop);
    onResultRef.current = onResult;
    onStopRef.current = onStop;

    useEffect(() => {
        if (!enabled) {
            setStatus('off');
            setInterim('');
            return undefined;
        }
        const Recognition = recognizer();
        if (!Recognition) {
            setError('Voice control needs Chrome or Edge. This browser has no speech recognition.');
            onStopRef.current();
            return undefined;
        }

        let stopped = false;
        let recognition = null;
        let restartTimer = null;
        let networkFailures = 0;
        let micTrack = null;
        let holdsMic = false;
        let packFailed = false;
        // Reusing one open mic across restarts is what stops a local file asking for permission every time.
        const shareMic = Boolean(micDeviceId) || openedAsFile();
        setError(null);
        setStatus('starting');

        const stopWith = (message) => {
            stopped = true;
            setError(message);
            onStopRef.current();
        };

        const listen = () => {
            if (stopped) return;
            recognition = new Recognition();
            recognition.lang = lang;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = ALTERNATIVES;
            const packInUse = useVoicePack && !packFailed;
            if (packInUse) {
                try {
                    recognition.processLocally = true;
                    recognition.phrases = HEROES.map((hero) => new window.SpeechRecognitionPhrase(hero.name, HERO_NAME_BOOST));
                } catch (_) {
                    packFailed = true;
                }
            }
            recognition.onstart = () => setStatus('listening');
            recognition.onresult = (event) => {
                networkFailures = 0;
                let live = '';
                for (let i = event.resultIndex; i < event.results.length; i += 1) {
                    const result = event.results[i];
                    if (result.isFinal) onResultRef.current(Array.from(result).map((alternative) => alternative.transcript));
                    else live += result[0].transcript;
                }
                setInterim(live.trim());
            };
            recognition.onerror = (event) => {
                // If the voice pack can't run, fall back to normal listening on the next restart.
                if (packInUse && ['phrases-not-supported', 'language-not-supported', 'service-not-allowed'].includes(event.error)) packFailed = true;
                else if (STOP_ERRORS[event.error]) stopWith(STOP_ERRORS[event.error]);
                else if (event.error === 'network') {
                    networkFailures += 1;
                    if (networkFailures >= MAX_NETWORK_FAILURES) stopWith("Voice can't reach this browser's speech service. Check your internet connection, or try Chrome or Edge.");
                }
            };
            recognition.onend = () => {
                if (stopped) return;
                setInterim('');
                restartTimer = setTimeout(listen, networkFailures ? RETRY_MS : RESTART_MS);
            };
            try {
                // Recent Chrome and Edge can listen to an open mic. Others ignore this and use the browser's default.
                if (micTrack) recognition.start(micTrack);
                else recognition.start();
            } catch (startError) {
                if (micTrack) {
                    try { recognition.start(); } catch (_) { /* already running */ }
                }
            }
        };

        const begin = async () => {
            if (shareMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await acquireMic(micDeviceId);
                    holdsMic = true;
                    micTrack = stream.getAudioTracks()[0] || null;
                } catch (_) {
                    micTrack = null;
                }
            }
            if (stopped) {
                if (holdsMic) releaseMic(micDeviceId);
                holdsMic = false;
                return;
            }
            listen();
        };
        begin();

        return () => {
            stopped = true;
            clearTimeout(restartTimer);
            if (recognition) {
                recognition.onend = null;
                recognition.onerror = null;
                recognition.onresult = null;
                recognition.onstart = null;
                try { recognition.abort(); } catch (_) { /* already stopped */ }
            }
            if (holdsMic) releaseMic(micDeviceId);
        };
    }, [enabled, lang, micDeviceId, useVoicePack]);

    return { status, interim, error, clearError: () => setError(null) };
}
