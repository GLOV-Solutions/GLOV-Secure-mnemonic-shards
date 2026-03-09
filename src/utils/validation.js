import { validateMnemonic as validateBip39Mnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';

/**
 * Validation utility functions
 */

/**
 * Validate if a word is a valid BIP39 word
 * @param {string[]} wordList - BIP39 word list
 * @param {string} word - Word to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidBIP39Word(wordList, word) {
  if (!word || typeof word !== 'string' || word.trim().length === 0) {
    return false;
  }
  return wordList.includes(word.trim().toLowerCase());
}

/**
 * Validate shard data format
 * @param {string} shareString - Base64-encoded shard string
 * @returns {boolean} True if valid format
 */
export function isValidShareFormat(shareString) {
  if (!shareString || typeof shareString !== 'string') {
    return false;
  }

  try {
    const shareData = JSON.parse(atob(shareString.trim()));
    // Check only required fields (threshold, index, data); allow extra fields
    const hasRequiredFields = !!(shareData.threshold && shareData.index && shareData.data);
    return hasRequiredFields;
  } catch {
    return false;
  }
}

/**
 * Parse shard data
 * @param {string} shareString - Base64-encoded shard string
 * @returns {Object|null} Parsed shard data or null if invalid
 */
export function parseShareData(shareString) {
  if (!isValidShareFormat(shareString)) {
    return null;
  }

  try {
    const decoded = atob(shareString.trim());
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Validate mnemonic phrase integrity
 * @param {string[]} words - Array of mnemonic words
 * @returns {Object} Result { isValid, errors, warnings, duplicates, invalidWordIndices, hasChecksumError, normalizedWords }
 */
export function validateMnemonic(words) {
  const errors = [];
  const wordSet = new Set();
  const duplicates = new Set();
  const invalidWordIndices = [];
  const normalizedWords = Array.isArray(words)
    ? words.map((word) => (typeof word === 'string' ? word.trim().toLowerCase() : ''))
    : [];

  if (!Array.isArray(words)) {
    errors.push('Mnemonic must be provided as an array of words.');
    return {
      isValid: false,
      errors,
      warnings: [],
      duplicates: [],
      invalidWordIndices,
      hasChecksumError: false,
      normalizedWords,
    };
  }

  if (normalizedWords.some((word) => word.length === 0)) {
    errors.push('Empty words detected — please fill in all mnemonic fields.');
  }

  normalizedWords.forEach((word, index) => {
    if (!word) {
      return;
    }

    if (!isValidBIP39Word(englishWordlist, word)) {
      invalidWordIndices.push(index + 1);
    }

    if (wordSet.has(word)) {
      duplicates.add(word);
    } else {
      wordSet.add(word);
    }
  });

  if (invalidWordIndices.length > 0) {
    errors.push(`Invalid BIP-39 word detected at position ${invalidWordIndices[0]}.`);
  }

  if (normalizedWords.length !== 12 && normalizedWords.length !== 24) {
    errors.push('Mnemonic must contain exactly 12 or 24 words.');
  }

  const warnings = [];
  if (duplicates.size > 0) {
    const duplicateWords = Array.from(duplicates).join(', ');
    warnings.push(`Duplicate words detected: ${duplicateWords}`);
  }

  const hasChecksumError =
    errors.length === 0 && !validateBip39Mnemonic(normalizedWords.join(' '), englishWordlist);

  if (hasChecksumError) {
    errors.push('Invalid BIP-39 mnemonic checksum.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    duplicates: Array.from(duplicates),
    invalidWordIndices,
    hasChecksumError,
    normalizedWords,
  };
}

/**
 * Validate a collection of shards
 * @param {string[]|Object[]} shareStrings - Array of Base64 strings or shard objects
 * @returns {Object} Result { isValid, validCount, threshold, errors, shareIndices }
 */
export function validateShareCollection(shareStrings) {
  const errors = [];
  let validCount = 0;
  let threshold = 0;
  const shareIndices = new Set();
  const thresholdCandidates = new Set();
  const validShareData = [];

  shareStrings.forEach((shareStr, index) => {
    let shareData = null;

    // If already an object, use it directly
    if (typeof shareStr === 'object' && shareStr !== null) {
      shareData = shareStr;
    } else {
      // Otherwise, try parsing the string
      shareData = parseShareData(shareStr);
    }

    if (shareData && shareData.threshold && shareData.index !== undefined && shareData.data) {
      validCount++;
      validShareData.push(shareData);
      if (shareData.threshold) {
        thresholdCandidates.add(shareData.threshold);
      }
      shareIndices.add(shareData.index);
    } else {
      errors.push(`Line ${index + 1}: Invalid shard format`);
    }
  });

  // Determine the final threshold (use first valid shard’s threshold by default)
  if (validShareData.length > 0 && validShareData[0].threshold) {
    threshold = validShareData[0].threshold;
  } else if (thresholdCandidates.size > 0) {
    // If the first shard has no threshold, use the most frequent one
    const thresholdCounts = {};
    thresholdCandidates.forEach((t) => {
      thresholdCounts[t] = (thresholdCounts[t] || 0) + 1;
    });

    let maxCount = 0;
    thresholdCandidates.forEach((t) => {
      if (thresholdCounts[t] > maxCount) {
        maxCount = thresholdCounts[t];
        threshold = t;
      }
    });
  } else {
    // Default fallback
    threshold = 3;
  }

  // Check if there are enough valid shards
  if (validCount === 0) {
    errors.push('No valid shards detected.');
  } else if (validCount < threshold) {
    errors.push(`At least ${threshold} shards are required — only ${validCount} provided.`);
  }

  // Check for duplicate shard indices
  if (shareIndices.size !== validCount) {
    errors.push('Duplicate shard indices detected.');
  }

  validateShareSetConsistency(validShareData, errors);

  return {
    isValid: errors.length === 0 && validCount >= threshold,
    validCount,
    threshold,
    errors,
    shareIndices: Array.from(shareIndices),
  };
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function decodeShareDataToBytes(base64Data) {
  if (typeof base64Data !== 'string' || base64Data.trim().length === 0) {
    return null;
  }

  try {
    const binary = atob(base64Data);
    if (!binary || binary.length === 0) {
      return null;
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function normalizeShareSetId(rawSetId) {
  if (rawSetId === undefined || rawSetId === null) {
    return { isPresent: false, isValid: true, value: null };
  }

  if (typeof rawSetId !== 'string') {
    return { isPresent: true, isValid: false, value: null };
  }

  const value = rawSetId.trim();
  if (!value) {
    return { isPresent: true, isValid: false, value: null };
  }

  return { isPresent: true, isValid: true, value };
}

function validateShareSetConsistency(shares, errors) {
  const setIds = new Set();
  let presentCount = 0;

  shares.forEach((share, index) => {
    const setId = normalizeShareSetId(share.setId);
    if (!setId.isValid) {
      errors.push(`Line ${index + 1}: Invalid share set identifier.`);
      return;
    }
    if (setId.isPresent) {
      presentCount++;
      setIds.add(setId.value);
    }
  });

  if (presentCount === 0) {
    return null;
  }

  if (presentCount !== shares.length) {
    errors.push('Shares have inconsistent set identifiers.');
    return null;
  }

  if (setIds.size !== 1) {
    errors.push('Shares do not belong to the same set.');
    return null;
  }

  return Array.from(setIds)[0];
}

/**
 * Detect whether pasted recovery input mixes plain shares and GPG armored content.
 * This is only meant for line-based pasted input, not uploaded files.
 * @param {string[]} shareStrings
 * @returns {{plainCount:number, gpgCount:number, unknownCount:number, isMixedPlainAndGpg:boolean}}
 */
export function analyzePastedShareFormats(shareStrings) {
  let plainCount = 0;
  let gpgCount = 0;
  let unknownCount = 0;

  (Array.isArray(shareStrings) ? shareStrings : []).forEach((entry) => {
    const value = typeof entry === 'string' ? entry.trim() : '';
    if (!value) {
      return;
    }

    if (parseShareData(value)) {
      plainCount++;
      return;
    }

    if (value.includes('-----BEGIN PGP MESSAGE-----') || value.includes('-----END PGP MESSAGE-----')) {
      gpgCount++;
      return;
    }

    unknownCount++;
  });

  return {
    plainCount,
    gpgCount,
    unknownCount,
    isMixedPlainAndGpg: plainCount > 0 && gpgCount > 0,
  };
}

/**
 * Strictly validate and normalize share objects for recovery.
 * @param {Array<string|Object>} shares
 * @returns {{isValid:boolean, errors:string[], threshold:number, total:number|null, shares:Array<Object>}}
 */
export function validateAndNormalizeShareObjects(shares) {
  const errors = [];
  const normalized = [];
  const seenIndices = new Set();
  const thresholds = new Set();
  const totals = new Set();

  shares.forEach((share, idx) => {
    let raw = null;

    if (typeof share === 'string') {
      raw = parseShareData(share);
    } else if (share && typeof share === 'object') {
      raw = share;
    }

    if (!raw) {
      errors.push(`Line ${idx + 1}: Invalid share payload.`);
      return;
    }

    const index = Number(raw.index);
    const threshold = Number(raw.threshold);
    const total = raw.total === undefined || raw.total === null ? null : Number(raw.total);
    const setId = normalizeShareSetId(raw.setId);

    if (!isPositiveInteger(index)) {
      errors.push(`Line ${idx + 1}: Invalid share index.`);
      return;
    }
    if (!isPositiveInteger(threshold) || threshold < 2) {
      errors.push(`Line ${idx + 1}: Invalid threshold.`);
      return;
    }
    if (total !== null && (!isPositiveInteger(total) || total < threshold)) {
      errors.push(`Line ${idx + 1}: Invalid total shares value.`);
      return;
    }
    if (!setId.isValid) {
      errors.push(`Line ${idx + 1}: Invalid share set identifier.`);
      return;
    }
    if (seenIndices.has(index)) {
      errors.push(`Line ${idx + 1}: Duplicate share index ${index}.`);
      return;
    }

    const bytes = decodeShareDataToBytes(raw.data);
    if (!bytes) {
      errors.push(`Line ${idx + 1}: Invalid share data encoding.`);
      return;
    }

    seenIndices.add(index);
    thresholds.add(threshold);
    if (total !== null) totals.add(total);

    normalized.push({
      index,
      threshold,
      total,
      setId: setId.value,
      data: raw.data,
      bytes,
    });
  });

  if (normalized.length === 0) {
    errors.push('No valid shares detected.');
    return {
      isValid: false,
      errors,
      threshold: 0,
      total: null,
      shares: [],
    };
  }

  if (thresholds.size !== 1) {
    errors.push('Shares have inconsistent thresholds.');
  }
  if (totals.size > 1) {
    errors.push('Shares have inconsistent total values.');
  }

  const threshold = normalized[0].threshold;
  const total = normalized[0].total;

  if (normalized.length < threshold) {
    errors.push(`At least ${threshold} shares are required — only ${normalized.length} provided.`);
  }

  const normalizedSetId = validateShareSetConsistency(normalized, errors);

  normalized.sort((a, b) => a.index - b.index);

  return {
    isValid: errors.length === 0,
    errors,
    threshold,
    total,
    setId: normalizedSetId,
    shares: normalized,
  };
}
