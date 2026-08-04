import { validateMnemonic as validateBip39Mnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';
import { exportGlovShares, recoverGlovMnemonic } from './glovShard.js';
import { exportSlip39Shares, recoverSlip39Mnemonic } from './slip39Shard.js';
import { detectShareFormat, detectShareCollectionFormat, SHARE_FORMAT } from './formatDetector.js';

function normalizeRequestedFormat(format) {
  if (format === SHARE_FORMAT.SLIP39 || format === 'slip39') {
    return SHARE_FORMAT.SLIP39;
  }
  return SHARE_FORMAT.GLOV_SECURE;
}

function ensureNoMixedFormats(summary) {
  const mixesPlainAndEncryptedGlov =
    summary.glovCount > 0
    && summary.glovEncryptedCount > 0
    && summary.slip39Count === 0;

  if (mixesPlainAndEncryptedGlov) {
    throw new Error('Do not mix plain shares and GPG shares in the same recovery.');
  }

  if (summary.isMixed) {
    throw new Error('You cannot mix GLOV Secure shards and SLIP-39 shares in the same recovery.');
  }

  if (summary.hasIncompatibleSlip39Sets) {
    throw new Error('You cannot mix incompatible SLIP-39 share sets in the same recovery.');
  }
}

function createRecoveryError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertRecoveredMnemonicIsValid(mnemonic) {
  const words = typeof mnemonic === 'string'
    ? mnemonic.trim().toLowerCase().split(/\s+/).filter(Boolean)
    : [];
  const hasSupportedWordCount = words.length === 12 || words.length === 24;
  const hasKnownWords = words.every((word) => englishWordlist.includes(word));

  if (!hasSupportedWordCount || !hasKnownWords) {
    throw createRecoveryError(
      'INVALID_RECOVERED_MNEMONIC',
      'Recovered mnemonic has an invalid BIP-39 format.',
    );
  }

  if (!validateBip39Mnemonic(words.join(' '), englishWordlist)) {
    throw createRecoveryError(
      'INVALID_RECOVERED_MNEMONIC_CHECKSUM',
      'Recovered mnemonic has an invalid BIP-39 checksum.',
    );
  }
}

export async function exportShares({ mnemonic, total, threshold, format }) {
  const normalizedFormat = normalizeRequestedFormat(format);

  if (normalizedFormat === SHARE_FORMAT.SLIP39) {
    return exportSlip39Shares({ mnemonic, total, threshold });
  }

  return exportGlovShares({ mnemonic, total, threshold });
}

export function prepareSharesForRecovery(shares) {
  const inputs = Array.isArray(shares) ? shares : [];
  const normalizedShares = inputs.flatMap((value) => {
    if (typeof value !== 'string' || !value.trim()) return [];
    const detected = detectShareFormat(value);
    return detected.extractedShares || [];
  });

  const detected = detectShareCollectionFormat(normalizedShares);
  ensureNoMixedFormats(detected);

  return {
    shares: normalizedShares,
    format: detected.format,
    isEncrypted: detected.format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED,
  };
}

export async function recoverFromShares({ shares, format, password }) {
  const prepared = prepareSharesForRecovery(shares);
  const normalizedShares = prepared.shares;

  const explicitFormat = format ? normalizeRequestedFormat(format) : null;
  const inferredFormat = prepared.format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED
    ? SHARE_FORMAT.GLOV_SECURE
    : prepared.format;

  const targetFormat = explicitFormat || inferredFormat;

  let recovered;
  if (targetFormat === SHARE_FORMAT.SLIP39) {
    recovered = await recoverSlip39Mnemonic({ shares: normalizedShares, passphrase: password || '' });
  } else {
    recovered = await recoverGlovMnemonic({ shares: normalizedShares });
  }

  assertRecoveredMnemonicIsValid(recovered.mnemonic);
  return recovered;
}

export { detectShareFormat, detectShareCollectionFormat, SHARE_FORMAT };
