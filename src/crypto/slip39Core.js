// src/crypto/slip39Core.js
// Cette implémentation suppose une lib NPM "slip39" exposant split/recover.
// Selon la lib exacte, adapte les noms de fonctions/params (voir commentaire ci-dessous).

import * as slip from 'slip39';

// Helpers encodage texte<->bytes
const enc = (s) => new TextEncoder().encode(s);
const dec = (u8) => new TextDecoder().decode(u8);

/**
 * Découpe une phrase BIP-39 en mnémoniques SLIP-39.
 * @param {{ secret: string, threshold: number, groups?: {threshold:number,count:number}[], passphrase?: string }} p
 * @returns {Promise<string[]>}
 */
export async function splitMnemonicToSlip39(p) {
  const { secret, threshold, groups, passphrase = '' } = p;
  // par défaut: 1 groupe (count = nb de parts)
  const totalShares = groups?.[0]?.count ?? threshold;

  // ⚠️ Selon la lib "slip39" utilisée :
  // - Certaines exposent slip.split(Uint8Array, { threshold, shares, passphrase }) -> string[]
  // - D'autres utilisent une classe/constructeur (SLIP39.generate(...)).
  // Le code ci-dessous est pour l'API "split/recover".

  let mnems;
  try {
    mnems = slip.split(enc(secret), {
      threshold,
      shares: totalShares,
      passphrase
    });
  } catch (_) {
    mnems = slip.split(secret, {
      threshold,
      shares: totalShares,
      passphrase
    });
  }

  // si la lib renvoie un Promise, enlève l'await ci-dessus/ajoute ici selon le cas
  return Promise.resolve(mnems);
}

/**
 * Reconstitue la phrase depuis des mnémoniques SLIP-39.
 * @param {{ mnemonics: string[], passphrase?: string }} p
 * @returns {Promise<string>}
 */
export async function recoverFromSlip39(p) {
  const { mnemonics, passphrase = '' } = p;

  // API type "recover(mnemonics, passphrase) -> Uint8Array | string"
  const res = slip.recover(mnemonics, passphrase);
  const bytes = res instanceof Uint8Array ? res : enc(String(res));
  return dec(bytes).trim();
}
