import assert from 'node:assert/strict';
import { wordlist as canonicalWordlist } from '@scure/bip39/wordlists/english';
import { split, combine } from 'shamir-secret-sharing';
import { BIP39_WORDLIST } from '../src/constants/bip39-words.js';
import { encryptWithPassword, decryptWithPassword } from '../src/utils/encryption.js';
import { generateMnemonicWords } from '../src/utils/mnemonic.js';
import {
  analyzePastedShareFormats,
  normalizeShardInput,
  validateAndNormalizeShareObjects,
  validateMnemonic,
  validateShareCollection,
  wrapEncryptedShareForQr,
  wrapPlainShareForQr,
} from '../src/utils/validation.js';

function encodeBytes(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function encodeShare({ setId, index, threshold, total, dataBytes }) {
  const payload = {
    index,
    threshold,
    total,
    data: encodeBytes(dataBytes),
  };

  if (setId !== undefined) {
    payload.setId = setId;
  }

  return btoa(JSON.stringify(payload));
}

function assertShareCollectionFails(shares, pattern) {
  const validation = validateShareCollection(shares);
  assert.equal(validation.isValid, false, 'share collection should be invalid');
  assert.match(validation.errors.join(' | '), pattern);
}

function assertShareNormalizationFails(shares, pattern) {
  const validation = validateAndNormalizeShareObjects(shares);
  assert.equal(validation.isValid, false, 'share normalization should be invalid');
  assert.match(validation.errors.join(' | '), pattern);
}

function testCanonicalWordlist() {
  assert.equal(BIP39_WORDLIST.length, canonicalWordlist.length, 'wordlist length mismatch');
  assert.deepEqual(BIP39_WORDLIST, canonicalWordlist, 'local wordlist diverges from canonical BIP-39 list');
}

function testMnemonicGeneration() {
  for (const wordCount of [12, 24]) {
    for (let i = 0; i < 250; i++) {
      const words = generateMnemonicWords(wordCount);
      assert.equal(words.length, wordCount, `generated mnemonic should contain ${wordCount} words`);

      const validation = validateMnemonic(words);
      assert.equal(validation.isValid, true, `generated ${wordCount}-word mnemonic should validate`);
      assert.equal(validation.hasChecksumError, false, 'generated mnemonic checksum should be valid');
    }
  }
}

function testPastedFormatAnalysis() {
  const plainShare = encodeShare({
    setId: 'set-a',
    index: 1,
    threshold: 2,
    total: 3,
    dataBytes: Uint8Array.from([1, 2, 3]),
  });

  const pgpShare = '-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----';

  const plainOnly = analyzePastedShareFormats([plainShare]);
  assert.deepEqual(
    plainOnly,
    { plainCount: 1, gpgCount: 0, unknownCount: 0, isMixedPlainAndGpg: false },
    'plain share detection failed'
  );

  const gpgOnly = analyzePastedShareFormats([pgpShare]);
  assert.deepEqual(
    gpgOnly,
    { plainCount: 0, gpgCount: 1, unknownCount: 0, isMixedPlainAndGpg: false },
    'GPG share detection failed'
  );

  const mixed = analyzePastedShareFormats([plainShare, pgpShare]);
  assert.equal(mixed.isMixedPlainAndGpg, true, 'mixed pasted formats should be rejected');
}

function testShareSetConsistency() {
  const bytes = Uint8Array.from([10, 20, 30, 40]);
  const newShare1 = encodeShare({ setId: 'set-a', index: 1, threshold: 2, total: 3, dataBytes: bytes });
  const newShare2 = encodeShare({ setId: 'set-a', index: 2, threshold: 2, total: 3, dataBytes: bytes });
  const otherSetShare = encodeShare({ setId: 'set-b', index: 2, threshold: 2, total: 3, dataBytes: bytes });
  const legacyShare = encodeShare({ index: 2, threshold: 2, total: 3, dataBytes: bytes });

  const validCollection = validateShareCollection([newShare1, newShare2]);
  assert.equal(validCollection.isValid, true, 'same-set shares should validate');

  const validNormalization = validateAndNormalizeShareObjects([newShare1, newShare2]);
  assert.equal(validNormalization.isValid, true, 'same-set shares should normalize');
  assert.equal(validNormalization.setId, 'set-a', 'normalized setId should be preserved');

  const legacyCollection = validateShareCollection([
    encodeShare({ index: 1, threshold: 2, total: 3, dataBytes: bytes }),
    legacyShare,
  ]);
  assert.equal(legacyCollection.isValid, true, 'legacy shares without setId should remain compatible');

  assertShareCollectionFails([newShare1, otherSetShare], /same set/i);
  assertShareNormalizationFails([newShare1, otherSetShare], /same set/i);

  assertShareCollectionFails([newShare1, legacyShare], /set identifier/i);
  assertShareNormalizationFails([newShare1, legacyShare], /set identifier/i);
}

function testQrWrappersAndLegacyCompatibility() {
  const plainShare = encodeShare({
    setId: 'set-qr',
    index: 1,
    threshold: 2,
    total: 3,
    dataBytes: Uint8Array.from([11, 22, 33]),
  });

  const plainQr = wrapPlainShareForQr(plainShare);
  const normalizedPlainQr = normalizeShardInput(plainQr);
  assert.equal(normalizedPlainQr.isValid, true, 'plain QR wrapper should be valid');
  assert.equal(normalizedPlainQr.type, 'plain', 'plain QR should normalize as plain payload');
  assert.equal(normalizedPlainQr.value, plainShare, 'plain QR wrapper should unwrap to legacy payload');

  const armored =
    '-----BEGIN PGP MESSAGE-----\nVersion: OpenPGP\n\nwcBMA1test\n=abcd\n-----END PGP MESSAGE-----';
  const gpgQr = wrapEncryptedShareForQr(armored);
  const normalizedGpgQr = normalizeShardInput(gpgQr);
  assert.equal(normalizedGpgQr.isValid, true, 'GPG QR wrapper should be valid');
  assert.equal(normalizedGpgQr.type, 'gpg', 'GPG QR should normalize as encrypted payload');
  assert.equal(normalizedGpgQr.value, armored, 'GPG QR wrapper should unwrap to armored message');

  const multiShardQr = `${plainQr}${plainQr}`;
  const normalizedMulti = normalizeShardInput(multiShardQr);
  assert.equal(normalizedMulti.isValid, false, 'QR containing multiple shards should be rejected');

  const unknownQr = 'GLOV-SHARD-V1:not-a-valid-payload';
  const normalizedUnknown = normalizeShardInput(unknownQr);
  assert.equal(normalizedUnknown.isValid, false, 'invalid QR payload should be rejected');

  const legacyPlain = normalizeShardInput(plainShare);
  assert.equal(legacyPlain.isValid, true, 'legacy .txt payload should remain valid');
  assert.equal(legacyPlain.type, 'plain', 'legacy .txt payload should normalize as plain');

  const legacyGpg = normalizeShardInput(armored);
  assert.equal(legacyGpg.isValid, true, 'legacy .gpg armored content should remain valid');
  assert.equal(legacyGpg.type, 'gpg', 'legacy .gpg payload should normalize as gpg');
}

async function withSecureContext(fn) {
  const previousWindow = globalThis.window;
  globalThis.window = { isSecureContext: true };
  try {
    await fn();
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
}

async function testRecoveryRoundTripPlainAndEncrypted() {
  const mnemonic = generateMnemonicWords(24).join(' ');
  const secret = new TextEncoder().encode(mnemonic);
  const threshold = 3;
  const total = 5;
  const setId = 'roundtrip-set';
  const rawShares = await split(secret, total, threshold);

  const plainShares = rawShares.map((share, index) =>
    encodeShare({
      setId,
      index: index + 1,
      threshold,
      total,
      dataBytes: share,
    })
  );

  const normalizedPlain = validateAndNormalizeShareObjects(plainShares);
  assert.equal(normalizedPlain.isValid, true, 'plain shares should normalize');

  const recoveredPlainBytes = await combine(
    normalizedPlain.shares.slice(0, threshold).map((entry) => entry.bytes)
  );
  const recoveredPlain = new TextDecoder().decode(recoveredPlainBytes).trim();
  assert.equal(recoveredPlain, mnemonic, 'plain roundtrip should recover the same mnemonic');

  await withSecureContext(async () => {
    const password = 'Strong#Password42';
    const encryptedShares = [];

    for (const share of plainShares) {
      encryptedShares.push(await encryptWithPassword(share, password));
    }

    const decryptedShares = [];
    for (const encryptedShare of encryptedShares) {
      decryptedShares.push(await decryptWithPassword(encryptedShare, password));
    }

    const normalizedDecrypted = validateAndNormalizeShareObjects(decryptedShares);
    assert.equal(normalizedDecrypted.isValid, true, 'decrypted shares should normalize');

    const recoveredEncryptedBytes = await combine(
      normalizedDecrypted.shares.slice(0, threshold).map((entry) => entry.bytes)
    );
    const recoveredEncrypted = new TextDecoder().decode(recoveredEncryptedBytes).trim();
    assert.equal(recoveredEncrypted, mnemonic, 'encrypted roundtrip should recover the same mnemonic');
  });
}

async function run() {
  testCanonicalWordlist();
  testMnemonicGeneration();
  testPastedFormatAnalysis();
  testShareSetConsistency();
  testQrWrappersAndLegacyCompatibility();
  await testRecoveryRoundTripPlainAndEncrypted();
  console.log('offline-regression: all tests passed');
}

run();
