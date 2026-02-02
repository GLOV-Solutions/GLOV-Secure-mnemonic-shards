/**
 * General utility functions
 */

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay time in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Delay execution
 * @param {number} ms - Delay time in milliseconds
 * @returns {Promise} Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format date and time
 * @param {Date} date - Date object
 * @returns {string} Formatted date-time string
 */
export function formatDateTime(date = new Date()) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Generate a unique ID
 * @param {string} [prefix] - Optional prefix
 * @returns {string} Unique ID string
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }

  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }

  return obj;
}

/**
 * Safely parse JSON
 * @param {string} str - JSON string
 * @param {any} [defaultValue] - Default value to return on failure
 * @returns {any} Parsed object or default value
 */
export function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * Check if the device is mobile
 * @returns {boolean} True if on a mobile device
 */
export function isMobile() {
  return window.innerWidth <= 768;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch {
    return false;
  }
}

/**
 * Download a file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} [mimeType='text/plain'] - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Encode a string in Base64
 * @param {string} str - String to encode
 * @returns {string} Base64 encoded string
 */
export function base64Encode(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return '';
  }
}

/**
 * Decode a Base64 string
 * @param {string} str - Base64 encoded string
 * @returns {string} Decoded string
 */
export function base64Decode(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return '';
  }
}

/**
 * Remove duplicate items from an array
 * @param {Array} array - Array to deduplicate
 * @param {Function} [keyFn] - Function to extract a unique key for comparison
 * @returns {Array} Deduplicated array
 */
export function uniqueArray(array, keyFn = (item) => item) {
  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
