import { Icons } from '../components/Icons.jsx';

export default function DataHub({ stats, onExport, onImport, onReset }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full animate-fadeIn bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-2xl border border-cyan-500/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6"><div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400"><Icons.Database size={32} /></div><div><h2 className="text-2xl font-bold text-white">Data Hub</h2><p className="text-gray-400 text-sm">Manage your local strategy database</p></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-slate-800 transition-all">
                        <div className="mb-4 text-cyan-400"><Icons.Download size={40} /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Backup Database</h3>
                        <p className="text-xs text-gray-500 mb-6">Perfectly backup everything (Matchups, Roster, and Assets) to a local JSON file.</p>
                        <button onClick={onExport} className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg transition-all">Export Full Data</button>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-slate-800 transition-all">
                        <div className="mb-4 text-purple-400"><Icons.Upload size={40} /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Restore Database</h3>
                        <p className="text-xs text-gray-500 mb-6">Load a previously saved JSON file. Warning: Overwrites current data.</p>
                        <label className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center"><span>Select File</span><input type="file" accept=".json" className="hidden" onChange={onImport} /></label>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs text-gray-500 w-full">
                    <div className="flex gap-4">
                        <span>Matchups: <span className="text-white">{stats.matchupCount}</span></span>
                        <span>Roster: <span className="text-white">{stats.junglerCount}</span></span>
                        <span>Assets: <span className="text-white">{stats.imageCount}</span></span>
                    </div>
                    <button onClick={onReset} className="text-red-400 hover:text-red-300 underline">Reset to Factory Defaults</button>
                </div>
            </div>
        </div>
    );
}
