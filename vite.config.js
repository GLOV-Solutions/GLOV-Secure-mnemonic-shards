// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // OK si tu sers à la racine (ton IP/domaine)
  build: {
    outDir: 'dist',
    target: 'es2020',                 // moderne, compatible WebCrypto côté navigateur
    modulePreload: { polyfill: false }, // évite le petit polyfill inline
    assetsInlineLimit: 0,               // n’inline rien (images, fonts, etc.)
    cssCodeSplit: true,                 // CSS séparé
    // rollupOptions: { output: { manualChunks: undefined } } // inutile: défaut
    sourcemap: false,                   // optionnel, évite une fuite d'infos en prod
    minify: 'esbuild',                  // défaut, ici explicité
  },
  optimizeDeps: {
    include: ['slip39', 'openpgp', 'shamir-secret-sharing'], // utile en dev
  },
});

