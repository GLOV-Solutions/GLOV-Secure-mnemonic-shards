import assert from 'node:assert/strict';
import slip39Helper from 'slip39/src/slip39_helper.js';
import { PasswordDialog } from '../src/components/PasswordDialog.js';
import { ShareManager } from '../src/components/ShareManager.js';
import { decryptWithPassword, encryptWithPassword } from '../src/utils/encryption.js';
import {
  detectShareCollectionFormat,
  detectShareFormat,
  exportShares,
  recoverFromShares,
  SHARE_FORMAT,
} from '../src/formats/index.js';
import { validateShareCollection } from '../src/utils/validation.js';

const MNEMONIC_12 = `${'abandon '.repeat(11)}about`;
const MNEMONIC_24 = `${'abandon '.repeat(23)}art`;

function combinations(values, size) {
  const result = [];

  function visit(start, current) {
    if (current.length === size) {
      result.push(current.slice());
      return;
    }

    for (let index = start; index <= values.length - (size - current.length); index += 1) {
      current.push(values[index]);
      visit(index + 1, current);
      current.pop();
    }
  }

  visit(0, []);
  return result;
}

function decodeGlovShare(share) {
  return JSON.parse(atob(share));
}

function encodeSlip39TestShare({
  identifier = 12345,
  groupIndex = 0,
  groupThreshold = 2,
  groupCount = 3,
  memberIndex = 0,
  memberThreshold = 1,
  shareByte = 1,
} = {}) {
  return slip39Helper.encodeMnemonic(
    identifier,
    1,
    0,
    groupIndex,
    groupThreshold,
    groupCount,
    memberIndex,
    memberThreshold,
    Array(16).fill(shareByte),
  );
}

function createFakeElement(tagName = 'div') {
  const element = {
    tagName,
    children: [],
    parentNode: null,
    style: {},
    attributes: {},
    className: '',
    id: '',
    value: '',
    textContent: '',
    innerHTML: '',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((candidate) => candidate !== child);
      child.parentNode = null;
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener() {},
    focus() {},
  };

  element.classList = {
    add(...classNames) {
      const classes = new Set(element.className.split(/\s+/).filter(Boolean));
      classNames.forEach((className) => classes.add(className));
      element.className = [...classes].join(' ');
    },
    remove(...classNames) {
      const removed = new Set(classNames);
      element.className = element.className
        .split(/\s+/)
        .filter((className) => className && !removed.has(className))
        .join(' ');
    },
    contains(className) {
      return element.className.split(/\s+/).includes(className);
    },
  };

  return element;
}

function findFakeElement(root, selector) {
  const matches = selector.startsWith('#')
    ? (element) => element.id === selector.slice(1)
    : (element) => element.className.split(/\s+/).includes(selector.slice(1));

  if (matches(root)) return root;
  for (const child of root.children) {
    const match = findFakeElement(child, selector);
    if (match) return match;
  }
  return null;
}

