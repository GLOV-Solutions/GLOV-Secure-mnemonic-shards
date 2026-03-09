import assert from 'node:assert/strict';
import { wordlist as canonicalWordlist } from '@scure/bip39/wordlists/english';
import { BIP39_WORDLIST } from '../src/constants/bip39-words.js';
import { generateMnemonicWords } from '../src/utils/mnemonic.js';
import {
  analyzePastedShareFormats,
  validateAndNormalizeShareObjects,
  validateMnemonic,
  validateShareCollection,
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

function run() {
  testCanonicalWordlist();
  testMnemonicGeneration();
  testPastedFormatAnalysis();
  testShareSetConsistency();
  console.log('offline-regression: all tests passed');
}

run();
