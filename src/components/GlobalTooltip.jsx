import { useEffect } from 'react';

const EDGE_MARGIN = 96; // half the tooltip's widest size plus a little room, so it never runs off-screen
const MIN_SPACE_ABOVE = 88;

// One tooltip for the whole app, shown above the hovered hero (or below it near the top of the screen).
// It hides when you scroll, press or start dragging, so it can't get stuck over the page.
export default function GlobalTooltip({ content, x, top, bottom, visible, onHide }) {
    useEffect(() => {
        if (!visible) return undefined;
        const hide = () => onHide();
        window.addEventListener('scroll', hide, true);
        window.addEventListener('pointerdown', hide, true);
        window.addEventListener('dragstart', hide, true);
        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('pointerdown', hide, true);
            window.removeEventListener('dragstart', hide, true);
        };
    }, [visible, onHide]);

    if (!visible || !content) return null;
    const below = top < MIN_SPACE_ABOVE;
    const style = {
        position: 'fixed',
        left: `${Math.min(Math.max(x, EDGE_MARGIN), window.innerWidth - EDGE_MARGIN)}px`,
        top: `${below ? bottom : top}px`,
        transform: below ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
        zIndex: 9999,
        pointerEvents: 'none',
    };
    return (
        <div style={style} role="tooltip" className="bg-slate-900 text-white text-xs px-3 py-2 rounded-md border border-white/20 shadow-2xl flex flex-col items-center min-w-[120px] max-w-[180px] animate-fadeIn">
            <span className="font-bold text-cyan-400 mb-0.5 text-sm">{content.name}</span>
            {content.role && <span className="text-[10px] text-gray-400 uppercase tracking-wider text-center">{content.role}</span>}
            {content.quickNote && <div className="mt-1 pt-1 border-t border-white/10 text-yellow-300 italic whitespace-normal text-center leading-tight">"{content.quickNote}"</div>}
        </div>
    );
}
