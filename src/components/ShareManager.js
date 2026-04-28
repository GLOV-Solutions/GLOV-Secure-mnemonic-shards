/**
 * Share manager component
 * Responsible for generating shares, displaying them, copying, and downloading
 */

import { split, combine } from 'shamir-secret-sharing';
import QRCode from 'qrcode';
import { getElement, createElement, toggleElement, toggleClass, setHTML, setText, clearElement, addEvent } from '../utils/dom.js';
import { copyToClipboard, downloadFile, formatDateTime, base64Encode } from '../utils/helpers.js';
import { analyzePastedShareFormats, validateMnemonic, validateShareCollection, validateAndNormalizeShareObjects, normalizeShardInput, wrapPlainShareForQr, wrapEncryptedShareForQr } from '../utils/validation.js';
import { SELECTORS, CSS_CLASSES, ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES, FILE_TEMPLATES } from '../constants/index.js';
import { t } from '../utils/i18n.js';
import { encryptWithPassword, decryptWithPassword, validatePasswordStrength, validatePasswordMatch } from '../utils/encryption.js';
import { passwordDialog } from './PasswordDialog.js';

function generateShareSetId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Secure random source is not available for share set generation.');
}

export class ShareManager {
  constructor() {
    this.currentShares = [];
    this.currentThreshold = 0;
    this.copiedShares = new Set(); // Track indices of shares already copied
    this.isEncryptionEnabled = false; // Whether encryption is enabled
    this.encryptionPassword = ''; // Encryption password
    this.encryptedShares = []; // Encrypted shares cache
  }

