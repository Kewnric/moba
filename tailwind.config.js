/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)', 4: 'var(--ink-4)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        fg: { DEFAULT: 'var(--fg)', muted: 'var(--fg-muted)', faint: 'var(--fg-faint)' },
        accent: { DEFAULT: 'var(--accent)', on: 'var(--accent-on)' },
        enemy: 'var(--enemy)',
        ally: 'var(--ally)',
        good: 'var(--good)',
        bad: 'var(--bad)',
        sheet: { DEFAULT: 'var(--sheet)', ink: 'var(--sheet-ink)', muted: 'var(--sheet-muted)', line: 'var(--sheet-line)', tone: 'var(--sheet-tone)' },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
        label: ['"Barlow Condensed"', '"Arial Narrow"', 'Arial', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
