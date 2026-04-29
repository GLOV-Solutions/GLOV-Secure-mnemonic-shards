import { split, combine } from 'shamir-secret-sharing';
import { validateAndNormalizeShareObjects } from '../utils/validation.js';

function generateShareSetId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Secure random source is not available for share set generation.');
}

function encodeShareBytes(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

export async function exportGlovShares({ mnemonic, total, threshold }) {
  const secretBytes = new TextEncoder().encode(mnemonic);
  const rawShares = await split(secretBytes, total, threshold);
  const setId = generateShareSetId();

  const shares = rawShares.map((share, index) => {
    const payload = {
      setId,
      index: index + 1,
      threshold,
      total,
      data: encodeShareBytes(share),
    };

    return btoa(JSON.stringify(payload));
  });

  return {
    format: 'glov',
    setId,
    total,
    threshold,
    shares,
  };
}

export async function recoverGlovMnemonic({ shares }) {
  const strictValidation = validateAndNormalizeShareObjects(shares);
  if (!strictValidation.isValid) {
    throw new Error(strictValidation.errors[0] || 'Invalid GLOV share payload.');
  }

  const shareBytes = strictValidation.shares
    .slice(0, strictValidation.threshold)
    .map((entry) => entry.bytes);

  const recoveredBytes = await combine(shareBytes);
  const mnemonic = new TextDecoder().decode(recoveredBytes).trim();

  return {
    format: 'glov',
    mnemonic,
    threshold: strictValidation.threshold,
    usedShares: strictValidation.shares.length,
    total: strictValidation.total,
    setId: strictValidation.setId,
  };
}