  getShareMeta(shareContent) {
    try {
      const parsed = JSON.parse(atob(shareContent));
      if (parsed && parsed.index && parsed.threshold) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Initialize encryption-related listeners
   */
  initEncryptionListeners() {
    const encryptionForm = getElement('#encryptionForm');
    const enableEncryptionCheckbox = getElement(SELECTORS.ENABLE_ENCRYPTION);
    const encryptionFields = getElement(SELECTORS.ENCRYPTION_FIELDS);
    const encryptionPassword = getElement(SELECTORS.ENCRYPTION_PASSWORD);
    const confirmPassword = getElement(SELECTORS.CONFIRM_PASSWORD);
    const passwordStrength = getElement(SELECTORS.PASSWORD_STRENGTH);
    const passwordMatch = getElement(SELECTORS.PASSWORD_MATCH);

    if (!enableEncryptionCheckbox || !encryptionFields) return;

    if (encryptionForm) {
      addEvent(encryptionForm, 'submit', (e) => e.preventDefault());
    }

    // Toggle encryption options
    addEvent(enableEncryptionCheckbox, 'change', () => {
      this.isEncryptionEnabled = enableEncryptionCheckbox.checked;
      toggleElement(encryptionFields, this.isEncryptionEnabled);

      // If encryption is disabled, wipe password fields
      if (!this.isEncryptionEnabled) {
        if (encryptionPassword) encryptionPassword.value = '';
        if (confirmPassword) confirmPassword.value = '';
        if (passwordStrength) passwordStrength.textContent = '';
        if (passwordMatch) passwordMatch.textContent = '';
        this.encryptionPassword = '';
      }
    });

    // Password strength validation
    if (encryptionPassword && passwordStrength) {
      addEvent(encryptionPassword, 'input', () => {
        const password = encryptionPassword.value;
        if (password) {
          const validation = validatePasswordStrength(password);
          passwordStrength.textContent = validation.message;
          passwordStrength.className = `password-strength ${validation.strength}`;
        } else {
          passwordStrength.textContent = '';
        }

        // Check confirmation match
        this.checkPasswordMatch();
      });
    }

    // Confirm password validation
    if (confirmPassword && passwordMatch) {
      addEvent(confirmPassword, 'input', () => {
        this.checkPasswordMatch();
      });
    }
  }

  /**
   * Check if password and confirmation match
   */
  checkPasswordMatch() {
    const encryptionPassword = getElement(SELECTORS.ENCRYPTION_PASSWORD);
    const confirmPassword = getElement(SELECTORS.CONFIRM_PASSWORD);
    const passwordMatch = getElement(SELECTORS.PASSWORD_MATCH);

    if (!encryptionPassword || !confirmPassword || !passwordMatch) return;

    const password = encryptionPassword.value;
    const confirm = confirmPassword.value;

    if (confirm) {
      const validation = validatePasswordMatch(password, confirm);
      passwordMatch.textContent = validation.message;
      passwordMatch.className = `password-match ${validation.isValid ? 'valid' : 'invalid'}`;
    } else {
      passwordMatch.textContent = '';
    }
  }

  /**
   * Validate encryption settings
   * @returns {Object} result { isValid: boolean, error?: string }
   */
  validateEncryptionSettings() {
    if (!this.isEncryptionEnabled) {
      return { isValid: true };
    }

    const encryptionPassword = getElement(SELECTORS.ENCRYPTION_PASSWORD);
    const confirmPassword = getElement(SELECTORS.CONFIRM_PASSWORD);

    if (!encryptionPassword || !confirmPassword) {
      return { isValid: false, error: 'Missing encryption fields, please refresh and retry.' };
    }

    const password = encryptionPassword.value;
    const confirm = confirmPassword.value;

    // Strength check
    const strengthValidation = validatePasswordStrength(password);
    if (strengthValidation.strength === 'weak') {
      return { isValid: false, error: 'Password too weak. Use at least 8 characters with letters, numbers, and symbols.' };
    }

    // Match check
    const matchValidation = validatePasswordMatch(password, confirm);
    if (!matchValidation.isValid) {
      return { isValid: false, error: 'Passwords do not match.' };
    }

    this.encryptionPassword = password;
    return { isValid: true };
  }

  /**
   * Securely wipe in-memory encryption password
   */
  clearEncryptionPassword() {
    this.encryptionPassword = '';
  }

  clearUploadEncryptionPassword() {
    this.uploadEncryptionPassword = '';
  }

  /**
   * Generate shares
   * @param {string[]} words - mnemonic words
   * @param {number} totalShares - total number of shares
   * @param {number} threshold - shares required to recover
   * @returns {Promise<boolean>} success
   */
  async generateShares(words, totalShares, threshold) {
    try {
      // Validate mnemonic
      const validation = validateMnemonic(words);
      if (!validation.isValid) {
        this.showError(validation.errors[0]);
        return false;
      }

      // Validate encryption settings if enabled
      const encryptionValidation = this.validateEncryptionSettings();
      if (!encryptionValidation.isValid) {
        this.showError(encryptionValidation.error);
        return false;
      }

      // Generate shares
      const mnemonic = words.join(' ');
      const secretBytes = new TextEncoder().encode(mnemonic);
      const rawShares = await split(secretBytes, totalShares, threshold);
      const setId = generateShareSetId();

      // Base64-encode shares
      this.currentShares = rawShares.map((share, index) => {
        const shareData = {
          setId,
          index: index + 1,
          threshold: threshold,
          total: totalShares,
          data: btoa(String.fromCharCode(...share)),
        };
        return btoa(JSON.stringify(shareData));
      });

      this.currentThreshold = threshold;
      this.encryptedShares = []; // reset encrypted cache
      this.copiedShares.clear(); // reset copy-state

      // Render
      this.displayShares();
      this.showSuccess(SUCCESS_MESSAGES.SHARES_GENERATED);
      return true;
    } catch (error) {
      this.showError(ERROR_MESSAGES.GENERATE_FAILED(error.message));
      return false;
    }
  }

  /**
   * Render shares list
   */
  displayShares() {
    const resultDiv = getElement(SELECTORS.SHARES_RESULT);
    const sharesList = getElement(SELECTORS.SHARES_LIST);
    const thresholdDisplay = getElement(SELECTORS.THRESHOLD_DISPLAY);

    if (!resultDiv || !sharesList || !thresholdDisplay) return;

    thresholdDisplay.textContent = this.currentThreshold;
    clearElement(sharesList);

    this.currentShares.forEach((share, index) => {
      const shareItem = this.createShareItem(share, index + 1);
      sharesList.appendChild(shareItem);
    });

    toggleElement(resultDiv, true);
  }

  /**
   * Build a single share item row
   * @param {string} share - encoded share
   * @param {number} index - index of the share
   * @returns {Element}
   */
  createShareItem(share, index) {
    const shareItem = createElement('div', ['share-item']);

    const header = createElement('div', ['share-header']);

    const title = createElement('div', ['share-title']);
    title.textContent = t('share', index);

    const buttons = createElement('div', ['share-buttons']);

    const copyBtn = createElement('button', ['copy-btn']);

    // If this share was already copied, keep the success state
    if (this.copiedShares.has(index)) {
      copyBtn.textContent = t('success.copySuccess');
      toggleClass(copyBtn, CSS_CLASSES.COPIED, true);
    } else {
      copyBtn.textContent = t('copy');
    }

    addEvent(copyBtn, 'click', () => this.copyShare(copyBtn, share, index));

    const downloadBtn = createElement('button', ['download-btn']);
    downloadBtn.textContent = t('download');
    addEvent(downloadBtn, 'click', () => this.downloadShare(share, index));

    const qrBtn = createElement('button', ['download-btn']);
    qrBtn.textContent = 'QR / Print';
    addEvent(qrBtn, 'click', () => this.showQrPrintView(share, index));

    buttons.appendChild(copyBtn);
    buttons.appendChild(downloadBtn);
    buttons.appendChild(qrBtn);

    header.appendChild(title);
    header.appendChild(buttons);

    const content = createElement('div', ['share-content']);
    content.textContent = share;

    shareItem.appendChild(header);
    shareItem.appendChild(content);

    return shareItem;
  }

  /**
   * Copy a share to clipboard
   * @param {Element} button
   * @param {string} shareContent
   * @param {number} shareIndex
   */
  async copyShare(button, shareContent, shareIndex) {
    const success = await copyToClipboard(shareContent);

    if (success) {
      // Mark as copied (sticky)
      this.copiedShares.add(shareIndex);

      button.textContent = t('success.copySuccess');
      toggleClass(button, CSS_CLASSES.COPIED, true);
    } else {
      this.showError(t('errors.copyFailed'));
    }
  }

  /**
   * Download a share (encrypted or plain)
   * @param {string} shareContent
   * @param {number} shareIndex
   */
  async downloadShare(shareContent, shareIndex) {
    try {
      const encryptionValidation = this.validateEncryptionSettings();

      if (this.isEncryptionEnabled && !encryptionValidation.isValid) {
        this.showError(encryptionValidation.error);
        return;
      }

      if (this.isEncryptionEnabled && encryptionValidation.isValid) {
        // Encrypted download
        await this.downloadEncryptedShare(shareContent, shareIndex);
      } else {
        // Plain download
        this.downloadStandardShare(shareContent, shareIndex);
      }
    } catch (error) {
      this.showError(t('errors.downloadFailed') + ': ' + error.message);
    }
  }

  /**
   * Download encrypted share
   * @param {string} shareContent
   * @param {number} shareIndex
   */
  async downloadEncryptedShare(shareContent, shareIndex) {
    try {
      // Progress info
      this.showInfo(t('encryption.encryptingShare', shareIndex));

      // Encrypt content
      const encryptedContent = await encryptWithPassword(shareContent, this.encryptionPassword);

      // Clear password as soon as possible
      this.clearEncryptionPassword();

      // .txt.gpg extension
      const filename = `${t('shareFilePrefix')}${shareIndex}.txt.gpg`;

      // Save raw GPG payload (no extra text)
      const success = downloadFile(encryptedContent, filename);

      if (success) {
        this.showSuccess(t('success.encryptedShareDownloaded', shareIndex));
      } else {
        this.showError(t('errors.downloadFailed'));
      }
    } catch (error) {
      // Always clear password even on failure
      this.clearEncryptionPassword();
      throw new Error(t('encryption.encryptionFailed') + ': ' + error.message);
    }
  }

  /**
   * Download plain (unencrypted) share
   * @param {string} shareContent
   * @param {number} shareIndex
   */
  downloadStandardShare(shareContent, shareIndex) {
    const fileExtension = 'txt';
    const filename = `${t('shareFilePrefix')}${shareIndex}.${fileExtension}`;

    // Include app info and safety tips
    const fileData = FILE_TEMPLATES.SHARE_CONTENT(shareIndex, shareContent);
    const fileContent = this.formatShareFileContent(fileData);

    const success = downloadFile(fileContent, filename);
    if (success) {
      this.showSuccess(t('success.shareDownloaded', shareIndex));
    } else {
      this.showError(t('errors.downloadFailed'));
    }
  }

  /**
   * Format the file content for a plain share
   * @param {Object} fileData
   * @returns {string}
   */
  formatShareFileContent(fileData) {
    let content = `${t('fileTemplate.appName')} ${t('share', fileData.index)}\n${'='.repeat(50)}\n\n`;

    content += `${t('fileTemplate.shareContent')}:\n${fileData.content}\n\n${'='.repeat(50)}\n${t('fileTemplate.generatedTime')}: ${fileData.timestamp}\n\n${t(
      'fileTemplate.securityTips',
    )}:\n- ${t('fileTemplate.tip1')}\n- ${t('fileTemplate.tip2')}\n- ${t('fileTemplate.tip3')}`;

    return content;
  }

  /**
   * Validate pasted share input
   */
  validateShareInput() {
    const input = getElement(SELECTORS.RECOVER_INPUT);
    const statusDiv = getElement(SELECTORS.INPUT_STATUS);
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);

    if (!input || !statusDiv || !recoverBtn) {
      return;
    }

    const inputText = input.value.trim();

    if (!inputText) {
      this.updateStatus('waiting', t('waitingForInput'));
      recoverBtn.disabled = true;
      return;
    }

    const shareStrings = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (shareStrings.length === 0) {
      this.updateStatus('waiting', t('waitingForInput'));
      recoverBtn.disabled = true;
      return;
    }

    const formatAnalysis = analyzePastedShareFormats(shareStrings);
    if (formatAnalysis.isMixedPlainAndGpg) {
      this.updateStatus('invalid', t('errors.mixedPastedShareFormats'));
      recoverBtn.disabled = true;
      return;
    }
    if (formatAnalysis.plainCount === 0 && formatAnalysis.gpgCount > 0) {
      this.updateStatus('waiting', t('encryption.passwordRequired'));
      recoverBtn.disabled = false;
      return;
    }
    if (formatAnalysis.plainCount === 0 && formatAnalysis.gpgCount === 0 && formatAnalysis.unknownCount > 0) {
      this.updateStatus('invalid', t('errors.invalidShareFormat'));
      recoverBtn.disabled = true;
      return;
    }

    const normalizedEntries = shareStrings.map((line) => normalizeShardInput(line));
    if (normalizedEntries.some((entry) => !entry.isValid && entry.type === 'invalid')) {
      this.updateStatus('invalid', t('errors.invalidShareFormat'));
      recoverBtn.disabled = true;
      return;
    }

    const plainCandidates = normalizedEntries
      .filter((entry) => entry.isValid && entry.type === 'plain')
      .map((entry) => entry.value);

    const validation = validateShareCollection(plainCandidates);

      if (!validation.isValid) {
        if (validation.validCount === 0) {
          this.updateStatus('invalid', t('errors.invalidShareFormat'));
        } else if (validation.errors && validation.errors.some((error) => /duplicate/i.test(error))) {
          // Language-neutral duplicate detection
          this.updateStatus('invalid', t('errors.duplicateShares'));
        } else if (validation.errors && validation.errors.some((error) => /set identifier|same set/i.test(error))) {
          this.updateStatus('invalid', t('errors.inconsistentShareSet'));
        } else {
          this.updateStatus('insufficient', t('errors.insufficientShares', validation.threshold, validation.validCount));
        }
      recoverBtn.disabled = true;
    } else {
      this.updateStatus('valid', t('info.validShares', validation.validCount, validation.threshold));
      recoverBtn.disabled = false;
    }
  }

  /**
   * Recover mnemonic from pasted input
   * @returns {Promise<boolean>}
   */
  async recoverMnemonic() {
    const input = getElement(SELECTORS.RECOVER_INPUT);
    const resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);

    if (!input || !resultDiv || !recoverBtn) {
      return false;
    }

    const inputText = input.value.trim();

    if (!inputText) {
      this.showError(ERROR_MESSAGES.EMPTY_WORDS);
      return false;
    }

    // Show processing state
    recoverBtn.disabled = true;
    recoverBtn.textContent = t('info.recovering');

    try {
      const shareStrings = inputText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const formatAnalysis = analyzePastedShareFormats(shareStrings);
      if (formatAnalysis.isMixedPlainAndGpg) {
        throw new Error(t('errors.mixedPastedShareFormats'));
      }
      if (formatAnalysis.plainCount === 0 && formatAnalysis.gpgCount === 0 && formatAnalysis.unknownCount > 0) {
        throw new Error(t('errors.invalidShareFormat'));
      }

      // Detect whether this is pasted OpenPGP armored content.
      const isEncrypted = formatAnalysis.plainCount === 0 && formatAnalysis.gpgCount > 0;
      const validShareData = [];
      const normalizedEntries = shareStrings.map((line) => normalizeShardInput(line));

      if (normalizedEntries.some((entry) => !entry.isValid && entry.type === 'invalid')) {
        throw new Error(t('errors.invalidShareFormat'));
      }

      for (const entry of normalizedEntries) {
        if (!entry.isValid || entry.type !== 'plain') continue;
        try {
          const shareData = JSON.parse(atob(entry.value));
          if (shareData.threshold && shareData.index && shareData.data) {
            validShareData.push(shareData);
          }
        } catch (_e) {}
      }

      // If no valid standard shares found, try decryption path
      if (validShareData.length === 0 && isEncrypted) {
        // Ask password via dialog
        let password = '';
        let isRetry = false;

        try {
          password = await this.getPasswordFromDialog(isRetry);
        } catch (error) {
          // User cancelled
          throw new Error(t('encryption.passwordRequired'));
        }

        // Try to decrypt each line
        this.showInfo(t('encryption.decryptingShares'));

        for (const entry of normalizedEntries) {
          if (!entry.isValid || entry.type !== 'gpg') continue;
          try {
            const decryptedShare = await decryptWithPassword(entry.value, password);
            const shareData = JSON.parse(atob(decryptedShare));
            if (shareData.threshold && shareData.index && shareData.data) {
              validShareData.push(shareData);
            }
          } catch (e) {
            // If the underlying lib throws language-specific messages, match by intent
            if (/invalid password|wrong password/i.test(e.message)) {
              // Retry once with dialog
              isRetry = true;
              try {
                password = await this.getPasswordFromDialog(isRetry);
                const decryptedShare = await decryptWithPassword(entry.value, password);
                const shareData = JSON.parse(atob(decryptedShare));
                if (shareData.threshold && shareData.index && shareData.data) {
                  validShareData.push(shareData);
                }
              } catch (retryError) {
                if (/invalid password|wrong password/i.test(retryError.message)) {
                  throw new Error(t('encryption.invalidPassword'));
                }
                // Other decryption errors: skip this share
              }
            }
            // Other decryption errors: skip this share
          }
        }

        // Still nothing usable
        if (validShareData.length === 0) {
          throw new Error(t('encryption.decryptionFailed') + t('errors.noValidShares'));
        }
      }

      if (validShareData.length === 0) {
        throw new Error(t('errors.noValidShares'));
      }

      const strictValidation = validateAndNormalizeShareObjects(validShareData);
      if (!strictValidation.isValid) {
        throw new Error(strictValidation.errors[0] || t('errors.invalidShareFormat'));
      }

      const threshold = strictValidation.threshold;
      const shares = strictValidation.shares.slice(0, threshold).map((data) => data.bytes);

      const recoveredBytes = await combine(shares);
      const recoveredMnemonic = new TextDecoder().decode(recoveredBytes);
      this.assertRecoveredMnemonicIsValid(recoveredMnemonic);

      this.displayRecoverResult(recoveredMnemonic, strictValidation.shares.length, threshold);
      return true;
    } catch (error) {
      this.displayRecoverError(error.message);
      return false;
    } finally {
      // Restore button state
      recoverBtn.disabled = false;
      recoverBtn.textContent = t('recoverBtn');
      // Wipe any upload password cache
      this.clearUploadEncryptionPassword();
    }
  }

