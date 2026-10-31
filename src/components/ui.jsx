import { LANES } from '../data/heroes.js';
import { TIERS, TIER_COLORS, TIER_LABELS } from '../data/tiers.js';
import { Icons } from './Icons.jsx';

export const LANE_FILTERS = ['All', ...Object.values(LANES)];
const LANE_SHORT = { All: 'All', [LANES.ROAM]: 'Roam', [LANES.GOLD]: 'Gold', [LANES.EXP]: 'EXP', [LANES.MID]: 'Mid', [LANES.JUNGLE]: 'Jungle' };

export const RISK_LABELS = { none: 'None', low: 'Low', medium: 'Medium', high: 'High' };
const RISK_BARS = { none: 0, low: 1, medium: 2, high: 3 };

export function Switch({ label, checked, onChange, title, disabled = false }) {
    return (
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={title} disabled={disabled}
            className="inline-flex items-center gap-2 min-h-[2.25rem] label text-fg-muted hover:text-fg disabled:opacity-40">
            <span className={`relative w-9 h-[18px] border transition-colors ${checked ? 'bg-accent border-accent' : 'bg-transparent border-line-strong'}`}>
                <span className={`absolute top-[3px] w-2.5 h-2.5 transition-all ${checked ? 'left-[22px] bg-accent-on' : 'left-[3px] bg-fg-muted'}`} />
            </span>
            {label}
        </button>
    );
}

export function Segmented({ label, options, value, onChange, disabled = false }) {
    return (
        <div role="group" aria-label={label} className={`chip-group ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {options.map((option) => (
                <button key={option.value} type="button" disabled={disabled} aria-pressed={option.value === value} onClick={() => onChange(option.value)} className="chip">
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export function TierChip({ tier, size = 'md', title }) {
    const sizes = { sm: 'w-5 h-5 text-[12px]', md: 'w-6 h-6 text-[14px]', lg: 'w-8 h-8 text-lg' };
    return (
        <span title={title || (tier ? TIER_LABELS[tier] : 'Not rated, counts as Even')} className={`inline-flex items-center justify-center shrink-0 display ${sizes[size]} ${TIER_COLORS[tier || '?']}`}>
            {tier || '?'}
        </span>
    );
}

// S to D buttons. `value` is the current tier; `inherited` draws it as coming from a group.
export function TierButtons({ value, inherited = false, onChange, label, compact = false }) {
    const size = compact ? 'w-7 h-7 text-[14px]' : 'w-8 h-8 text-[15px]';
    return (
        <div role="group" aria-label={label} className="inline-flex gap-[3px] shrink-0">
            {TIERS.map((tier) => {
                const on = value === tier;
                return (
                    <button key={tier} type="button" aria-pressed={on} title={TIER_LABELS[tier]} onClick={() => onChange(tier)}
                        className={`${size} display transition-colors ${on ? `${TIER_COLORS[tier]} ${inherited ? 'opacity-80' : ''}` : 'tier-off'}`}>
                        {tier}
                    </button>
                );
            })}
        </div>
    );
}

// Three bars and a count. Risk never changes a score; this only reports it.
export function RiskMeter({ risk, showLabel = false }) {
    const count = risk.openCounters.length;
    const bars = RISK_BARS[risk.level];
    const summary = risk.picksLeft === 0
        ? 'The enemy lineup is full, so nothing can counter-pick you now.'
        : `${count} open hero${count === 1 ? '' : 'es'} you rated Countered can still be picked.`;
    return (
        <span title={`${RISK_LABELS[risk.level]} risk. ${summary}`} aria-label={`${RISK_LABELS[risk.level]} risk, ${count} open counters`} role="img" className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-end gap-[2px] h-3.5" aria-hidden="true">
                {[1, 2, 3].map((bar) => (
                    <span key={bar} className={`w-[4px] ${bar <= bars ? 'bg-current' : 'bg-current opacity-25'}`} style={{ height: `${bar * 33.3}%` }} />
                ))}
            </span>
            <span className="label tabular-nums">{count}</span>
            {showLabel && <span className="label">{RISK_LABELS[risk.level]}</span>}
        </span>
    );
}

export function SearchField({ value, onChange, placeholder, label, onKeyDown, enterKeyHint }) {
    return (
        <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none" size={15} />
            <input type="search" enterKeyHint={enterKeyHint} aria-label={label} placeholder={placeholder} className="field pl-9" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} />
        </div>
    );
}

export function LaneChips({ value, onChange }) {
    return (
        <div role="group" aria-label="Filter by lane" className="flex gap-1 overflow-x-auto scrollbar-hide">
            {LANE_FILTERS.map((lane) => (
                <button key={lane} type="button" aria-pressed={value === lane} onClick={() => onChange(value === lane ? 'All' : lane)} className="chip">{LANE_SHORT[lane]}</button>
            ))}
        </div>
    );
}

export function EmptyState({ icon: EmptyIcon, title, children, action }) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 gap-3">
            {EmptyIcon && <EmptyIcon size={36} className="text-fg-faint" />}
            <p className="display text-2xl text-fg">{title}</p>
            {children && <p className="text-sm text-fg-muted max-w-sm">{children}</p>}
            {action}
        </div>
    );
}
