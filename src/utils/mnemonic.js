import { entropyToMnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';

/**
 * Generate a BIP-39 mnemonic in English using 128 bits (12 words)
 * or 256 bits (24 words).
 * @param {number} wordCount
 * @returns {string[]}
 */
export function generateMnemonicWords(wordCount) {
  const entropyBits = wordCount === 24 ? 256 : 128;
  const entropyBytes = entropyBits / 8;

  if (
    typeof globalThis === 'undefined' ||
    !globalThis.crypto ||
    typeof globalThis.crypto.getRandomValues !== 'function'
  ) {
    throw new Error('Secure random source is not available.');
  }

  const random = new Uint8Array(entropyBytes);
  globalThis.crypto.getRandomValues(random);

  const mnemonic = entropyToMnemonic(random, englishWordlist).trim().toLowerCase();
  const words = mnemonic.split(/\s+/).filter(Boolean);

  if (words.length !== wordCount) {
    throw new Error('Generated mnemonic has an unexpected word count.');
  }

  return words;
}
