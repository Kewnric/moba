import { STATS_INFO } from '../data/stats.js';
import { Icons } from '../components/Icons.jsx';

const STATS_RANK = `${STATS_INFO.rank[0].toUpperCase()}${STATS_INFO.rank.slice(1)}`;

export default function DataHub({ stats, onExport, onImport, onReset }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-start lg:justify-center w-full min-h-0 overflow-y-auto p-4 lg:p-8 animate-fadeIn bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <div className="glass-panel p-5 lg:p-10 rounded-2xl w-full max-w-2xl border border-cyan-500/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 lg:mb-8 border-b border-white/10 pb-5 lg:pb-6"><div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400"><Icons.Database size={28} /></div><div><h2 className="text-xl lg:text-2xl font-bold text-white">Data Hub</h2><p className="text-gray-400 text-sm">Manage your local strategy database</p></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="bg-slate-800/50 p-5 lg:p-6 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-slate-800 transition-all">
                        <div className="mb-3 lg:mb-4 text-cyan-400"><Icons.Download size={36} /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Backup Database</h3>
                        <p className="text-xs text-gray-500 mb-5 lg:mb-6">Perfectly backup everything (Matchups, Roster, and Assets) to a local JSON file.</p>
                        <button onClick={onExport} className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg transition-all">Export Full Data</button>
                    </div>
                    <div className="bg-slate-800/50 p-5 lg:p-6 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-slate-800 transition-all">
                        <div className="mb-3 lg:mb-4 text-purple-400"><Icons.Upload size={36} /></div>
                        <h3 className="text-lg font-bold text-white mb-2">Restore Database</h3>
                        <p className="text-xs text-gray-500 mb-5 lg:mb-6">Load a previously saved JSON file. Warning: Overwrites current data.</p>
                        <label className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center"><span>Select File</span><input type="file" accept=".json" className="sr-only" onChange={onImport} /></label>
                    </div>
                </div>
                <div className="mt-6 rounded-xl border border-white/5 bg-slate-800/40 p-4 space-y-1.5">
                    <h3 className="text-sm font-bold text-white">Matchup and win-rate stats</h3>
                    <p className="text-xs text-gray-400">From {STATS_RANK}-rank games, updated {STATS_INFO.updated} (win rates cover the last {STATS_INFO.days} days). They fill in any matchup you haven't rated, at half the weight of your own ratings.</p>
                    <p className="text-[10px] text-gray-500">Powered by the Rone Arena API · Game data © Moonton (Mobile Legends: Bang Bang) · API maintained by ridwaanhall / RoneAI</p>
                </div>
                <div className="mt-6 lg:mt-8 pt-5 lg:pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-gray-500 w-full">
                    <div className="flex flex-wrap gap-4">
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
