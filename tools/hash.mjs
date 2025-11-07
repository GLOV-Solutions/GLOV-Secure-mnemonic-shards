// Compute SHA-256 of dist/index.single.html and write to dist/VERSION.txt
// Outputs lowercase hex followed by a newline. Minimal, no dependencies.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = resolve(__dirname, '..', 'dist', 'index.single.html');
const outputPath = resolve(__dirname, '..', 'dist', 'VERSION.txt');

try {
  const data = await fs.readFile(inputPath); // read as Buffer
  const hash = createHash('sha256').update(data).digest('hex');
  await fs.mkdir(resolve(__dirname, '..', 'dist'), { recursive: true });
  await fs.writeFile(outputPath, hash + '\n', 'utf8');
} catch (err) {
  // Print error and exit non-zero if input is missing or IO fails
  console.error('[hash.mjs] Failed:', err.message || err);
  process.exit(1);
}

