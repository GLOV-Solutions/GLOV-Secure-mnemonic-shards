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
 * @returns {Object} Result { isValid: boolean, errors: string[], duplicates: string[] }
 */
export function validateMnemonic(words) {
  const errors = [];
  const wordSet = new Set();
  const duplicates = new Set();

  // Check for empty words
  if (words.some((word) => !word || word.trim().length === 0)) {
    errors.push('Empty words detected — please fill in all mnemonic fields.');
  }

  // Check for duplicate words
  words.forEach((word) => {
    const trimmedWord = word.trim().toLowerCase();
    if (wordSet.has(trimmedWord)) {
      duplicates.add(trimmedWord);
    } else {
      wordSet.add(trimmedWord);
    }
  });

  if (duplicates.size > 0) {
    const duplicateWords = Array.from(duplicates).join(', ');
    errors.push(`Duplicate words detected: ${duplicateWords}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    duplicates: Array.from(duplicates),
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

  return {
    isValid: errors.length === 0 && validCount >= threshold,
    validCount,
    threshold,
    errors,
    shareIndices: Array.from(shareIndices),
  };
}
