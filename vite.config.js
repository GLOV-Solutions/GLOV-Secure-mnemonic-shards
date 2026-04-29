// vite.config.js
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const appVersion = pkg.version || '0.0.0';

export default defineConfig(({ mode }) => ({
  // Relative asset paths: works on root domains, sub-path hosting, and offline/static folders.
  base: './',
  plugins: [
    nodePolyfills({
      include: ['crypto', 'stream', 'vm'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    rollupOptions: { output: { manualChunks: undefined } },
    minify: mode === 'production' ? 'terser' : 'esbuild',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2
      },
      format: { comments: false }
    }
  }
}));
