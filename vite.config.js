import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// The app's source lives in src/. `npm run build` bundles it into one self-contained HTML file,
// which package.json copies to the repo root as index.html for GitHub Pages and double-click use.
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    root: projectRoot,
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
