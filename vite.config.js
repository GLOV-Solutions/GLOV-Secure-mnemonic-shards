// vite.config.js
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Dev-only CSP relax plugin:
 * - Replaces the strict CSP <meta> with a relaxed one when running the dev server
 * - If no CSP meta is present, injects the relaxed meta into <head>
 * - Does NOT affect production builds
 */
function cspDevPlugin() {
  return {
    name: 'csp-dev-relax',
    apply: 'serve', // dev server only
    transformIndexHtml(html) {
      const relaxedMeta = `<meta http-equiv="Content-Security-Policy"
content="default-src 'self';
         base-uri 'none';
         form-action 'none';
         script-src 'self' 'unsafe-inline' 'unsafe-hashes';
         style-src 'self' 'unsafe-inline';
         img-src 'self' data:;
         connect-src 'self';
         object-src 'none';
         worker-src 'self'">`;

      const metaRegex = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i;
      if (metaRegex.test(html)) {
        // Replace existing strict CSP with a relaxed one for dev
        return html.replace(metaRegex, relaxedMeta);
      }
      // Inject relaxed CSP if none is present
      return html.replace(/<head([^>]*)>/i, `<head$1>\n  ${relaxedMeta}`);
    },
  };
}

export default defineConfig({
  // Keep your base for GitHub Pages (adjust if you changed the repo name)
  base: '/MnemonicShards/',
  plugins: [
    viteSingleFile(),
    cspDevPlugin(), // 👈 dev-only CSP relax
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    cssCodeSplit: false,
    // Ensure all assets are inlined (single-file build)
    assetsInlineLimit: 100000000,
    modulePreload: { polyfill: false },
  },
  optimizeDeps: {
    include: ['shamir-secret-sharing'],
  },
});
