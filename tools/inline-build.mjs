// Inline built CSS/JS into dist/index.html and output dist/index.single.html
// Uses html-minifier-terser (or html-minifier) if available to minify HTML/CSS/JS.
// Keeps it dependency-light with graceful fallback minification.

import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const inputHtmlPath = resolve(distDir, 'index.html');
const outputHtmlPath = resolve(distDir, 'index.single.html');

// Try to load html-minifier-terser first, then html-minifier; fallback to no-op
async function loadMinifier() {
  try {
    const m = await import('html-minifier-terser');
    return async (html) => await m.minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
      keepClosingSlash: true,
    });
  } catch {}
  try {
    const m = await import('html-minifier');
    return (html) => m.minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
      keepClosingSlash: true,
    });
  } catch {}
  return (html) => html; // fallback no-op
}

function isExternalPath(p) {
  return /^https?:\/\//i.test(p) || /^\/\//.test(p);
}

function toFsPath(href) {
  // Resolve href to a file under dist (strip leading '/')
  const cleaned = href.startsWith('/') ? href.slice(1) : href;
  return resolve(distDir, cleaned);
}

async function inlineAssets(html) {
  let result = html;

  // Inline <link rel="stylesheet" href="...">
  const linkRe = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkMatches = [...result.matchAll(linkRe)];
  for (const m of linkMatches) {
    const fullTag = m[0];
    const href = m[1];
    if (isExternalPath(href)) continue;
    const cssPath = toFsPath(href);
    try {
      const css = await fs.readFile(cssPath, 'utf8');
      const styleTag = `<style>${css}</style>`;
      result = result.replace(fullTag, styleTag);
    } catch {
      // If missing, keep original tag
    }
  }

  // Inline <script ... src="..."></script>
  const scriptRe = /<script\s+([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi;
  const scriptMatches = [...result.matchAll(scriptRe)];
  for (const m of scriptMatches) {
    const fullTag = m[0];
    const preAttrs = m[1] || '';
    const src = m[2];
    const postAttrs = m[3] || '';
    if (isExternalPath(src)) continue;
    const jsPath = toFsPath(src);
    const typeMatch = /type=["']([^"']+)["']/i.exec(preAttrs + ' ' + postAttrs);
    const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : '';
    try {
      const js = await fs.readFile(jsPath, 'utf8');
      const scriptTag = `<script${typeAttr}>${js}</script>`;
      result = result.replace(fullTag, scriptTag);
    } catch {
      // If missing, keep original tag
    }
  }

  return result;
}

try {
  const minify = await loadMinifier();
  const html = await fs.readFile(inputHtmlPath, 'utf8');
  const inlined = await inlineAssets(html);
  const minified = await minify(inlined);
  await fs.writeFile(outputHtmlPath, minified, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[inline-build] Wrote ${outputHtmlPath}`);
} catch (err) {
  console.error('[inline-build] Failed:', err.message || err);
  process.exit(1);
}

