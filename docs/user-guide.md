# User Guide - GLOV Secure Mnemonic Shards

This guide explains how to generate and recover BIP-39 mnemonic shares using either GLOV Secure format (default) or SLIP-39 compatible format.

## 1. Core Concept

- The app runs 100% offline in your browser.
- You start from a BIP-39 mnemonic (12 or 24 words).
- The mnemonic is split into multiple shares.
- A threshold defines how many shares are required to recover the mnemonic.

Example: 5 shares total, threshold 3 -> any 3 shares can recover the mnemonic.

## 2. Choosing the Right Format

In Configuration, select `Backup format`:

- `GLOV Secure format` (recommended/default)
  - Main use case: notarial backup workflows, `.txt/.gpg` exports, printable sheets.
- `SLIP-39 compatible format` (advanced)
  - Main use case: interoperability with SLIP-39 compatible wallets/tools.

Recommendation:

- Use GLOV Secure by default.
- Use SLIP-39 only when you need wallet interoperability.

## 3. Generating Shares

1. Choose 12 or 24 words.
2. Enter your mnemonic or click `Generate Mnemonic`.
3. Set:
   - `Total Shares` (3 to 7)
   - `Shares Required for Recovery` (threshold)
4. Select backup format.
5. Click `Generate Shares`.

### 3.1 GLOV Secure Mode

Available actions:

- Copy
- Download `.txt`
- Download `.gpg` (if encryption is enabled)
- QR / Print

`.gpg` encryption uses password-based OpenPGP.

### 3.2 SLIP-39 Compatible Mode

Available actions:

- Copy
- Download `.txt`
- QR / Print

Each share is shown as a SLIP-39 word phrase.

Important:

- `.gpg` export is not enabled for SLIP-39 mode in this version.

## 4. Recovery

Two input modes are available:

- `Paste Input`: paste one share per line
- `File Upload`: upload `.txt` and/or `.gpg` files

### 4.1 Auto-detected Formats

The app auto-detects:

- Legacy GLOV Base64
- `GLOV-SHARD-V1`
- `GLOV-SHARD-GPG-V1`
- OpenPGP armor
- SLIP-39 shares

A detection badge appears in Recovery:

- `Detected format: GLOV Secure shards`
- `Detected format: GLOV Secure encrypted shards`
- `Detected format: SLIP-39 compatible shares`

### 4.2 Anti-mix Safety Rules

The following combinations are blocked:

- Mixing GLOV and SLIP-39 shares
- Mixing incompatible SLIP-39 sets

Key error message:

`You cannot mix GLOV Secure shards and SLIP-39 shares in the same recovery.`

## 5. Best Practices

- Store shares in separate secure locations.
- Never keep all shares together.
- If encryption is enabled, store the password separately.
- Run a dry recovery test (with non-production mnemonics) to validate your procedure.

## 6. Quick Troubleshooting

- `Invalid share format`
  - Ensure one share per line
  - Ensure shares are from the same set
- `Insufficient shares`
  - Add shares until threshold is reached
- Mix error
  - Do not mix GLOV and SLIP-39
  - Do not mix different SLIP-39 sets
- `.gpg` decryption failure
  - Verify exact password

## 7. Known Limits

- `.gpg` encryption features apply to GLOV Secure format.
- SLIP-39 mode is intentionally separated for wallet interoperability.

