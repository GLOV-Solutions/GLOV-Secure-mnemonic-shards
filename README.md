# GLOV Secure – Mnemonic Shards

Privacy‑first, offline tool to split a BIP‑39 mnemonic into multiple shards using Shamir’s Secret Sharing (SSS), with recovery from a configurable threshold of shards. Optional shard encryption using OpenPGP (GPG‑compatible). Everything runs client‑side in your browser and works offline via a service worker.

- 12 or 24 words, 3–7 total shards, 2–5 recovery threshold
- BIP‑39 validation, auto‑complete suggestions, duplicate detection
- Optional AES‑256 encryption via OpenPGP
- No network calls; ideal for air‑gapped usage

## Security Notice

- Prefer an isolated (air‑gapped) environment. No data (words, shards, files) is sent over the network.
- You are responsible for any copied/downloaded shards. Store them in separate, secure locations.
- If you enable encryption, you must remember the password — it is required for recovery.

## Requirements

- Node.js 20+ (recommended) or Bun 1.0+
- Docker (optional) for containerized deployment

## Quick Start

### Docker (recommended)
```bash
git clone <repository-url>
cd GLOV-Secure-mnemonic-shards
docker-compose up -d --build
# Open http://localhost:8848
```

### Local development (Bun)
```bash
bun install
bun run dev
# Open http://localhost:5173
```

### Local development (npm)
```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Static file
```bash
# Open directly in your browser
open dist/index.html
# or serve with any static server
npx http-server dist -p 8080
```

## Production Build

### Standard bundle
```bash
bun run build
```
Outputs to `dist/` (open `dist/index.html`).

### Single‑file bundle + hash
```bash
bun run build:single
```
Produces:
- `dist/index.single.html` (CSS/JS inlined for fully offline/embedded use)
- `dist/VERSION.txt` (SHA‑256 of the bundle)

Alternative via npm:
```bash
npm run build
node tools/inline-build.mjs && node tools/hash.mjs
```

### Verify the hash
- macOS/Linux:
```bash
shasum -a 256 dist/index.single.html
```
- Windows PowerShell:
```powershell
Get-FileHash dist/index.single.html -Algorithm SHA256
```

## Usage

### Generate
- Choose 12 or 24 words.
- Enter the mnemonic (auto‑complete + BIP‑39 validation).
- Select total shards (3–7) and threshold (2–5).
- Optional: enable encryption and set a strong password (AES‑256 via OpenPGP).
- Click “Generate Shares”, then copy/download each shard.

### Recover
- “Paste” tab: paste one shard per line.
- “Files” tab: drag‑and‑drop `.txt` (standard) and/or `.gpg` (encrypted) shards.
- If `.gpg` files are present, enter the decryption password.
- Click “Recover Mnemonic” once the threshold is met.

### Best practices
- Store shards separately; never keep all shards together.
- If you encrypt, store the password safely — it is required for recovery.

## Share Formats

- Standard (copy/paste or `.txt`):
  - Base64 of a JSON object: `{ index, threshold, total, data }`
  - `data` contains Base64 of the raw SSS bytes.
- Encrypted (`.gpg`):
  - OpenPGP ASCII armor (works with `gpg --decrypt shard.gpg`).
  - All shards in a set use the same password chosen at generation time.

## Tech Stack

- SSS: `shamir-secret-sharing`
- Encryption: `openpgp`
- Build: `Vite`
- Language: JavaScript (ES modules), CSS3
- Offline: service worker (`public/sw.js`), local assets only

## Project Structure (excerpt)

- `index.html` — Main UI, loads `src/main.js`
- `src/components/` — UI logic (MnemonicInput, ShareManager, RecoveryTabManager, PasswordDialog)
- `src/utils/` — Validation, i18n, helpers, encryption, DOM utils
- `src/constants/` — Config, i18n, BIP‑39 list
- `public/` — Service worker, favicon, assets
- `tools/inline-build.mjs` — Inlines CSS/JS for single‑file bundle
- `tools/hash.mjs` — SHA‑256 → `VERSION.txt`
- `Dockerfile`, `docker-compose.yml` — Static deployment (port 8848), non‑root, read‑only FS

## Deployment

- Docker: non‑root image, healthcheck, read‑only filesystem
- Static hosting: serve `dist/` with any HTTP server
- Single‑file: `dist/index.single.html` for embedded or fully offline environments

## Internationalization

- Languages: EN and FR (switcher in UI)
- Dynamic labels update at runtime

## License

- ISC (see `package.json`)

## Acknowledgements

- shamir-secret-sharing, openpgp, Vite, and the open‑source community
