import { useEffect, useState } from 'react';
import { HERO_BY_ID } from '../data/heroes.js';

export const heroName = (heroId) => (HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].name : heroId);

// Official portrait filling its container, with the hero's initials if the image can't load.
export default function HeroAvatar({ heroId, className = '' }) {
    const [imgError, setImgError] = useState(false);
    const name = heroName(heroId);
    const imageSrc = HERO_BY_ID[heroId] ? HERO_BY_ID[heroId].image : null;

    useEffect(() => { setImgError(false); }, [heroId]);

    return (
        <div className={`relative overflow-hidden bg-ink-4 flex items-center justify-center ${className}`}>
            {imageSrc && !imgError
                // Not draggable itself, so a drag starts from the hero card around it instead of the image file.
                ? <img src={imageSrc} alt={name} draggable={false} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                : <span className="label text-fg-muted">{name.substring(0, 2)}</span>}
        </div>
    );
}
