/**
 * Application constants and configuration
 */

// Application info
export const APP_CONFIG = {
  NAME: 'GLOV Secure — Mnemonic Shards',
  DESCRIPTION:
    'Securely split a BIP-39 mnemonic into multiple shards; any chosen threshold of shards can recover the original mnemonic.',
  VERSION: '1.0.0',
};

// Mnemonic configuration
export const MNEMONIC_CONFIG = {
  WORD_COUNTS: [12, 24],
  DEFAULT_WORD_COUNT: 12,
  MIN_SHARES: 3,
  MAX_SHARES: 7,
  DEFAULT_TOTAL_SHARES: 5,
  DEFAULT_THRESHOLD: 3,
};

// UI configuration
export const UI_CONFIG = {
  // Mobile breakpoint (px)
  MOBILE_BREAKPOINT: 768,

  // Animation durations (ms)
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300,
  },

  // Delays (ms)
  DELAY: {
    DEBOUNCE: 100,
    AUTO_HIDE_ALERT: 3000,
    BLUR_DELAY: 200,
    COPY_FEEDBACK: 2000,
  },

  // Suggestions dropdown config
  SUGGESTIONS: {
    MAX_SUGGESTIONS: 5,
    MOBILE_MAX_HEIGHT: '150px',
    MOBILE_BOTTOM_OFFSET: '20px',
  },

  // File download configuration
  DOWNLOAD: {
    FILE_PREFIX: 'shareFilePrefix', // i18n key used by the UI layer
    FILE_EXTENSION: '.txt',
  },
};

// DOM selectors
export const SELECTORS = {
  // Containers
  CONTAINER: '.container',
  MAIN_CONTENT: '.main-content',

  // Controls
  WORDS_GRID: '#wordsGrid',
  TOTAL_SHARES: '#totalShares',
  THRESHOLD: '#threshold',

  // Buttons
  GENERATE_BTN: '#generateBtn',
  RECOVER_BTN: '#recoverBtn',

  // Inputs
  RECOVER_INPUT: '#recoverInput',

  // Result areas
  SHARES_RESULT: '#sharesResult',
  SHARES_LIST: '#sharesList',
  RECOVER_RESULT: '#recoverResult',
  PASTE_RECOVER_RESULT: '#pasteRecoverResult',
  UPLOAD_RECOVER_RESULT: '#uploadRecoverResult',

  // Alerts / statuses
  INPUT_ERROR_ALERT: '#inputErrorAlert',
  DUPLICATE_ALERT: '#duplicateAlert',
  GENERAL_ERROR_ALERT: '#generalErrorAlert',
  SUCCESS_ALERT: '#successAlert',
  INPUT_STATUS: '#inputStatus',

  // Display values
  THRESHOLD_DISPLAY: '#thresholdDisplay',

  // Encryption-related
  ENCRYPTION_SECTION: '#encryptionSection',
  ENABLE_ENCRYPTION: '#enableEncryption',
  ENCRYPTION_FIELDS: '#encryptionFields',
  ENCRYPTION_PASSWORD: '#encryptionPassword',
  CONFIRM_PASSWORD: '#confirmPassword',
  PASSWORD_STRENGTH: '#passwordStrength',
  PASSWORD_MATCH: '#passwordMatch',
  RECOVERY_PASSWORD_SECTION: '#recoveryPasswordSection',
  RECOVERY_PASSWORD: '#recoveryPassword',

  // Dynamically generated elements
  WORD_INPUT: (index) => `#word${index}`,
  SUGGESTIONS: (index) => `#suggestions${index}`,
};

// CSS class names
export const CSS_CLASSES = {
  // State classes
  ACTIVE: 'active',
  DISABLED: 'disabled',

  // Validation states
  VALID_WORD: 'valid-word',
  INVALID_WORD: 'invalid-word',
  DUPLICATE_WORD: 'duplicate-word',

  // Alert classes
  ALERT: 'alert',
  ALERT_SUCCESS: 'alert-success',
  ALERT_ERROR: 'alert-error',
  ALERT_INFO: 'alert-info',
  ALERT_WARNING: 'alert-warning',

  // Input status
  INPUT_STATUS: 'input-status',
  INPUT_WAITING: 'waiting',
  INPUT_VALID: 'valid',
  INPUT_INVALID: 'invalid',
  INPUT_INSUFFICIENT: 'insufficient',

  // Button feedback
  COPIED: 'copied',
};

// Error messages (English)
export const ERROR_MESSAGES = {
  EMPTY_WORDS: 'Please fill in all mnemonic words.',
  INVALID_WORD: (index) =>
    `Word #${index} is not a valid BIP-39 word. Please choose a valid word from the suggestions.`,
  DUPLICATE_WORDS: (words) =>
    `Duplicate words detected: ${words}. Mnemonic words should be unique — please adjust the duplicates.`,
  INVALID_SHARE_FORMAT: 'No valid shard detected. Please check the input format.',
  INSUFFICIENT_SHARES: (valid, threshold) =>
    `At least ${threshold} shards are required. Currently only ${valid} valid shard(s) detected.`,
  NO_VALID_SHARES: 'No valid shard data found.',
  COPY_FAILED: 'Copy failed. Please copy manually.',
  DOWNLOAD_FAILED: 'Download failed. Please try again.',
  GENERATE_FAILED: (error) => `Failed to generate shards: ${error}`,
  RECOVER_FAILED: (error) => `Recovery failed: ${error}`,
};

// Success messages (English)
export const SUCCESS_MESSAGES = {
  SHARES_GENERATED: 'Shards generated successfully! Please store them securely.',
  SHARE_DOWNLOADED: (index) => `Shard ${index} downloaded.`,
  SHARE_COPIED: 'Copied to clipboard.',
};

// Informational messages (English)
export const INFO_MESSAGES = {
  WAITING_SHARES: 'Waiting for shard input…',
  VALID_SHARES: (valid, threshold) =>
    `${valid} valid shard(s) detected (threshold: ${threshold}). You can proceed with recovery.`,
  INVALID_FORMAT: 'Invalid shard format. Please check your input.',
};

// File content template
export const FILE_TEMPLATES = {
  SHARE_CONTENT: (index, content) => {
    // These fields will be localized/formatted by the UI/i18n layer when used
    return {
      index,
      content,
      timestamp: new Date().toLocaleString(),
    };
  },
};

// BIP-39 wordlist config (served locally for offline mode)
export const BIP39_CONFIG = {
  WORDLIST_URL: './constants/bip39-words.js',
};
