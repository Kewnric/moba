import { THEMES } from '../data/themes.js';

// One button per color theme, each previewing its background, sheet and accent.
export default function ThemePicker({ value, onChange, compact = false }) {
    return (
        <div role="group" aria-label="Color theme" className={compact ? 'grid grid-cols-2 gap-1' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}>
            {THEMES.map((theme) => {
                const on = theme.id === value;
                return (
                    <button key={theme.id} type="button" aria-pressed={on} onClick={() => onChange(theme.id)}
                        className={`flex items-center gap-2 p-2 border text-left transition-colors ${on ? 'border-accent bg-ink-4' : 'border-line bg-ink-3 hover:border-line-strong'}`}>
                        <span className="flex shrink-0 border border-line" aria-hidden="true">
                            {theme.swatch.map((color, index) => <span key={index} className="w-3.5 h-6" style={{ backgroundColor: color }} />)}
                        </span>
                        <span className="text-sm font-semibold text-fg truncate">{theme.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
