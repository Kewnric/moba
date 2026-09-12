import { Icons } from './Icons.jsx';

// Long matchup note, opened by double-clicking a ranked hero in Database.
export function TacticalNoteModal({ heroName, text, onChange, onCancel, onSave }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Icons.MessageSquare className="text-cyan-400" /> <span>vs <span className="text-cyan-400">{heroName}</span></span></h3>
                <textarea className="w-full h-32 bg-slate-800 border border-white/10 rounded p-3 text-sm text-white focus:outline-none focus:border-cyan-500 mb-4 resize-none" placeholder="Enter deep tactical analysis..." value={text} onChange={(e) => onChange(e.target.value)} />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={onSave} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg">Save Tactics</button>
                </div>
            </div>
        </div>
    );
}

export function QuickTipModal({ heroName, text, onChange, onCancel, onSave }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-yellow-500/30 p-4 rounded-2xl w-80 shadow-2xl">
                <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2"><Icons.Pencil size={14} /> Quick Tip: {heroName}</h3>
                <input type="text" maxLength="30" className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 mb-4" placeholder="Ex: Ult cancels S2 (Max 30 chars)" value={text} onChange={(e) => onChange(e.target.value)} />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={onSave} className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold shadow-lg">Save Tip</button>
                </div>
            </div>
        </div>
    );
}

// Picks a hero to add to the jungler roster; `options` are the heroes not in it yet.
export function AddJunglerModal({ options, value, onChange, onCancel, onAdd }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-green-500/30 p-4 rounded-2xl w-80 shadow-2xl">
                <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2"><Icons.Plus size={14} /> Add Jungler</h3>
                <select className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 mb-4" value={value} onChange={(e) => onChange(e.target.value)}>
                    <option value="" disabled>Choose a hero...</option>
                    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={onAdd} disabled={!value} className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">Add Hero</button>
                </div>
            </div>
        </div>
    );
}
