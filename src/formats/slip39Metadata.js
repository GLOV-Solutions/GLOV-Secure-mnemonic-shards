import slip39Helper from 'slip39/src/slip39_helper.js';

const RADIX_BITS = 10;
const WORD_INDEX = new Map(
  slip39Helper.WORD_LIST.map((word, index) => [word, index]),
);

function normalizeSlip39Words(value) {
  if (typeof value !== 'string') return [];

  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function decodeSlip39Metadata(value) {
  const words = normalizeSlip39Words(value);
  if (words.length < 4) return null;

  const indices = words.slice(0, 4).map((word) => WORD_INDEX.get(word));
  if (indices.some((index) => index === undefined)) return null;

  const identifierData = (indices[0] << RADIX_BITS) | indices[1];
  const shareData = (indices[2] << RADIX_BITS) | indices[3];

  return {
    identifier: identifierData >>> 5,
    extendableBackupFlag: (identifierData >>> 4) & 1,
    iterationExponent: identifierData & 0x0f,
    groupIndex: (shareData >>> 16) & 0x0f,
    groupThreshold: ((shareData >>> 12) & 0x0f) + 1,
    groupCount: ((shareData >>> 8) & 0x0f) + 1,
    memberIndex: (shareData >>> 4) & 0x0f,
    memberThreshold: (shareData & 0x0f) + 1,
    wordCount: words.length,
  };
}

export function getSlip39SetFingerprint(metadata) {
  if (!metadata) return null;

  return [
    metadata.identifier,
    metadata.extendableBackupFlag,
    metadata.iterationExponent,
    metadata.groupThreshold,
    metadata.groupCount,
    metadata.wordCount,
  ].join(':');
}
