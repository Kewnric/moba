export default function GlobalTooltip({ content, x, y, visible }) {
    if (!visible || !content) return null;
    const style = {
        left: Math.min(window.innerWidth - 200, x) + 'px',
        top: Math.min(window.innerHeight - 100, y) + 'px',
        position: 'fixed', zIndex: 9999, pointerEvents: 'none'
    };
    return (
        <div style={style} className="bg-slate-900 text-white text-xs px-3 py-2 rounded-md border border-white/20 shadow-2xl flex flex-col items-center min-w-[120px] animate-fadeIn">
            <span className="font-bold text-cyan-400 mb-1 text-sm">{content.name}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{content.role}</span>
            {content.quickNote && <div className="mt-1 pt-1 border-t border-white/10 text-yellow-300 italic max-w-[150px] whitespace-normal text-center leading-tight">"{content.quickNote}"</div>}
        </div>
    );
}