  /**
   * Recover mnemonic from a provided array of shares
   * @param {Array} shares
   * @param {string} encryptionPassword (deprecated; password is gathered via dialog)
   * @returns {Promise<boolean>}
   */
  async recoverMnemonicWithShares(shares, encryptionPassword) {
    const resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);

    if (!resultDiv || !recoverBtn) {
      return false;
    }

    if (!shares || shares.length === 0) {
      this.showError(ERROR_MESSAGES.EMPTY_WORDS);
      return false;
    }

    // Show processing state
    recoverBtn.disabled = true;
    recoverBtn.textContent = t('info.recovering');

    try {
      const pastedStringShares = shares.filter((share) => typeof share === 'string');
      const formatAnalysis = analyzePastedShareFormats(pastedStringShares);
      if (formatAnalysis.isMixedPlainAndGpg) {
        throw new Error(t('errors.mixedPastedShareFormats'));
      }
      if (pastedStringShares.length > 0 && formatAnalysis.plainCount === 0 && formatAnalysis.gpgCount === 0 && formatAnalysis.unknownCount > 0) {
        throw new Error(t('errors.invalidShareFormat'));
      }

      // Classify shares (encrypted vs plain)
      let isEncrypted = false;
      const validShareData = [];

      for (const share of shares) {
        if (share.encrypted) {
          isEncrypted = true;
          validShareData.push(share);
          continue;
        }

        try {
          if (typeof share === 'string') {
            const normalized = normalizeShardInput(share);
            if (normalized.isValid && normalized.type === 'gpg') {
              isEncrypted = true;
              validShareData.push({ encrypted: true, content: normalized.value });
              continue;
            }
            if (!normalized.isValid || normalized.type !== 'plain') {
              continue;
            }

            const shareData = JSON.parse(atob(normalized.value));
            if (shareData.threshold && shareData.index && shareData.data) {
              validShareData.push(shareData);
            }
          } else if (share.threshold && share.index && share.data) {
            validShareData.push(share);
          }
        } catch (e) {
          isEncrypted = true;
          validShareData.push({ encrypted: true, content: share });
        }
      }

      // Decrypt if needed
      if (isEncrypted) {
        let password = '';
        let isRetry = false;

        try {
          password = await this.getPasswordFromDialog(isRetry);
        } catch (error) {
          throw new Error(t('encryption.passwordRequired'));
        }

        this.showInfo(t('encryption.decryptingShares'));

        const encryptedShares = validShareData.filter((share) => share.encrypted);
        const decryptedShares = [];
        let decryptionSuccess = false;

        for (const encryptedShare of encryptedShares) {
          try {
            const decryptedShare = await decryptWithPassword(encryptedShare.content, password);
            const shareData = JSON.parse(atob(decryptedShare));
            if (shareData.threshold && shareData.index && shareData.data) {
              decryptedShares.push(shareData);
              decryptionSuccess = true;
            }
          } catch (e) {
            if (/invalid password|wrong password/i.test(e.message)) {
              // Retry once
              isRetry = true;
              try {
                password = await this.getPasswordFromDialog(isRetry);
                const decryptedShare = await decryptWithPassword(encryptedShare.content, password);
                const shareData = JSON.parse(atob(decryptedShare));
                if (shareData.threshold && shareData.index && shareData.data) {
                  decryptedShares.push(shareData);
                  decryptionSuccess = true;
                }
              } catch (retryError) {
                if (/invalid password|wrong password/i.test(retryError.message)) {
                  throw new Error(t('encryption.invalidPassword'));
                }
                // Other decryption errors: continue
              }
            }
            // Other errors: continue
          }
        }

        // Merge decrypted with existing plain shares
        const finalShares = validShareData.filter((share) => !share.encrypted).concat(decryptedShares);

        if (finalShares.length === 0) {
          throw new Error(t('encryption.decryptionFailed') + t('errors.noValidShares'));
        }

        const strictValidation = validateAndNormalizeShareObjects(finalShares);
        if (!strictValidation.isValid) {
          throw new Error(strictValidation.errors[0] || t('errors.invalidShareFormat'));
        }

        const threshold = strictValidation.threshold;
        const shareBytes = strictValidation.shares.slice(0, threshold).map((data) => data.bytes);

        const recoveredBytes = await combine(shareBytes);
        const recoveredMnemonic = new TextDecoder().decode(recoveredBytes);
        this.assertRecoveredMnemonicIsValid(recoveredMnemonic);

        this.displayRecoverResult(recoveredMnemonic, strictValidation.shares.length, threshold);
        return true;
      }

      // Plain path
      if (validShareData.length === 0) {
        throw new Error(t('errors.noValidShares'));
      }

      const strictValidation = validateAndNormalizeShareObjects(validShareData);
      if (!strictValidation.isValid) {
        throw new Error(strictValidation.errors[0] || t('errors.invalidShareFormat'));
      }

      const threshold = strictValidation.threshold;
      const shareBytes = strictValidation.shares.slice(0, threshold).map((data) => data.bytes);

      const recoveredBytes = await combine(shareBytes);
      const recoveredMnemonic = new TextDecoder().decode(recoveredBytes);
      this.assertRecoveredMnemonicIsValid(recoveredMnemonic);

      this.displayRecoverResult(recoveredMnemonic, strictValidation.shares.length, threshold);
      return true;
    } catch (error) {
      this.displayRecoverError(error.message);
      return false;
    } finally {
      // Restore button state
      recoverBtn.disabled = false;
      recoverBtn.textContent = t('recoverBtn');
      // Wipe any upload password cache
      this.clearUploadEncryptionPassword();
    }
  }

  /**
   * Show recovery result
   * @param {string} mnemonic
   * @param {number} usedShares
   * @param {number} threshold
   */
  displayRecoverResult(mnemonic, usedShares, threshold) {
    // Decide which tab result area to use
    const activeTabBtn = getElement('.tab-btn.active');
    let resultDiv;

    if (activeTabBtn && activeTabBtn.id === 'pasteTabBtn') {
      resultDiv = getElement(SELECTORS.PASTE_RECOVER_RESULT);
    } else if (activeTabBtn && activeTabBtn.id === 'uploadTabBtn') {
      resultDiv = getElement(SELECTORS.UPLOAD_RECOVER_RESULT);
    } else {
      // Fallback
      resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    }

    if (!resultDiv) return;

    // Wrap words for styling
    const words = mnemonic
      .split(' ')
      .map((word) => `<span class="word">${word}</span>`)
      .join(' ');

    const resultHTML = `
      <div class="alert alert-success">
        <strong>${t('success.recoverySuccess')}</strong><br>
        <strong>${t('mnemonic')}:</strong><br>
        <span class="recovered-mnemonic">${words}</span><br>
        <strong>${t('sharesUsed')}:</strong> ${usedShares} ${t('shares')} (${t('need')} ${threshold} ${t('shares')})<br>
        <strong>${t('recoveryTime')}:</strong> ${formatDateTime()}
      </div>
    `;

    setHTML(resultDiv, resultHTML);
  }

  /**
   * Show recovery error
   * @param {string} errorMessage
   */
  displayRecoverError(errorMessage) {
    // Decide which tab result area to use
    const activeTabBtn = getElement('.tab-btn.active');
    let resultDiv;

    if (activeTabBtn && activeTabBtn.id === 'pasteTabBtn') {
      resultDiv = getElement(SELECTORS.PASTE_RECOVER_RESULT);
    } else if (activeTabBtn && activeTabBtn.id === 'uploadTabBtn') {
      resultDiv = getElement(SELECTORS.UPLOAD_RECOVER_RESULT);
    } else {
      // Fallback
      resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    }

    if (!resultDiv) return;

    // Clear previous content
    clearElement(resultDiv);

    // Build a safe DOM structure
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-error';

    const strongElement = document.createElement('strong');
    strongElement.textContent = t('errors.recoveryFailed');
    alertDiv.appendChild(strongElement);

    const errorTextSpan = document.createElement('span');
    errorTextSpan.textContent = errorMessage;
    alertDiv.appendChild(errorTextSpan);

    alertDiv.appendChild(document.createElement('br'));

    const smallElement = document.createElement('small');
    smallElement.textContent = this.getRecoveryErrorHint(errorMessage);
    alertDiv.appendChild(smallElement);

    resultDiv.appendChild(alertDiv);
  }

  getRecoveryErrorHint(errorMessage) {
    if (/set identifier|same set/i.test(errorMessage)) {
      return t('errors.inconsistentShareSet');
    }
    if (/plain shares and GPG|plain share files and GPG/i.test(errorMessage)) {
      return errorMessage;
    }
    if (/invalid password|wrong password/i.test(errorMessage)) {
      return t('encryption.invalidPassword');
    }
    if (/password is required|required for decryption|mot de passe/i.test(errorMessage)) {
      return t('encryption.passwordRequired');
    }
    if (/no valid shard data found|no valid shares detected/i.test(errorMessage)) {
      return t('errors.noValidShares');
    }
    if (/invalid share format|invalid shard format|invalid share payload|invalid share data encoding/i.test(errorMessage)) {
      return t('errors.invalidShareFormat');
    }
    return t('errors.checkShareFormat');
  }

  /**
   * Update input status UI
   * @param {string} status
   * @param {string} message
   */
  updateStatus(status, message) {
    const statusDiv = getElement(SELECTORS.INPUT_STATUS);
    if (!statusDiv) return;

    // Reset all status classes
    statusDiv.className = 'input-status';

    // Add new one
    toggleClass(statusDiv, `input-${status}`, true);

    // Set message
    statusDiv.textContent = '';
    const statusText = document.createElement('span');
    statusText.className = 'status-text';
    statusText.textContent = message;
    statusDiv.appendChild(statusText);
  }

  /**
   * Show success alert
   * @param {string} message
   */
  showSuccess(message) {
    this.showAlert('success', message);
  }

  /**
   * Show error alert
   * @param {string} message
   */
  showError(message) {
    this.showAlert('error', message);
  }

  /**
   * Show info alert
   * @param {string} message
   */
  showInfo(message) {
    this.showAlert('info', message);
  }

  /**
   * Generic alert helper
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  showAlert(type, message) {
    // Hide all standard alerts
    this.hideAllAlerts();

    let alertElement;
    switch (type) {
      case 'success':
        alertElement = getElement(SELECTORS.SUCCESS_ALERT);
        break;
      case 'error':
        alertElement = getElement(SELECTORS.GENERAL_ERROR_ALERT);
        break;
      case 'info':
        // Create a temporary info alert
        alertElement = document.createElement('div');
        alertElement.className = 'alert alert-info';
        alertElement.style.display = 'none';
        const container = getElement('.main-content');
        if (container) {
          container.appendChild(alertElement);
        }
        break;
      default:
        alertElement = getElement(SELECTORS.GENERAL_ERROR_ALERT);
        break;
    }

    if (alertElement) {
      setText(alertElement, message);
      toggleElement(alertElement, true);

      // Auto-hide after 3s
      setTimeout(() => {
        toggleElement(alertElement, false);
        // Remove temporary info element
        if (type === 'info' && alertElement.parentNode) {
          alertElement.parentNode.removeChild(alertElement);
        }
      }, 3000);
    }
  }

  /**
   * Hide all built-in alerts
   */
  hideAllAlerts() {
    const alerts = [SELECTORS.INPUT_ERROR_ALERT, SELECTORS.DUPLICATE_ALERT, SELECTORS.GENERAL_ERROR_ALERT, SELECTORS.SUCCESS_ALERT];

    alerts.forEach((selector) => {
      const alert = getElement(selector);
      if (alert) {
        toggleElement(alert, false);
      }
    });
  }

  /**
   * Ask password via dialog
   * @param {boolean} isRetry
   * @returns {Promise<string>}
   */
  async getPasswordFromDialog(isRetry = false) {
    return await passwordDialog.show(isRetry);
  }

  /**
   * Reject recovery output that is not a valid 12/24-word BIP-39 phrase.
   * @param {string} mnemonic
   */
  assertRecoveredMnemonicIsValid(mnemonic) {
    const words = mnemonic
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const validation = validateMnemonic(words);
    if (!validation.isValid) {
      if (validation.hasChecksumError) {
        throw new Error(t('errors.invalidMnemonicChecksum'));
      }
      throw new Error(t('errors.invalidShareFormat'));
    }
  }

  getShortSetId(setId) {
    if (typeof setId !== 'string' || !setId.trim()) return 'N/A';
    const value = setId.trim();
    if (value.length <= 12) return value;
    return `${value.slice(0, 8)}...${value.slice(-4)}`;
  }

  getQrSecurityWarning() {
    return t('qr.securityWarning');
  }

  async buildQrPayload(shareContent) {
    if (this.isEncryptionEnabled) {
      const encryptionValidation = this.validateEncryptionSettings();
      if (!encryptionValidation.isValid) {
        throw new Error(encryptionValidation.error);
      }

      const encrypted = await encryptWithPassword(shareContent, this.encryptionPassword);
      this.clearEncryptionPassword();

      return {
        payload: wrapEncryptedShareForQr(encrypted),
        isEncryptedQr: true,
        recommendation: t('qr.recommendationEncrypted'),
      };
    }

    return {
      payload: wrapPlainShareForQr(shareContent),
      isEncryptedQr: false,
      recommendation: t('qr.recommendationPlain'),
    };
  }

  async showQrPrintView(shareContent, shareIndex) {
    const popup = window.open('', '_blank', 'width=900,height=980');
    if (!popup) {
      this.showError('QR/Print failed: Unable to open print view.');
      return;
    }

    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Loading QR</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Preparing QR / Print view...</body></html>`);
    popup.document.close();

    try {
      const meta = this.getShareMeta(shareContent);
      if (!meta) {
        throw new Error('Invalid share payload.');
      }

      const qrData = await this.buildQrPayload(shareContent);
      const qrDataUrl = await QRCode.toDataURL(qrData.payload, {
        errorCorrectionLevel: 'M',
        width: 320,
        margin: 1,
      });

      const warning = this.getQrSecurityWarning();
      const setId = this.getShortSetId(meta.setId);
      const safePayload = qrData.payload.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeWarning = warning.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const mode = qrData.isEncryptedQr ? t('qr.modeEncrypted') : t('qr.modePlain');

      popup.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GLOV Secure — Mnemonic Shards QR</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 18px; }
    .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; padding: 18px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    .mode { font-size: 13px; color: #444; margin-bottom: 10px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 14px; margin: 10px 0 12px; }
    .meta strong { font-weight: 700; }
    .qr { text-align: center; margin: 16px 0; }
    .payload { font-family: monospace; font-size: 12px; word-break: break-all; background: #f8f8f8; border: 1px solid #ececec; border-radius: 8px; padding: 10px; }
    .warn { margin-top: 14px; background: #fff4d6; border: 1px solid #f1d183; border-radius: 8px; padding: 10px; font-size: 13px; }
    .actions { margin-top: 16px; text-align: center; }
    button { padding: 9px 14px; border-radius: 8px; border: 1px solid #bbb; background: #fff; cursor: pointer; margin: 0 6px; }
    @media print { .actions { display: none; } body { margin: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <h1>GLOV Secure — Mnemonic Shards</h1>
    <div class="mode"><strong>${mode}</strong> — ${qrData.recommendation}</div>
    <div class="meta">
      <div><strong>Shard number:</strong> ${meta.index || shareIndex}</div>
      <div><strong>Total shards:</strong> ${meta.total || 'N/A'}</div>
      <div><strong>Threshold required:</strong> ${meta.threshold}</div>
      <div><strong>Set ID:</strong> ${setId}</div>
      <div><strong>Generation date:</strong> ${formatDateTime()}</div>
    </div>
    <div class="qr"><img src="${qrDataUrl}" alt="Shard QR code" /></div>
    <div class="payload">${safePayload}</div>
    <div class="warn"><strong>Security warning:</strong> ${safeWarning}</div>
    <div class="actions">
      <button onclick="window.print()">Print</button>
      <button onclick="window.close()">Close</button>
    </div>
  </div>
</body>
</html>`);
      popup.document.close();
    } catch (error) {
      this.showError(`QR/Print failed: ${error.message}`);
    } finally {
      this.clearEncryptionPassword();
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.currentShares = [];
    this.currentThreshold = 0;
    this.copiedShares.clear();
  }
}
