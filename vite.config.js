// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // important si tu sers à la racine (IP/domaine)
  build: {
    modulePreload: { polyfill: false }, // évite le petit polyfill inline
    assetsInlineLimit: 0,               // n’inline rien
    cssCodeSplit: true,                 // CSS dans un fichier
    rollupOptions: { output: { manualChunks: undefined } }
  }
});
