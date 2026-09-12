import { useState } from 'react';
import { HEROES } from '../data/heroes.js';
import { Icons } from '../components/Icons.jsx';
import HeroAvatar from '../components/HeroAvatar.jsx';

export default function AssetManager({ customImages, onUpload }) {
    const [search, setSearch] = useState('');

    return (
        <div className="flex-1 flex flex-col w-full animate-fadeIn overflow-hidden">
            <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center px-6 gap-6 shrink-0">
                <div className="flex items-center gap-2 text-orange-500"><Icons.Image size={18} /><span className="font-bold uppercase text-sm">Asset Manager</span></div>
                <div className="h-6 w-px bg-white/10"></div>
                <div className="relative w-64"><Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="text" placeholder="Search heroes to change icon..." className="w-full bg-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {HEROES.filter(h => h.name.toLowerCase().includes(search.toLowerCase())).map(hero => (
                        <label key={hero.id} className="relative group cursor-pointer">
                            <HeroAvatar heroId={hero.id} size="lg" showTooltip={false} customImages={customImages} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                <Icons.Upload className="text-white" size={24} />
                            </div>
                            <div className="text-center text-xs mt-2 text-gray-400">{hero.name}</div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => onUpload(e, hero.id)} />
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
