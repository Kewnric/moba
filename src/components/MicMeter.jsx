import { useEffect, useRef, useState } from 'react';
import { micVerdict } from '../lib/mic.js';
import { useMicLevel } from '../hooks/useMicLevel.js';

const FALL_PER_FRAME = 0.03;
const PEAK_FALL_PER_FRAME = 0.0035;
const VERDICT_EVERY_FRAMES = 15;

// A live volume bar that rises and falls as you talk, with a marker holding the recent loudest point. It writes
// straight to the bar on each frame, so the rest of the page doesn't redraw 60 times a second.
export default function MicMeter({ active, deviceId, height = 'h-4', onVerdict, onMicState }) {
    const fillRef = useRef(null);
    const peakRef = useRef(null);
    const shown = useRef(0);
    const peak = useRef(0);
    const frames = useRef(0);
    const [percent, setPercent] = useState(0);

    const paint = (level) => {
        shown.current = Math.max(level, shown.current - FALL_PER_FRAME);
        peak.current = Math.max(level, peak.current - PEAK_FALL_PER_FRAME);
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${shown.current})`;
        if (peakRef.current) peakRef.current.style.left = `${peak.current * 100}%`;
        frames.current += 1;
        if (frames.current % VERDICT_EVERY_FRAMES === 0) {
            setPercent(Math.round(shown.current * 100));
            if (onVerdict) onVerdict(micVerdict(peak.current));
        }
    };

    const mic = useMicLevel({ active, deviceId, onLevel: paint });
    useEffect(() => { if (onMicState) onMicState(mic); }, [mic.status, mic.error, mic.micName]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={`mic-meter w-full ${height}`} role="meter" aria-label="Mic volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={active ? percent : 0}>
            <div ref={fillRef} className="mic-meter-fill" />
            <div className="mic-meter-ticks" />
            <div ref={peakRef} className="mic-meter-peak" />
        </div>
    );
}
