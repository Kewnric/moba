import { useEffect, useRef, useState } from 'react';

// The stat sheet's hexagon: six spokes inside a ticked ring, one per jungler you could pick, each labelled
// with the hero's name above their score. The scale runs 0 at the center to 100 at the outer hexagon, with
// one grid line per tier. Tapping a corner shows that jungler on the sheet.
const CX = 300;
const CY = 282;
const RING = 190;
const RING_INNER = 176;
const HEX = 128;
const AXES = 6;
const TICKS = 72;
const GRID = [25, 50, 75];
const TWEEN_MS = 240;
// Names are cut short only so far that they can't collide with the ring on the narrowest screens.
const MAX_NAME = 14;
// Barlow Condensed at the chart's name size, for sizing the tab behind the chosen hero's name.
const NAME_CHAR_WIDTH = 11;

const pointAt = (index, radius) => {
    const angle = ((-90 + (360 / AXES) * index) * Math.PI) / 180;
    return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
};

const polygon = (values) => values.map((value, index) => pointAt(index, (HEX * value) / 100).map((n) => n.toFixed(1)).join(',')).join(' ');
const ringPolygon = (percent) => polygon(Array(AXES).fill(percent));

const shorten = (name) => (name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name);

// Eases from the values on screen to the new ones, so the shape morphs as enemies are added. Reduced-motion
// users get the new shape at once.
function useTweened(target) {
    const [values, setValues] = useState(target);
    const latest = useRef(target);
    const key = target.join(',');

    useEffect(() => {
        const start = latest.current;
        const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            latest.current = target;
            setValues(target);
            return undefined;
        }
        const startTime = performance.now();
        let frame;
        const step = (now) => {
            const progress = Math.min(1, (now - startTime) / TWEEN_MS);
            const eased = 1 - (1 - progress) ** 3;
            const next = target.map((value, index) => start[index] + (value - start[index]) * eased);
            latest.current = next;
            setValues(next);
            if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return values;
}

// axes: six of { key, name, score, tier, empty, note }. Index 0 sits at the top, then clockwise.
export default function StatHexagon({ axes, selectedKey = null, onSelect = () => {}, description }) {
    const values = useTweened(axes.map((axis) => (axis.empty ? 0 : axis.score)));
    const [hoveredKey, setHoveredKey] = useState(null);
    const ticks = Array.from({ length: TICKS }, (_, index) => {
        const angle = (index / TICKS) * 2 * Math.PI;
        const major = index % 12 === 0;
        const inner = major ? RING_INNER - 6 : RING_INNER;
        return <line key={index} x1={CX + inner * Math.cos(angle)} y1={CY + inner * Math.sin(angle)} x2={CX + RING * Math.cos(angle)} y2={CY + RING * Math.sin(angle)} stroke="var(--sheet-ink)" strokeWidth={major ? 2 : 1} />;
    });

    return (
        <svg viewBox="46 28 508 466" role="group" aria-label={description} className="w-full h-auto block select-none">
            <circle cx={CX} cy={CY} r={RING} fill="none" stroke="var(--sheet-ink)" strokeWidth="2" />
            <circle cx={CX} cy={CY} r={RING_INNER} fill="none" stroke="var(--sheet-ink)" strokeWidth="1.5" />
            {ticks}

            <polygon points={ringPolygon(100)} fill="var(--sheet-tone)" stroke="var(--sheet-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points={polygon(values)} fill="var(--sheet)" stroke="var(--sheet-ink)" strokeWidth="3" strokeLinejoin="round" />
            {GRID.map((percent) => <polygon key={percent} points={ringPolygon(percent)} fill="none" stroke="var(--sheet-ink)" strokeOpacity="0.28" strokeWidth="1" />)}
            {axes.map((_, index) => {
                const [x, y] = pointAt(index, HEX);
                return <line key={index} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--sheet-ink)" strokeOpacity="0.4" strokeWidth="1" />;
            })}

            <text x={CX + 5} y={CY - HEX + 15} className="hex-scale" opacity="0.7">100</text>
            <text x={CX + 5} y={CY - HEX / 2 + 15} className="hex-scale" opacity="0.7">50</text>

            {axes.map((axis, index) => {
                if (axis.empty) return null;
                const [x, y] = pointAt(index, (HEX * values[index]) / 100);
                const big = axis.key === selectedKey || axis.key === hoveredKey;
                return <circle key={axis.key} cx={x} cy={y} r={big ? 9 : 6.5} className={`hex-dot-${axis.tier}`} stroke="var(--sheet)" strokeWidth="2" />;
            })}

            {axes.map((axis, index) => {
                const [ringX, ringY] = pointAt(index, RING);
                const side = Math.sign(Math.round(ringX - CX));
                const x = ringX + side * 14;
                const y = ringY + (index === 0 ? -2 : index === 3 ? -4 : 0);
                const name = shorten(axis.name);
                const selected = axis.key === selectedKey;
                const tabWidth = name.length * NAME_CHAR_WIDTH + 14;
                if (axis.empty) {
                    return (
                        <g key={axis.key}>
                            <text x={x} y={y + 16} textAnchor="middle" className="hex-score hex-empty">—</text>
                            <text x={x} y={y - 33} textAnchor="middle" className="hex-name hex-empty">{name}</text>
                        </g>
                    );
                }
                return (
                    <g key={axis.key} role="button" tabIndex={0} aria-pressed={selected} aria-label={axis.note} className="hex-axis"
                        onClick={() => onSelect(axis.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(axis.key); } }}
                        onMouseEnter={() => setHoveredKey(axis.key)} onMouseLeave={() => setHoveredKey(null)}>
                        <title>{axis.note}</title>
                        <rect x={x - 62} y={y - 56} width="124" height="80" fill="transparent" />
                        <text x={x} y={y + 16} textAnchor="middle" className="hex-score">{Math.round(axis.score)}</text>
                        {selected && <rect x={x - tabWidth / 2} y={y - 52} width={tabWidth} height="26" fill="var(--sheet-ink)" />}
                        <text x={x} y={y - 33} textAnchor="middle" className={`hex-name ${selected ? 'hex-name-on' : ''}`} textDecoration={axis.key === hoveredKey && !selected ? 'underline' : undefined}>{name}</text>
                    </g>
                );
            })}
        </svg>
    );
}
