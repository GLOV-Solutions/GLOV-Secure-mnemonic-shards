// vite.config.js (prod simple, pas de single-file)
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',                 // important si tu sers à la racine
  build: {
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,    // n’inline rien
    cssCodeSplit: true
  }
});
