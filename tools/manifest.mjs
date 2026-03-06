// Generate dist/manifest.json with deterministic SHA-256 hashes for firmware-side integrity checks.
// Includes app/package version, git revision when available, and per-file metadata.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const packageJsonPath = resolve(rootDir, 'package.json');
const manifestPath = resolve(distDir, 'manifest.json');
const algorithm = 'sha256';

function sha256Hex(buffer) {
  return createHash(algorithm).update(buffer).digest('hex');
}

async function collectFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === 'manifest.json') continue;
    files.push(fullPath);
  }

  return files;
}

function readGitCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim();
  } catch {
    return null;
  }
}

async function main() {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const commit = readGitCommit();
  const filePaths = await collectFiles(distDir);

  filePaths.sort((a, b) => a.localeCompare(b, 'en'));

  const files = [];
  for (const fullPath of filePaths) {
    const data = await fs.readFile(fullPath);
    const stats = await fs.stat(fullPath);
    const relativePath = relative(distDir, fullPath).split('\\').join('/');
    files.push({
      path: relativePath,
      size_bytes: stats.size,
      sha256: sha256Hex(data),
    });
  }

  const aggregateInput = files.map((f) => `${f.path}:${f.sha256}`).join('\n');
  const aggregateHash = sha256Hex(Buffer.from(aggregateInput, 'utf8'));

  const manifest = {
    schema: 'glov-web-manifest-v1',
    generated_at_utc: new Date().toISOString(),
    app: {
      name: packageJson.name ?? null,
      version: packageJson.version ?? null,
      git_commit: commit,
    },
    dist: {
      algorithm,
      files_count: files.length,
      aggregate_sha256: aggregateHash,
      files,
    },
  };

  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[manifest] Wrote ${manifestPath}`);
}

main().catch((err) => {
  console.error('[manifest.mjs] Failed:', err.message || err);
  process.exit(1);
});
