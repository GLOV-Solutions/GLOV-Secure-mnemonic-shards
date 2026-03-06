import { generateMnemonic } from 'bip39';

/**
 * Generate a BIP-39 mnemonic in English using 128 bits (12 words)
 * or 256 bits (24 words).
 * @param {number} wordCount
 * @returns {string[]}
 */
export function generateMnemonicWords(wordCount) {
  const strength = wordCount === 24 ? 256 : 128;
  const mnemonic = generateMnemonic(strength).trim().toLowerCase();
  const words = mnemonic.split(/\s+/).filter(Boolean);

  if (words.length !== wordCount) {
    throw new Error('Generated mnemonic has an unexpected word count.');
  }

  return words;
}
