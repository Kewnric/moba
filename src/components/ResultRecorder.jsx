import { useEffect, useState } from 'react';
import { Icons } from './Icons.jsx';
import { heroName } from './HeroAvatar.jsx';

const SMALL_BUTTON = 'px-2.5 py-1 rounded-md border border-white/10 bg-slate-800 text-[11px] font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:border-white/30';

// Saves the current draft as a win or loss for the hero you played. Results show up in History.
export default function ResultRecorder({ draft, junglerIds, lastRecord, onRecord, onUndoRecord, onNewDraft }) {
    const allyIds = draft.ally.filter(Boolean);
    const allyKey = allyIds.join(',');
    const suggested = allyIds.find(id => junglerIds.includes(id)) || allyIds[0] || '';
    const [playedId, setPlayedId] = useState(suggested);

    // Follow the draft: if your chosen hero leaves the team, switch to the likeliest jungler.
    useEffect(() => {
        if (!allyIds.includes(playedId)) setPlayedId(suggested);
    }, [allyKey, suggested]);

    return (
        <section aria-label="Record result" className="mt-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h2 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-2"><Icons.Chart size={14} /> After the game</h2>
            {lastRecord ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300" aria-live="polite">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${lastRecord.result === 'win' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{lastRecord.result === 'win' ? 'Win' : 'Loss'}</span>
                    <span>saved with {heroName(lastRecord.playedId)}.</span>
                    <div className="flex gap-2 ml-auto">
                        <button type="button" onClick={onUndoRecord} className={SMALL_BUTTON}>Undo</button>
                        <button type="button" onClick={onNewDraft} className={SMALL_BUTTON}>New draft</button>
                    </div>
                </div>
            ) : allyIds.length === 0 ? (
                <p className="text-xs text-gray-500">Add your pick to Your team, then record whether you won. Your results and ratings to review show up in History.</p>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                        You played
                        <select value={playedId} onChange={(e) => setPlayedId(e.target.value)} className="bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                            {allyIds.map(id => <option key={id} value={id}>{heroName(id)}</option>)}
                        </select>
                    </label>
                    <div className="flex gap-2 ml-auto">
                        <button type="button" onClick={() => onRecord({ result: 'win', playedId })} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wide">Won</button>
                        <button type="button" onClick={() => onRecord({ result: 'loss', playedId })} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wide">Lost</button>
                    </div>
                </div>
            )}
        </section>
    );
}
