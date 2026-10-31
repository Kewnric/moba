import { useEffect, useRef, useState } from 'react';

const recognizer = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);

export const voiceSupported = () => Boolean(recognizer());

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
export function useVoiceControl({ enabled, lang, micDeviceId, onResult, onStop }) {
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
        let micStream = null;
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
                if (STOP_ERRORS[event.error]) stopWith(STOP_ERRORS[event.error]);
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
            const track = micStream && micStream.getAudioTracks()[0];
            try {
                // Recent Chrome and Edge can listen to a chosen mic. Others ignore this and use the browser's default.
                if (track) recognition.start(track);
                else recognition.start();
            } catch (startError) {
                if (track) {
                    try { recognition.start(); } catch (_) { /* already running */ }
                }
            }
        };

        const openChosenMic = async () => {
            if (micDeviceId && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    micStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: micDeviceId } } });
                } catch (_) {
                    micStream = null;
                }
            }
            if (stopped && micStream) micStream.getTracks().forEach((track) => track.stop());
            listen();
        };
        openChosenMic();

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
            if (micStream) micStream.getTracks().forEach((track) => track.stop());
        };
    }, [enabled, lang, micDeviceId]);

    return { status, interim, error, clearError: () => setError(null) };
}
