import { normalizeShardInput } from '../utils/validation.js';
import { isSlip39Share } from './slip39Shard.js';

export const SHARE_FORMAT = {
  GLOV_SECURE: 'glov',
  GLOV_SECURE_ENCRYPTED: 'glov-encrypted',
  SLIP39: 'slip39',
  MIXED: 'mixed',
  UNKNOWN: 'unknown',
};

function normalizeLine(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function classifySingleValue(value) {
  const normalized = normalizeLine(value);
  if (!normalized) {
    return { format: SHARE_FORMAT.UNKNOWN, value: null };
  }

  const glovCandidate = normalizeShardInput(normalized);
  if (glovCandidate.isValid && glovCandidate.type === 'plain') {
    return { format: SHARE_FORMAT.GLOV_SECURE, value: glovCandidate.value };
  }
  if (glovCandidate.isValid && glovCandidate.type === 'gpg') {
    return { format: SHARE_FORMAT.GLOV_SECURE_ENCRYPTED, value: glovCandidate.value };
  }

  if (isSlip39Share(normalized)) {
    const normalizedShare = normalized
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');

    return {
      format: SHARE_FORMAT.SLIP39,
      value: normalizedShare,
      slip39Fingerprint: normalizedShare.split(' ').slice(0, 2).join(' '),
    };
  }

  return { format: SHARE_FORMAT.UNKNOWN, value: null };
}

function buildCollectionSummary(classifications) {
  const summary = {
    glovCount: 0,
    glovEncryptedCount: 0,
    slip39Count: 0,
    unknownCount: 0,
    slip39Fingerprints: new Set(),
  };

  for (const item of classifications) {
    if (item.format === SHARE_FORMAT.GLOV_SECURE) summary.glovCount += 1;
    else if (item.format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED) summary.glovEncryptedCount += 1;
    else if (item.format === SHARE_FORMAT.SLIP39) {
      summary.slip39Count += 1;
      if (item.slip39Fingerprint) {
        summary.slip39Fingerprints.add(item.slip39Fingerprint);
      }
    }
    else summary.unknownCount += 1;
  }

  const activeFormats = [
    summary.glovCount > 0 ? SHARE_FORMAT.GLOV_SECURE : null,
    summary.glovEncryptedCount > 0 ? SHARE_FORMAT.GLOV_SECURE_ENCRYPTED : null,
    summary.slip39Count > 0 ? SHARE_FORMAT.SLIP39 : null,
  ].filter(Boolean);

  const format = activeFormats.length === 0
    ? SHARE_FORMAT.UNKNOWN
    : activeFormats.length === 1
      ? activeFormats[0]
      : SHARE_FORMAT.MIXED;

  return {
    ...summary,
    format,
    isMixed: format === SHARE_FORMAT.MIXED,
    hasIncompatibleSlip39Sets: summary.slip39Fingerprints.size > 1,
    slip39Fingerprints: Array.from(summary.slip39Fingerprints),
  };
}

export function detectShareFormat(input) {
  const normalizedInput = normalizeLine(input);
  if (!normalizedInput) {
    return {
      format: SHARE_FORMAT.UNKNOWN,
      isMixed: false,
      glovCount: 0,
      glovEncryptedCount: 0,
      slip39Count: 0,
      unknownCount: 0,
      extractedShares: [],
    };
  }

  const directClassification = classifySingleValue(normalizedInput);
  if (directClassification.format !== SHARE_FORMAT.UNKNOWN) {
    return {
      format: directClassification.format,
      isMixed: false,
      glovCount: directClassification.format === SHARE_FORMAT.GLOV_SECURE ? 1 : 0,
      glovEncryptedCount: directClassification.format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED ? 1 : 0,
      slip39Count: directClassification.format === SHARE_FORMAT.SLIP39 ? 1 : 0,
      unknownCount: 0,
      extractedShares: directClassification.value ? [directClassification.value] : [],
    };
  }

  const lines = normalizedInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const classifications = lines.map((line) => classifySingleValue(line));
  const summary = buildCollectionSummary(classifications);

  return {
    ...summary,
    extractedShares: classifications
      .filter((entry) => entry.value)
      .map((entry) => entry.value),
  };
}

export function detectShareCollectionFormat(shares) {
  const entries = Array.isArray(shares) ? shares : [];
  const normalizedStrings = entries
    .map((entry) => (typeof entry === 'string' ? entry : ''))
    .filter((entry) => entry.trim().length > 0);

  const classifications = normalizedStrings.map((entry) => classifySingleValue(entry));
  return {
    ...buildCollectionSummary(classifications),
    extractedShares: classifications
      .filter((entry) => entry.value)
      .map((entry) => entry.value),
  };
}

export function getDetectedFormatLabel(format) {
  if (format === SHARE_FORMAT.GLOV_SECURE) {
    return 'Detected format: GLOV Secure shards';
  }
  if (format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED) {
    return 'Detected format: GLOV Secure encrypted shards';
  }
  if (format === SHARE_FORMAT.SLIP39) {
    return 'Detected format: SLIP-39 compatible shares';
  }
  return '';
}
