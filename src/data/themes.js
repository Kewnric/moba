// Color themes. The colors themselves live in index.css under [data-theme]; these swatches just preview them.
export const THEMES = [
  { id: 'ink', label: 'Ink', swatch: ['#0b0d12', '#161a22', '#ffe14d'] },
  { id: 'midnight', label: 'Midnight', swatch: ['#070d1a', '#101b2e', '#38d6ff'] },
  { id: 'jungle', label: 'Jungle', swatch: ['#07110c', '#101f17', '#a6ee3f'] },
  { id: 'crimson', label: 'Crimson', swatch: ['#130809', '#21110f', '#ff9d4d'] },
  { id: 'violet', label: 'Violet', swatch: ['#0e0916', '#1a1229', '#ff6fd1'] },
  { id: 'paper', label: 'Manga Paper', swatch: ['#0b0d12', '#f3f0e6', '#ffe14d'] },
];

export const THEME_IDS = THEMES.map((theme) => theme.id);
export const DEFAULT_THEME = 'ink';
