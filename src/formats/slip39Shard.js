import Slip39 from 'slip39';
import {
  mnemonicToEntropy,
  entropyToMnemonic,
  validateMnemonic as validateBip39Mnemonic,
} from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';

function normalizeMnemonic(value) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

function normalizeSlip39Share(value) {
  return normalizeMnemonic(value);
}

function buildSimpleGroups(total) {
  return Array.from({ length: total }, () => [1, 1]);
}

function buildAllCombinations(items, targetLength) {
  const output = [];

  function walk(startIndex, buffer) {
    if (buffer.length === targetLength) {
      output.push(buffer.slice());
      return;
    }

    for (let index = startIndex; index <= items.length - (targetLength - buffer.length); index += 1) {
      buffer.push(items[index]);
      walk(index + 1, buffer);
      buffer.pop();
    }
  }

  walk(0, []);
  return output;
}

function inferRequiredGroupCountFromError(errorMessage) {
  const match = /Expected\s+(\d+)\s+groups/i.exec(errorMessage || '');
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function recoverSlip39Secret(shares, passphrase) {
  const normalizedShares = shares.map((share) => normalizeSlip39Share(share));
  const normalizedPassphrase = (passphrase || '').trim();
  return Slip39.recoverSecret(normalizedShares, normalizedPassphrase);
}

function recoverSecretWithFlexibleSubset(shares, passphrase) {
  try {
    return recoverSlip39Secret(shares, passphrase);
  } catch (error) {
    const requiredGroupCount = inferRequiredGroupCountFromError(error?.message || '');

    if (!requiredGroupCount || shares.length <= requiredGroupCount) {
      throw error;
    }

    const combinations = buildAllCombinations(shares, requiredGroupCount);

    for (const combination of combinations) {
      try {
        return recoverSlip39Secret(combination, passphrase);
      } catch {
        // Try the next combination
      }
    }

    throw error;
  }
}

export function isSlip39Share(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    return Slip39.validateMnemonic(normalizeSlip39Share(value));
  } catch {
    return false;
  }
}

export async function exportSlip39Shares({ mnemonic, total, threshold }) {
  const normalizedMnemonic = normalizeMnemonic(mnemonic);
  if (!validateBip39Mnemonic(normalizedMnemonic, englishWordlist)) {
    throw new Error('Invalid BIP-39 mnemonic checksum.');
  }

  const entropy = Array.from(mnemonicToEntropy(normalizedMnemonic, englishWordlist));
  const groups = buildSimpleGroups(total);
  const slip = Slip39.fromArray(entropy, {
    passphrase: '',
    threshold,
    groups,
    title: 'GLOV Secure SLIP-39 backup',
  });

  const shares = groups.map((_, index) => normalizeSlip39Share(slip.fromPath(`r/${index}`).mnemonics[0]));

  return {
    format: 'slip39',
    threshold,
    total,
    shares,
  };
}

export async function recoverSlip39Mnemonic({ shares, passphrase = '' }) {
  const normalizedShares = shares
    .filter((share) => typeof share === 'string')
    .map((share) => normalizeSlip39Share(share));

  if (normalizedShares.length === 0) {
    throw new Error('No valid SLIP-39 shares detected.');
  }

  const invalidShare = normalizedShares.find((share) => !isSlip39Share(share));
  if (invalidShare) {
    throw new Error('Invalid SLIP-39 share format.');
  }

  const recoveredSecret = recoverSecretWithFlexibleSubset(normalizedShares, passphrase);
  const entropy = recoveredSecret instanceof Uint8Array
    ? recoveredSecret
    : Uint8Array.from(recoveredSecret, (byte) => byte);

  const mnemonic = entropyToMnemonic(entropy, englishWordlist).trim().toLowerCase();

  return {
    format: 'slip39',
    mnemonic,
    usedShares: normalizedShares.length,
    threshold: null,
    total: null,
  };
}
