import { useEffect, useRef, useState } from 'react';
import { levelFromSamples, micErrorText } from '../lib/mic.js';

const SAMPLE_SIZE = 1024;

// Opens a microphone while `active` and calls onLevel with its loudness (0 to 1) on every animation frame.
// Volume processing is off so the reading shows what the mic really picks up.
export function useMicLevel({ active, deviceId = '', onLevel }) {
    const [status, setStatus] = useState('idle'); // idle, starting, live, error
    const [error, setError] = useState(null);
    const [micName, setMicName] = useState('');
    const onLevelRef = useRef(onLevel);
    onLevelRef.current = onLevel;

    useEffect(() => {
        if (!active) {
            setStatus('idle');
            setMicName('');
            return undefined;
        }
        let cancelled = false;
        let stream = null;
        let context = null;
        let frame = null;

        const open = async () => {
            setStatus('starting');
            setError(null);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setStatus('error');
                setError('This browser can only use a mic on a secure page. Open JunglerOS from its https address.');
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
                    },
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                context = new AudioContextClass();
                if (context.state === 'suspended') await context.resume();
                const analyser = context.createAnalyser();
                analyser.fftSize = SAMPLE_SIZE;
                context.createMediaStreamSource(stream).connect(analyser);
                const samples = new Float32Array(SAMPLE_SIZE);
                const read = () => {
                    analyser.getFloatTimeDomainData(samples);
                    if (onLevelRef.current) onLevelRef.current(levelFromSamples(samples));
                    frame = requestAnimationFrame(read);
                };
                read();
                const track = stream.getAudioTracks()[0];
                setMicName((track && track.label) || 'Default mic');
                setStatus('live');
            } catch (openError) {
                console.warn('JunglerOS could not open the mic', openError);
                setStatus('error');
                setError(micErrorText(openError));
            }
        };
        open();

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            if (stream) stream.getTracks().forEach((track) => track.stop());
            if (context && context.state !== 'closed') context.close();
            if (onLevelRef.current) onLevelRef.current(0);
        };
    }, [active, deviceId]);

    return { status, error, micName };
}

// The microphones the browser knows about. Names only appear once you've allowed mic access, so `refresh` is
// called again after that.
export function useMicDevices() {
    const [devices, setDevices] = useState([]);

    const refresh = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices(all
                .filter((device) => device.kind === 'audioinput' && device.deviceId !== 'default' && device.deviceId !== 'communications')
                .map((device, index) => ({ id: device.deviceId, label: device.label || `Microphone ${index + 1}` })));
        } catch (listError) {
            console.warn('JunglerOS could not list microphones', listError);
        }
    };

    useEffect(() => {
        refresh();
        if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return undefined;
        navigator.mediaDevices.addEventListener('devicechange', refresh);
        return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
    }, []);

    return { devices, refresh };
}
