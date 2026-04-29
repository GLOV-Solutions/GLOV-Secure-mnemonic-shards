# Guide Utilisateur - GLOV Secure Mnemonic Shards

Ce guide explique l'utilisation de l'outil pour generer et recuperer des shares de phrase mnemotechnique BIP-39, en mode GLOV Secure (par defaut) ou en mode SLIP-39 compatible.

## 1. Principe

- L'outil fonctionne 100 % hors ligne (navigateur uniquement).
- Vous partez d'une phrase BIP-39 (12 ou 24 mots).
- Cette phrase est decoupee en plusieurs shares.
- Un seuil (threshold) definit combien de shares sont necessaires pour recuperer la phrase.

Exemple: 5 shares au total, seuil 3 -> n'importe quelles 3 shares permettent la recuperation.

## 2. Choisir le bon format

Dans la section Configuration, option `Backup format`:

- `GLOV Secure format` (recommande / par defaut)
  - Usage principal: sauvegardes notariales, exports .txt/.gpg, feuilles imprimables.
- `SLIP-39 compatible format` (avance)
  - Usage principal: interop avec wallets/outils compatibles SLIP-39.

Recommandation:

- Utilisez GLOV Secure par defaut.
- Activez SLIP-39 uniquement si vous avez un besoin d'interoperabilite wallet.

## 3. Generation de shares

1. Choisir 12 ou 24 mots.
2. Saisir la phrase ou cliquer sur `Generate Mnemonic`.
3. Definir:
   - `Total Shares` (3 a 7)
   - `Shares Required for Recovery` (seuil)
4. Choisir le format de backup.
5. Cliquer sur `Generate Shares`.

### 3.1 En mode GLOV Secure

Fonctions disponibles:

- Copy
- Download `.txt`
- Download `.gpg` (si chiffrement active)
- QR / Print

Le chiffrement `.gpg` utilise OpenPGP avec mot de passe.

### 3.2 En mode SLIP-39 compatible

Fonctions disponibles:

- Copy
- Download `.txt`
- QR / Print

Chaque share est une phrase de mots SLIP-39.

Important:

- Le mode SLIP-39 n'active pas l'export `.gpg` dans cette version.

## 4. Recuperation

Deux modes d'entree:

- `Paste Input`: coller une share par ligne
- `File Upload`: importer des fichiers `.txt` et/ou `.gpg`

### 4.1 Formats detectes automatiquement

L'application detecte automatiquement:

- GLOV legacy Base64
- `GLOV-SHARD-V1`
- `GLOV-SHARD-GPG-V1`
- OpenPGP armor
- SLIP-39

Un badge apparait dans la zone Recovery:

- `Detected format: GLOV Secure shards`
- `Detected format: GLOV Secure encrypted shards`
- `Detected format: SLIP-39 compatible shares`

### 4.2 Regles de securite anti-melange

Les melanges suivants sont bloques:

- Melange GLOV + SLIP-39
- Melange de plusieurs sets SLIP-39 incompatibles

Message d'erreur cle:

`You cannot mix GLOV Secure shards and SLIP-39 shares in the same recovery.`

## 5. Bonnes pratiques

- Stocker les shares dans des lieux differents.
- Ne jamais conserver toutes les shares au meme endroit.
- Si chiffrement actif, conserver le mot de passe separement.
- Tester une recuperation a blanc (hors contexte sensible) pour valider votre procedure.

## 6. Depannage rapide

- `Invalid share format`
  - Verifier le collage (une share par ligne)
  - Verifier que les shares viennent du meme lot
- `Insufficient shares`
  - Ajouter des shares jusqu'au seuil
- Erreur de melange
  - Ne pas melanger GLOV et SLIP-39
  - Ne pas melanger plusieurs lots SLIP-39
- Echec de decryption `.gpg`
  - Verifier le mot de passe exact

## 7. Limites connues

- Les options de chiffrement `.gpg` s'appliquent au format GLOV Secure.
- Le mode SLIP-39 est volontairement separe pour l'interoperabilite wallet.

