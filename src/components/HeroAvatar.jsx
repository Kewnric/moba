import { useEffect, useState } from 'react';
import { HERO_IMAGES } from '../data/heroes.js';
import { Icons } from './Icons.jsx';

const SIZE_CLASSES = { sm: 'w-10 h-10 text-xs', md: 'w-14 h-14 text-sm', lg: 'w-20 h-20 text-base', xl: 'w-24 h-24 text-xl' };

export const getHeroImage = (name, customImages = {}) => {
    if (customImages && customImages[name]) return customImages[name];
    return HERO_IMAGES[name] || null;
};

export default function HeroAvatar({ name, role, size = 'md', className = '', showTooltip = true, quickNote = null, onEditNote = null, customImages = {}, setTooltip }) {
    const [imgError, setImgError] = useState(false);
    const imageSrc = getHeroImage(name, customImages);
    const showImage = imageSrc && !imgError;

    useEffect(() => { setImgError(false); }, [name, imageSrc]);

    const handleMouseEnter = (e) => {
        if (showTooltip && setTooltip) {
            const rect = e.target.getBoundingClientRect();
            setTooltip({
                visible: true,
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
                content: { name, role, quickNote }
            });
        }
    };

    const handleMouseLeave = () => { if (setTooltip) setTooltip(prev => ({ ...prev, visible: false })); };

    return (
        <div className={`relative group flex flex-col items-center ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className={`${SIZE_CLASSES[size]} rounded-xl shadow-lg flex items-center justify-center font-bold text-white overflow-hidden bg-slate-800 border border-white/10 relative transition-all duration-200 group-hover:scale-110 group-hover:shadow-cyan-500/20 group-hover:border-white/30`}>
                {showImage ? (<img src={imageSrc} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />) : (<span className="z-10">{name.substring(0, 2)}</span>)}
                {!showImage && <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800"></div>}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            {onEditNote && (<button onClick={(e) => { e.stopPropagation(); onEditNote(); }} className="absolute -top-2 -right-2 z-20 bg-yellow-500 text-black p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-400" title="Add Quick Tip"><Icons.Pencil size={10} /></button>)}
        </div>
    );
}