async function testPasswordDialogVisibility() {
  const previousDocument = globalThis.document;
  const body = createFakeElement('body');
  globalThis.document = {
    body,
    createElement: (tagName) => createFakeElement(tagName),
    querySelector: (selector) => findFakeElement(body, selector),
  };

  try {
    const dialog = new PasswordDialog();
    const pendingPassword = dialog.show();
    const overlay = globalThis.document.querySelector('.password-dialog-overlay');
    const passwordInput = globalThis.document.querySelector('#dialogPasswordInput');

    assert.ok(overlay, 'password dialog must be mounted');
    assert.equal(overlay.classList.contains('active'), true, 'password dialog must be visible');
    assert.equal(passwordInput?.type, 'password', 'password input must be available');

    dialog.handleCancel();
    await assert.rejects(pendingPassword, /cancelled password input/i);
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

async function recoverThroughShareManager(shares, pasted, password = '') {
  const previousDocument = globalThis.document;
  const recoverInput = { value: shares.join('\n') };
  const recoverResult = {};
  const recoverButton = { disabled: false, textContent: '' };
  const elements = new Map([
    ['#recoverInput', recoverInput],
    ['#recoverResult', recoverResult],
    ['#recoverBtn', recoverButton],
  ]);
  globalThis.document = {
    querySelector: (selector) => elements.get(selector) || null,
  };

  try {
    const manager = new ShareManager();
    let displayedResult = null;
    let recoveryError = null;
    manager.displayRecoverResult = (mnemonic, usedShares, threshold) => {
      displayedResult = { mnemonic, usedShares, threshold };
    };
    manager.displayRecoveryFailure = (error) => {
      recoveryError = error;
    };
    manager.showInfo = () => {};
    if (password) {
      manager.getPasswordFromDialog = async () => password;
    }

    const success = pasted
      ? await manager.recoverMnemonic()
      : await manager.recoverMnemonicWithShares(shares);

    assert.equal(success, true, recoveryError?.message || 'ShareManager recovery failed');
    return displayedResult;
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
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

async function testGlovGeneration() {
  const total = 5;
  const threshold = 3;
  const generated = await exportShares({
    mnemonic: MNEMONIC_24,
    total,
    threshold,
    format: SHARE_FORMAT.GLOV_SECURE,
  });

  assert.equal(generated.format, SHARE_FORMAT.GLOV_SECURE);
  assert.equal(generated.total, total);
  assert.equal(generated.threshold, threshold);
  assert.equal(generated.shares.length, total);
  assert.equal(new Set(generated.shares).size, total, 'GLOV shares must be unique');
  assert.ok(generated.setId, 'GLOV generation must return a set identifier');

  const payloads = generated.shares.map(decodeGlovShare);
  assert.deepEqual(payloads.map(({ index }) => index), [1, 2, 3, 4, 5]);
  assert.ok(payloads.every(({ setId }) => setId === generated.setId));
  assert.ok(payloads.every((payload) => payload.threshold === threshold && payload.total === total));
  assert.ok(payloads.every(({ data }) => atob(data).length > 0));
  assert.ok(generated.shares.every(
    (share) => detectShareFormat(share).format === SHARE_FORMAT.GLOV_SECURE,
  ));

  const validation = validateShareCollection(generated.shares);
  assert.equal(validation.isValid, true, validation.errors.join(' | '));

  for (const subset of combinations(generated.shares, threshold)) {
    const recovered = await recoverFromShares({
      shares: subset,
      format: SHARE_FORMAT.GLOV_SECURE,
      password: '',
    });
    assert.equal(recovered.mnemonic, MNEMONIC_24, 'every threshold-sized GLOV subset must recover');
  }

  await assert.rejects(
    recoverFromShares({
      shares: generated.shares.slice(0, threshold - 1),
      format: SHARE_FORMAT.GLOV_SECURE,
      password: '',
    }),
    /at least 3 shares are required/i,
  );

  const secondGeneration = await exportShares({
    mnemonic: MNEMONIC_24,
    total,
    threshold,
    format: SHARE_FORMAT.GLOV_SECURE,
  });
  assert.notEqual(secondGeneration.setId, generated.setId, 'each GLOV generation needs a new set id');
}

async function testSlip39Generation() {
  const total = 5;
  const threshold = 3;
  const generated = await exportShares({
    mnemonic: MNEMONIC_12,
    total,
    threshold,
    format: SHARE_FORMAT.SLIP39,
  });

  assert.equal(generated.format, SHARE_FORMAT.SLIP39);
  assert.equal(generated.total, total);
  assert.equal(generated.threshold, threshold);
  assert.equal(generated.shares.length, total);
  assert.equal(new Set(generated.shares).size, total, 'SLIP-39 shares must be unique');
  assert.ok(generated.shares.every((share) => share === share.trim().toLowerCase()));
  assert.ok(generated.shares.every((share) => share.split(/\s+/).length >= 20));
  assert.ok(generated.shares.every(
    (share) => detectShareFormat(share).format === SHARE_FORMAT.SLIP39,
  ));
  const generatedSummary = detectShareCollectionFormat(generated.shares);
  assert.equal(generatedSummary.hasIncompatibleSlip39Sets, false);
  assert.equal(generatedSummary.slip39Fingerprints.length, 1);

  for (const subset of combinations(generated.shares, threshold)) {
    const recovered = await recoverFromShares({
      shares: subset,
      format: SHARE_FORMAT.SLIP39,
      password: '',
    });
    assert.equal(recovered.mnemonic, MNEMONIC_12, 'every threshold-sized SLIP-39 subset must recover');
  }

  await assert.rejects(
    recoverFromShares({
      shares: generated.shares.slice(0, threshold - 1),
      format: SHARE_FORMAT.SLIP39,
      password: '',
    }),
  );

  await assert.rejects(
    exportShares({
      mnemonic: `${'abandon '.repeat(11)}abandon`,
      total,
      threshold,
      format: SHARE_FORMAT.SLIP39,
    }),
    /invalid bip-39 mnemonic checksum/i,
  );

}

async function testGlovEncryption() {
  const total = 5;
  const threshold = 3;
  const password = 'Strong#Generation42';
  const generated = await exportShares({
    mnemonic: MNEMONIC_24,
    total,
    threshold,
    format: SHARE_FORMAT.GLOV_SECURE,
  });

  await withSecureContext(async () => {
    const plainShares = generated.shares.slice(0, threshold);
    const encryptedShares = [];

    for (const share of plainShares) {
      encryptedShares.push(await encryptWithPassword(share, password));
    }

    assert.equal(new Set(encryptedShares).size, threshold, 'encrypted shares must be unique');
    assert.ok(encryptedShares.every((share) => share.startsWith('-----BEGIN PGP MESSAGE-----')));
    assert.ok(encryptedShares.every(
      (share) => detectShareFormat(share).format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED,
    ));
    assert.ok(encryptedShares.every((share, index) => !share.includes(plainShares[index])));

    await assert.rejects(
      decryptWithPassword(encryptedShares[0], 'Wrong#Password42'),
      /invalid password|unable to decrypt/i,
    );

    const decryptedShares = [];
    for (const encryptedShare of encryptedShares) {
      decryptedShares.push(await decryptWithPassword(encryptedShare, password));
    }
    assert.deepEqual(decryptedShares, plainShares);

    const recovered = await recoverFromShares({
      shares: decryptedShares,
      format: SHARE_FORMAT.GLOV_SECURE,
      password: '',
    });
    assert.equal(recovered.mnemonic, MNEMONIC_24, 'encrypted GLOV shares must recover after decryption');

    await assert.rejects(
      recoverFromShares({
        shares: [plainShares[0], encryptedShares[1]],
        format: '',
        password: '',
      }),
      /do not mix plain shares and GPG shares/i,
    );
  });
}

async function testFormatMixRejection() {
  const glov = await exportShares({
    mnemonic: MNEMONIC_12,
    total: 3,
    threshold: 2,
    format: SHARE_FORMAT.GLOV_SECURE,
  });
  const slip39 = await exportShares({
    mnemonic: MNEMONIC_12,
    total: 3,
    threshold: 2,
    format: SHARE_FORMAT.SLIP39,
  });

  await assert.rejects(
    recoverFromShares({
      shares: [glov.shares[0], slip39.shares[0]],
      format: '',
      password: '',
    }),
    /cannot mix glov secure shards and slip-39 shares/i,
  );
}

async function assertEquivalentRecoveryPaths({ mnemonic, format }) {
  const generated = await exportShares({
    mnemonic,
    total: 5,
    threshold: 3,
    format,
  });
  const selectedShares = generated.shares.slice(0, 3);

  const pastedRecovery = await recoverFromShares({
    shares: [selectedShares.join('\n')],
    password: '',
  });
  const importedRecovery = await recoverFromShares({
    shares: selectedShares,
    password: '',
  });

  assert.equal(pastedRecovery.mnemonic, mnemonic);
  assert.deepEqual(
    pastedRecovery,
    importedRecovery,
    `${format} recovery must behave identically for pasted and imported shares`,
  );

  const pastedUiResult = await recoverThroughShareManager(selectedShares, true);
  const importedUiResult = await recoverThroughShareManager(selectedShares, false);
  assert.deepEqual(
    pastedUiResult,
    importedUiResult,
    `${format} ShareManager paths must display the same recovery result`,
  );
}

async function testRecoveryInputPaths() {
  await assertEquivalentRecoveryPaths({
    mnemonic: MNEMONIC_24,
    format: SHARE_FORMAT.GLOV_SECURE,
  });
  await assertEquivalentRecoveryPaths({
    mnemonic: MNEMONIC_12,
    format: SHARE_FORMAT.SLIP39,
  });
}

async function testEncryptedRecoveryInputPaths() {
  await withSecureContext(async () => {
    const password = 'correct horse battery staple';
    const generated = await exportShares({
      mnemonic: MNEMONIC_24,
      total: 5,
      threshold: 3,
      format: SHARE_FORMAT.GLOV_SECURE,
    });
    const encryptedShares = await Promise.all(
      generated.shares.slice(0, 3).map((share) => encryptWithPassword(share, password)),
    );

    const pastedResult = await recoverThroughShareManager(encryptedShares, true, password);
    const importedResult = await recoverThroughShareManager(encryptedShares, false, password);

    assert.equal(pastedResult.mnemonic, MNEMONIC_24);
    assert.deepEqual(
      pastedResult,
      importedResult,
      'encrypted GLOV recovery must behave identically for pasted and imported shares',
    );
  });
}

async function testRecoveredMnemonicValidation() {
  const generated = await exportShares({
    mnemonic: 'not a valid mnemonic',
    total: 3,
    threshold: 2,
    format: SHARE_FORMAT.GLOV_SECURE,
  });

  await assert.rejects(
    recoverFromShares({
      shares: generated.shares.slice(0, 2),
      password: '',
    }),
    (error) => error.code === 'INVALID_RECOVERED_MNEMONIC',
  );
}

function testSlip39MetadataCompatibility() {
  const firstGroup = encodeSlip39TestShare({
    groupIndex: 0,
    memberIndex: 0,
    memberThreshold: 2,
  });
  const secondGroup = encodeSlip39TestShare({
    groupIndex: 1,
    memberIndex: 0,
    memberThreshold: 3,
    shareByte: 2,
  });

  const compatible = detectShareCollectionFormat([firstGroup, secondGroup]);
  assert.equal(compatible.hasIncompatibleSlip39Sets, false);
  assert.equal(compatible.slip39Fingerprints.length, 1);

  const differentGroupPolicy = encodeSlip39TestShare({
    groupIndex: 1,
    groupThreshold: 3,
    groupCount: 3,
    shareByte: 3,
  });
  assert.deepEqual(
    firstGroup.split(' ').slice(0, 2),
    differentGroupPolicy.split(' ').slice(0, 2),
    'the regression fixture must share the same first two words',
  );

  const incompatiblePolicy = detectShareCollectionFormat([firstGroup, differentGroupPolicy]);
  assert.equal(
    incompatiblePolicy.hasIncompatibleSlip39Sets,
    true,
    'same identifier with different group settings must be rejected',
  );
  assert.equal(incompatiblePolicy.slip39Fingerprints.length, 2);

  const inconsistentMemberThreshold = encodeSlip39TestShare({
    groupIndex: 0,
    memberIndex: 1,
    memberThreshold: 3,
    shareByte: 4,
  });
  const incompatibleGroup = detectShareCollectionFormat([
    firstGroup,
    inconsistentMemberThreshold,
  ]);
  assert.equal(
    incompatibleGroup.hasIncompatibleSlip39Sets,
    true,
    'member thresholds must be consistent inside a group',
  );
}

async function run() {
  await testPasswordDialogVisibility();
  await testGlovGeneration();
  await testSlip39Generation();
  await testGlovEncryption();
  await testFormatMixRejection();
  await testRecoveryInputPaths();
  await testEncryptedRecoveryInputPaths();
  await testRecoveredMnemonicValidation();
  testSlip39MetadataCompatibility();
  console.log('generation: all tests passed');
}

run();
