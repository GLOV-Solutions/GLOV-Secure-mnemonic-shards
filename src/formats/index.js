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
  if (summary.isMixed) {
    throw new Error('You cannot mix GLOV Secure shards and SLIP-39 shares in the same recovery.');
  }

  if (summary.hasIncompatibleSlip39Sets) {
    throw new Error('You cannot mix incompatible SLIP-39 share sets in the same recovery.');
  }
}

export async function exportShares({ mnemonic, total, threshold, format }) {
  const normalizedFormat = normalizeRequestedFormat(format);

  if (normalizedFormat === SHARE_FORMAT.SLIP39) {
    return exportSlip39Shares({ mnemonic, total, threshold });
  }

  return exportGlovShares({ mnemonic, total, threshold });
}

export async function recoverFromShares({ shares, format, password }) {
  const normalizedShares = Array.isArray(shares)
    ? shares.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];

  const detected = detectShareCollectionFormat(normalizedShares);
  ensureNoMixedFormats(detected);

  const explicitFormat = format ? normalizeRequestedFormat(format) : null;
  const inferredFormat = detected.format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED
    ? SHARE_FORMAT.GLOV_SECURE
    : detected.format;

  const targetFormat = explicitFormat || inferredFormat;

  if (targetFormat === SHARE_FORMAT.SLIP39) {
    return recoverSlip39Mnemonic({ shares: normalizedShares, passphrase: password || '' });
  }

  return recoverGlovMnemonic({ shares: normalizedShares });
}

export { detectShareFormat, detectShareCollectionFormat, SHARE_FORMAT };
