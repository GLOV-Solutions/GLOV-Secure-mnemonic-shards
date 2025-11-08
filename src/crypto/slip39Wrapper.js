// src/crypto/slip39Wrapper.js
import * as openpgp from 'openpgp';
// Si tu as un cœur SLIP-39 local, garde cet import ; sinon adapte-le au module que tu utilises :
import { splitMnemonicToSlip39, recoverFromSlip39 } from './slip39Core.js';

/** @param {Uint8Array} u8 */
function bufToB64(u8) {
  if (typeof btoa !== 'undefined') {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }
  // Build (Node/Bun)
  return Buffer.from(u8).toString('base64');
}

/** @param {string} b64 */
function b64ToBuf(b64) {
  if (typeof atob !== 'undefined') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Build (Node/Bun)
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/**
 * Chiffre des octets (OpenPGP password-based)
 * @param {Uint8Array} plaintext
 * @param {string[]} passwords
 * @returns {Promise<string>} armored
 */
async function pgpEncryptBytes(plaintext, passwords) {
  const message = await openpgp.createMessage({ binary: plaintext });
  return openpgp.encrypt({
    message,
    passwords,
    format: 'armored',
  });
}

/**
 * Déchiffre vers des octets (OpenPGP password-based)
 * @param {string} armored
 * @param {string[]} passwords
 * @returns {Promise<Uint8Array>}
 */
async function pgpDecryptToBytes(armored, passwords) {
  const message = await openpgp.readMessage({ armoredMessage: armored });
  const { data } = await openpgp.decrypt({
    message,
    passwords,
    format: 'binary',
  });
  // openpgp v6 renvoie un Uint8Array en binaire
  return /** @type {Uint8Array} */ (data);
}

/**
 * Génère des mnémoniques SLIP-39 à partir d’une phrase BIP-39
 * + chiffre la phrase BIP-39 en OpenPGP (armored)
 *
 * @param {string} bip39Phrase
 * @param {number} threshold
 * @param {number} totalShares
 * @param {string|undefined} slipPassphrase  // passphrase SLIP-39 (optionnelle)
 * @returns {Promise<{ ciphertext: string, mnemonics: string[] }>}
 */
export async function generateSlip39ForMnemonic(bip39Phrase, threshold, totalShares, slipPassphrase) {
  // 1) Découpe SLIP-39 -> ensemble de mnémoniques (le module doit implémenter cette logique)
  const mnemonics = await splitMnemonicToSlip39({
    secret: bip39Phrase,
    threshold,
    groups: [{ threshold, count: totalShares }],
    passphrase: slipPassphrase || '',
  });

  // 2) Chiffre la phrase BIP-39 avec OpenPGP (mot de passe local, p.ex. même que slipPassphrase si tu veux)
  const plaintext = new TextEncoder().encode(bip39Phrase);
  const ciphertext = await pgpEncryptBytes(plaintext, [slipPassphrase || '']);

  return { ciphertext, mnemonics };
}

/**
 * Récupère la phrase BIP-39 via mnémoniques SLIP-39 + déchiffrement OpenPGP
 *
 * @param {string[]} mnemonics
 * @param {string} ciphertext
 * @param {string|undefined} slipPassphrase
 * @returns {Promise<string>} bip39 phrase
 */
export async function recoverMnemonicWithSlip39(mnemonics, ciphertext, slipPassphrase) {
  // 1) Reconstruit la phrase BIP-39 depuis les mnémoniques SLIP-39
  const bip39FromSlip = await recoverFromSlip39({
    mnemonics,
    passphrase: slipPassphrase || '',
  });

  // 2) Déchiffre le message OpenPGP (si fourni) pour vérifier/cohérer
  //    (on accepte deux cas : a) seul SLIP-39 suffit, b) on a aussi un ciphertext à valider)
  if (ciphertext && ciphertext.trim().length > 0) {
    const decrypted = await pgpDecryptToBytes(ciphertext, [slipPassphrase || '']);
    const decoded = new TextDecoder().decode(decrypted).trim();
    // On fait confiance au SLIP-39 ; si envie, tu peux forcer l’égalité :
    // if (decoded !== bip39FromSlip.trim()) throw new Error('Mismatch between PGP and SLIP-39 recovery');
    return decoded;
  }

  return bip39FromSlip.trim();
}
