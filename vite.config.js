// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: '/',
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
