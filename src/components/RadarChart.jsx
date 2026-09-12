import { Icons } from './Icons.jsx';

export default function RadarChart({ heroes, onSelect, currentHero, page, setPage }) {
    const size = 240; const center = size / 2; const radius = 75;

    const pageSize = 6;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;

    const displayHeroes = [...heroes];
    // Ensure we have enough placeholders for current page
    while (displayHeroes.length < endIndex) displayHeroes.push({ name: `Alt ${displayHeroes.length + 1}`, score: 0, isPlaceholder: true });

    const currentBatch = displayHeroes.slice(startIndex, endIndex);
    const maxScore = Math.max(...heroes.map(h => h.score)) || 1; // Max of ALL heroes for consistent scale

    const getPoints = (dataVals, r) => dataVals.map((h, i) => {
        const val = h.isPlaceholder ? 30 : (h.score / maxScore) * 100;
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const len = (val / 100) * r;
        return `${center + len * Math.cos(angle)},${center + len * Math.sin(angle)}`;
    }).join(" ");

    const handlePrev = () => { if (page > 0) setPage(page - 1); };
    const handleNext = () => { if (endIndex < heroes.length) setPage(page + 1); };

    return (
        <div className="relative flex flex-col items-center">
            <div className="absolute top-0 right-0 flex gap-1 z-20">
                <button onClick={handlePrev} disabled={page === 0} className={`p-1 rounded bg-slate-800 border border-white/10 text-cyan-400 hover:text-white disabled:opacity-30 ${page === 0 ? '' : 'hover:bg-slate-700'}`}><Icons.ChevronLeft size={14} /></button>
                <button onClick={handleNext} disabled={endIndex >= heroes.length} className={`p-1 rounded bg-slate-800 border border-white/10 text-cyan-400 hover:text-white disabled:opacity-30 ${endIndex >= heroes.length ? '' : 'hover:bg-slate-700'}`}><Icons.ChevronRight size={14} /></button>
            </div>

            <svg width={size} height={size} className="overflow-visible">
                {[100, 75, 50, 25].map((lvl, i) => (
                    <polygon key={lvl} points={getPoints(Array(6).fill({ score: maxScore * (lvl / 100) }), radius)} fill="none" stroke={i === 0 ? "#22d3ee" : "rgba(255,255,255,0.1)"} strokeWidth="1" />
                ))}
                {currentBatch.map((_, i) => {
                    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                    return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="rgba(255,255,255,0.1)" />;
                })}
                <polygon points={getPoints(currentBatch, radius)} fill="rgba(34, 211, 238, 0.2)" stroke="#22d3ee" strokeWidth="2" />
                {currentBatch.map((hero, i) => {
                    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                    const x = center + (radius + 30) * Math.cos(angle); const y = center + (radius + 15) * Math.sin(angle);
                    const isSelected = currentHero && currentHero.name === hero.name;
                    return (
                        <g key={i} onClick={() => !hero.isPlaceholder && onSelect(hero)} className={hero.isPlaceholder ? '' : 'cursor-pointer group'}>
                            <circle cx={x} cy={y} r="20" fill="transparent" />
                            <text x={x} y={y} fill={isSelected ? "#22d3ee" : (hero.isPlaceholder ? "#475569" : "#94a3b8")} fontSize={isSelected ? "11" : "9"} textAnchor="middle" dominantBaseline="middle" fontWeight="bold" className="transition-all duration-200 group-hover:fill-white group-hover:text-xs">{hero.name}</text>
                            {!hero.isPlaceholder && <text x={x} y={y + 12} fill={isSelected ? "#22d3ee" : "#64748b"} fontSize="8" textAnchor="middle" dominantBaseline="middle">{hero.rated ? hero.score.toFixed(1) : '—'}</text>}
                        </g>
                    );
                })}
            </svg>
            <div className="text-cyan-400 text-[10px] uppercase tracking-widest mt-2">Ranks {startIndex + 1}-{Math.min(endIndex, heroes.length)}</div>
        </div>
    );
}
