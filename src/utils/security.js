// src/utils/security.js

/**
 * Returns true if the app can safely use WebCrypto (crypto.subtle).
 * Note: In many browsers, WebCrypto is only available in a secure context (HTTPS).
 */
export function canUseWebCrypto() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    typeof globalThis !== 'undefined' &&
    !!globalThis.crypto &&
    !!globalThis.crypto.subtle
  );
}