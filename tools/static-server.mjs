import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '0.0.0.0';
const port = 8848;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function resolvePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const candidatePath = normalizedPath === '/' ? '/index.html' : normalizedPath;
  return path.join(distDir, candidatePath);
}

async function resolveFile(requestPath) {
  const candidate = resolvePath(requestPath);
  const relative = path.relative(distDir, candidate);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  try {
    const info = await stat(candidate);
    if (info.isFile()) {
      return candidate;
    }
  } catch {}

  if (!path.extname(requestPath)) {
    const fallback = path.join(distDir, 'index.html');
    await access(fallback);
    return fallback;
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !['GET', 'HEAD'].includes(req.method ?? '')) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    const filePath = await resolveFile(req.url);
    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const type = contentTypes[extension] ?? 'application/octet-stream';
    const fileInfo = await stat(filePath);

    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Content-Length': fileInfo.size,
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Static server listening on http://${host}:${port}`);
});
