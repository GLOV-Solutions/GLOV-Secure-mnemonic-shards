import { Slip39 } from 'slip39';
import * as openpgp from 'openpgp';

function bufToB64(u8: Uint8Array) {
  return btoa(String.fromCharCode(...u8));
}
function b64ToBuf(b64: string) {
  return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

/**
 * Génère :
 * - un ciphertext OpenPGP (string ASCII armor)
 * - des mnémoniques SLIP-39 (string[])
 *
 * @param bip39Plain  La phrase BIP-39 en clair (ex: "abandon ...")
 * @param threshold   t (min de parts pour recomposer)
 * @param shares      n (nombre total de parts)
 * @param passphrase  (optionnel) phrase utilisateur pour chiffrer *aussi* K au niveau SLIP-39
 *                    (si renseigné, K est "protégé" par passphrase dans SLIP-39)
 */
export async function generateSlip39ForMnemonic(
  bip39Plain: string,
  threshold: number,
  shares: number,
  passphrase?: string
) {
  // 1) Clé maître aléatoire K (32 octets)
  const K = crypto.getRandomValues(new Uint8Array(32));

  // 2) Dérive une passphrase courte depuis K pour OpenPGP (base64 simple ici)
  const pgpPass = bufToB64(K);

  // 3) Chiffre la phrase BIP-39 avec OpenPGP (symétrique)
  const message = await openpgp.createMessage({ text: bip39Plain });
  const ciphertext = await openpgp.encrypt({
    message,
    passwords: [pgpPass],
    config: { preferredSymmetricAlgorithm: openpgp.enums.symmetric.aes256 },
  });

  // 4) Partage K en SLIP-39
  //    Modèle simple 1 groupe (shares, threshold). Tu pourras étendre en multi-groupes.
  const slip = Slip39.fromArray(
    K,                           // secret à partager
    {
      threshold,                 // t
      groups: [{ threshold, shares }], // un seul groupe
      passphrase: passphrase || undefined, // protège K côté SLIP-39 (optionnel)
    }
  );

  // mnémoniques SLIP-39 (ordre arbitraire)
  const mnemonics: string[] = [];
  for (const path of slip.getPathList()) {
    mnemonics.push(slip.fromPath(path));
  }

  return { ciphertext, mnemonics };
}

/**
 * Récupère la phrase BIP-39 à partir :
 * - des mnémoniques SLIP-39 (threshold atteints)
 * - du ciphertext OpenPGP
 * - de la passphrase SLIP-39 si tu en as mis une (optionnelle)
 */
export async function recoverMnemonicWithSlip39(
  mnemonics: string[],
  ciphertext: string,
  passphrase?: string
) {
  // 1) Recompose K via SLIP-39
  const K = Slip39.recoverSecret(mnemonics, passphrase || undefined);
  if (!(K instanceof Uint8Array) || K.length === 0) {
    throw new Error('Échec de la recomposition SLIP-39');
  }
  const pgpPass = btoa(String.fromCharCode(...K));

  // 2) Déchiffre le ciphertext OpenPGP
  const message = await openpgp.readMessage({ armoredMessage: ciphertext });
  const { data: plaintext } = await openpgp.decrypt({
    message,
    passwords: [pgpPass],
  });

  return String(plaintext);
}
