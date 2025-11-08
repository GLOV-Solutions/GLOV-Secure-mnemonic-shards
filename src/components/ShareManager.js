/**
 * Share Manager
 * Handles shard generation, display, copy, download, and recovery.
 */

import { split, combine } from 'shamir-secret-sharing';
import { getElement, createElement, toggleElement, toggleClass, setHTML, clearElement, addEvent } from '../utils/dom.js';
import { copyToClipboard, downloadFile, formatDateTime } from '../utils/helpers.js';
import { validateMnemonic, validateShareCollection } from '../utils/validation.js';
import { SELECTORS, CSS_CLASSES, ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES, FILE_TEMPLATES } from '../constants/index.js';
import { t } from '../utils/i18n.js';
import { encryptWithPassword, decryptWithPassword, validatePasswordStrength, validatePasswordMatch } from '../utils/encryption.js';
import { passwordDialog } from './PasswordDialog.js';

export class ShareManager {
  constructor() {
    this.currentShares = [];
    this.currentThreshold = 0;
    this.copiedShares = new Set();          // track copied shares by index
    this.isEncryptionEnabled = false;       // toggle encryption-on-download
    this.encryptionPassword = '';           // password used for on-the-fly encryption
    this.encryptedShares = [];              // reserved; not used with streaming download
  }

  /** Initialize encryption-related listeners (UI) */
  initEncryptionListeners() {
    const enableEncryptionCheckbox = getElement(SELECTORS.ENABLE_ENCRYPTION);
    const encryptionFields = getElement(SELECTORS.ENCRYPTION_FIELDS);
    const encryptionPassword = getElement(SELECTORS.ENCRYPTION_PASSWORD);
    const confirmPassword = getElement(SELECTORS.CONFIRM_PASSWORD);
    const passwordStrength = getElement(SELECTORS.PASSWORD_STRENGTH);
    const passwordMatch = getElement(SELECTORS.PASSWORD_MATCH);

    if (!enableEncryptionCheckbox || !encryptionFields) return;

    // Toggle encryption options
    addEvent(enableEncryptionCheckbox, 'change', () => {
      this.isEncryptionEnabled = enableEncryptionCheckbox.checked;
      toggleElement(encryptionFields, this.isEncryptionEnabled);

      // Clear password fields when disabling encryption
      if (!this.isEncryptionEnabled) {
        if (encryptionPassword) encryptionPassword.value = '';
        if (confirmPassword) confirmPassword.value = '';
        if (passwordStrength) passwordStrength.textContent = '';
        if (passwordMatch) passwordMatch.textContent = '';
        this.encryptionPassword = '';
      }
    });

    // Password strength
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
        this.checkPasswordMatch();
      });
    }

    // Confirm password check
    if (confirmPassword && passwordMatch) {
      addEvent(confirmPassword, 'input', () => {
        this.checkPasswordMatch();
      });
    }
  }

  /** Validate confirmation password inline UI */
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
   * Validate encryption configuration from the UI (when enabled)
   * @returns {{isValid: boolean, error?: string}}
   */
  validateEncryptionSettings() {
    if (!this.isEncryptionEnabled) return { isValid: true };

    const encryptionPassword = getElement(SELECTORS.ENCRYPTION_PASSWORD);
    const confirmPassword = getElement(SELECTORS.CONFIRM_PASSWORD);

    if (!encryptionPassword || !confirmPassword) {
      return { isValid: false, error: 'Encryption fields are missing. Please refresh and try again.' };
    }

    const password = encryptionPassword.value;
    const confirm = confirmPassword.value;

    const strengthValidation = validatePasswordStrength(password);
    if (strengthValidation.strength === 'weak') {
      return { isValid: false, error: 'Password too weak. Use at least 8 characters with letters, numbers and symbols.' };
    }

    const matchValidation = validatePasswordMatch(password, confirm);
    if (!matchValidation.isValid) {
      return { isValid: false, error: 'Passwords do not match.' };
    }

    this.encryptionPassword = password;
    return { isValid: true };
  }

  /** Clear encryption password (safety) */
  clearEncryptionPassword() { this.encryptionPassword = ''; }
  clearUploadEncryptionPassword() { this.uploadEncryptionPassword = ''; }

  /**
   * Generate Shamir shares
   * @param {string[]} words - mnemonic words
   * @param {number} totalShares
   * @param {number} threshold
   * @returns {Promise<boolean>}
   */
  async generateShares(words, totalShares, threshold) {
    try {
      // ✅ FIX: validate against a STRING, not an array
      const mnemonic = words.join(' ');
      const validation = validateMnemonic(mnemonic);
      if (!validation.isValid) {
        this.showError(validation.errors[0]);
        return false;
      }

      const encryptionValidation = this.validateEncryptionSettings();
      if (!encryptionValidation.isValid) {
        this.showError(encryptionValidation.error);
        return false;
      }

      // Split the mnemonic as string (fallback to bytes if needed)
      let rawShares;
      try {
        rawShares = await split(mnemonic, totalShares, threshold);
      } catch (_) {
        const secretBytes = new TextEncoder().encode(mnemonic);
        rawShares = await split(secretBytes, totalShares, threshold);
      }

      // Store Base64-encoded envelope (index/threshold/total + data)
      this.currentShares = rawShares.map((share, index) => {
        let dataB64;
        if (typeof share === 'string') {
          dataB64 = btoa(share);
        } else if (share instanceof Uint8Array) {
          dataB64 = btoa(String.fromCharCode(...share));
        } else {
          dataB64 = btoa(String(share));
        }
        const shareData = {
          index: index + 1,
          threshold,
          total: totalShares,
          data: dataB64,
        };
        return btoa(JSON.stringify(shareData));
      });

      this.currentThreshold = threshold;
      this.encryptedShares = [];
      this.copiedShares.clear();

      this.displayShares();
      this.showSuccess(SUCCESS_MESSAGES.SHARES_GENERATED);
      return true;
    } catch (error) {
      this.showError(`${t('errors.generateFailed')}: ${error?.message || String(error)}`);
      return false;
    }
  }

  /** Render current shares to the UI */
  displayShares() {
    const resultDiv = getElement(SELECTORS.SHARES_RESULT);
    const sharesList = getElement(SELECTORS.SHARES_LIST);
    const thresholdDisplay = getElement(SELECTORS.THRESHOLD_DISPLAY);

    if (!resultDiv || !sharesList || !thresholdDisplay) return;

    thresholdDisplay.textContent = this.currentThreshold;
    clearElement(sharesList);

    this.currentShares.forEach((share, index) => {
      const item = this.createShareItem(share, index + 1);
      sharesList.appendChild(item);
    });

    toggleElement(resultDiv, true);
  }

  /** Create a share item block */
  createShareItem(share, index) {
    const shareItem = createElement('div', ['share-item']);

    const header = createElement('div', ['share-header']);

    const title = createElement('div', ['share-title']);
    title.textContent = t('share', index);

    const buttons = createElement('div', ['share-buttons']);

    const copyBtn = createElement('button', ['copy-btn']);
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

    buttons.appendChild(copyBtn);
    buttons.appendChild(downloadBtn);

    header.appendChild(title);
    header.appendChild(buttons);

    const content = createElement('div', ['share-content']);
    content.textContent = share;

    shareItem.appendChild(header);
    shareItem.appendChild(content);

    return shareItem;
  }

  /** Copy a single share */
  async copyShare(button, shareContent, shareIndex) {
    const success = await copyToClipboard(shareContent);
    if (success) {
      this.copiedShares.add(shareIndex);
      button.textContent = t('success.copySuccess');
      toggleClass(button, CSS_CLASSES.COPIED, true);
    } else {
      this.showError(t('errors.copyFailed'));
    }
  }

  /** Download a share (optionally encrypt on the fly) */
  async downloadShare(shareContent, shareIndex) {
    try {
      const enc = this.validateEncryptionSettings();

      if (this.isEncryptionEnabled && !enc.isValid) {
        this.showError(enc.error);
        return;
      }

      if (this.isEncryptionEnabled && enc.isValid) {
        await this.downloadEncryptedShare(shareContent, shareIndex);
      } else {
        this.downloadStandardShare(shareContent, shareIndex);
      }
    } catch (error) {
      this.showError(t('errors.downloadFailed') + ': ' + error.message);
    }
  }

  /** Download encrypted (.txt.gpg) */
  async downloadEncryptedShare(shareContent, shareIndex) {
    try {
      this.showInfo(t('encryption.encryptingShare', shareIndex));

      const encryptedContent = await encryptWithPassword(shareContent, this.encryptionPassword);
      this.clearEncryptionPassword();

      const filename = `${t('shareFilePrefix')}${shareIndex}.txt.gpg`;
      const ok = downloadFile(encryptedContent, filename);
      if (ok) this.showSuccess(t('success.encryptedShareDownloaded', shareIndex));
      else this.showError(t('errors.downloadFailed'));
    } catch (error) {
      this.clearEncryptionPassword();
      throw new Error(t('encryption.encryptionFailed') + ': ' + error.message);
    }
  }

  /** Download plain text share (.txt) with header/tips */
  downloadStandardShare(shareContent, shareIndex) {
    const filename = `${t('shareFilePrefix')}${shareIndex}.txt`;
    const fileData = FILE_TEMPLATES.SHARE_CONTENT(shareIndex, shareContent);
    const fileContent = this.formatShareFileContent(fileData);

    const ok = downloadFile(fileContent, filename);
    if (ok) this.showSuccess(t('success.shareDownloaded', shareIndex));
    else this.showError(t('errors.downloadFailed'));
  }

  /** Build the .txt body with app info and safety tips */
  formatShareFileContent(fileData) {
    let content = `${t('fileTemplate.appName')} ${t('share', fileData.index)}\n${'='.repeat(50)}\n\n`;
    content += `${t('fileTemplate.shareContent')}:\n${fileData.content}\n\n${'='.repeat(50)}\n${t('fileTemplate.generatedTime')}: ${fileData.timestamp}\n\n${t(
      'fileTemplate.securityTips',
    )}:\n- ${t('fileTemplate.tip1')}\n- ${t('fileTemplate.tip2')}\n- ${t('fileTemplate.tip3')}`;
    return content;
  }

  /** Live validation of pasted shares (classic flow) */
  validateShareInput() {
    const input = getElement(SELECTORS.RECOVER_INPUT);
    const statusDiv = getElement(SELECTORS.INPUT_STATUS);
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);

    if (!input || !statusDiv || !recoverBtn) return;

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

    const validation = validateShareCollection(shareStrings);

    if (!validation.isValid) {
      const hasDuplicate =
        (validation.errors && validation.errors.some((e) =>
          String(e).toLowerCase().includes('duplicate')
          || String(e).includes('重复')
        )) || validation.duplicateIndexDetected;

      if (validation.validCount === 0) {
        this.updateStatus('invalid', t('errors.invalidShareFormat'));
      } else if (hasDuplicate) {
        this.updateStatus('invalid', t('errors.duplicateShares'));
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
   * Recover mnemonic from pasted or uploaded shares (classic Shamir flow)
   * @returns {Promise<boolean>}
   */
  async recoverMnemonic() {
    const input = getElement(SELECTORS.RECOVER_INPUT);
    const resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);

    if (!input || !resultDiv || !recoverBtn) return false;

    const inputText = input.value.trim();
    if (!inputText) {
      this.showError(ERROR_MESSAGES.EMPTY_WORDS);
      return false;
    }

    recoverBtn.disabled = true;
    recoverBtn.textContent = t('info.recovering');

    try {
      const shareStrings = inputText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Parse standard envelope; if not parseable, treat as encrypted (PGP)
      let maybeEncrypted = false;
      const validShareData = [];

      for (const shareStr of shareStrings) {
        try {
          const obj = JSON.parse(atob(shareStr));
          if (obj.threshold && obj.index && obj.data) validShareData.push(obj);
        } catch {
          if (shareStr.startsWith('-----BEGIN PGP MESSAGE-----')) {
            maybeEncrypted = true;
            validShareData.push({ encrypted: true, content: shareStr });
          } else {
            maybeEncrypted = true;
          }
        }
      }

      if (validShareData.length === 0 && maybeEncrypted) {
        let password = '';
        let isRetry = false;

        try {
          password = await this.getPasswordFromDialog(isRetry);
        } catch {
          throw new Error(t('encryption.passwordRequired'));
        }

        this.showInfo(t('encryption.decryptingShares'));

        for (const shareStr of shareStrings) {
          try {
            const decrypted = await decryptWithPassword(shareStr, password);
            const obj = JSON.parse(atob(decrypted));
            if (obj.threshold && obj.index && obj.data) validShareData.push(obj);
          } catch (e) {
            const msg = String(e?.message || e).toLowerCase();
            const wrongPwd = msg.includes('password') && (msg.includes('wrong') || msg.includes('incorrect')) || msg.includes('密码');
            if (wrongPwd) {
              isRetry = true;
              try {
                password = await this.getPasswordFromDialog(isRetry);
                const decrypted2 = await decryptWithPassword(shareStr, password);
                const obj2 = JSON.parse(atob(decrypted2));
                if (obj2.threshold && obj2.index && obj2.data) validShareData.push(obj2);
              } catch (retryError) {
                const rmsg = String(retryError?.message || retryError).toLowerCase();
                if (rmsg.includes('password') && (rmsg.includes('wrong') || rmsg.includes('incorrect')) || rmsg.includes('密码')) {
                  throw new Error(t('encryption.invalidPassword'));
                }
              }
            }
          }
        }

        if (validShareData.length === 0) {
          throw new Error(t('encryption.decryptionFailed') + t('errors.noValidShares'));
        }
      }

      if (validShareData.length === 0) {
        throw new Error(t('errors.noValidShares'));
      }

      const threshold = validShareData[0].threshold;
      if (validShareData.length < threshold) {
        throw new Error(t('errors.insufficientShares', threshold, validShareData.length));
      }

      // Prefer passing string shares; fallback to bytes if needed
      const sharePayloadStrings = validShareData.slice(0, threshold).map((data) => atob(data.data));
      let combined;
      try {
        combined = await combine(sharePayloadStrings);
      } catch (_) {
        const shareBytes = sharePayloadStrings.map((bin) => {
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return bytes;
        });
        combined = await combine(shareBytes);
      }
      const recoveredMnemonic = combined instanceof Uint8Array
        ? new TextDecoder().decode(combined)
        : String(combined);

      this.displayRecoverResult(recoveredMnemonic, validShareData.length, threshold);
      return true;
    } catch (error) {
      this.displayRecoverError(error.message);
      return false;
    } finally {
      recoverBtn.disabled = false;
      recoverBtn.textContent = t('recoverBtn');
      this.clearUploadEncryptionPassword();
    }
  }

  /**
   * Recover from programmatic shares array (classic Shamir path)
   */
  async recoverMnemonicWithShares(shares, encryptionPassword) {
    const resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
    if (!resultDiv || !recoverBtn) return false;

    if (!shares || shares.length === 0) {
      this.showError(ERROR_MESSAGES.EMPTY_WORDS);
      return false;
    }

    recoverBtn.disabled = true;
    recoverBtn.textContent = t('info.recovering');

    try {
      let maybeEncrypted = false;
      const validShareData = [];

      for (const share of shares) {
        if (share?.encrypted) {
          maybeEncrypted = true;
          validShareData.push(share);
          continue;
        }

        try {
          if (typeof share === 'string') {
            if (share.startsWith('-----BEGIN PGP MESSAGE-----')) {
              maybeEncrypted = true;
              validShareData.push({ encrypted: true, content: share });
              continue;
            }
            const obj = JSON.parse(atob(share));
            if (obj.threshold && obj.index && obj.data) validShareData.push(obj);
          } else if (share.threshold && share.index && share.data) {
            validShareData.push(share);
          }
        } catch {
          maybeEncrypted = true;
          validShareData.push({ encrypted: true, content: share });
        }
      }

      if (maybeEncrypted) {
        let password = '';
        let isRetry = false;

        try {
          password = await this.getPasswordFromDialog(isRetry);
        } catch {
          throw new Error(t('encryption.passwordRequired'));
        }

        this.showInfo(t('encryption.decryptingShares'));

        const encryptedShares = validShareData.filter((s) => s.encrypted);
        const decryptedShares = [];

        for (const encShare of encryptedShares) {
          try {
            const decrypted = await decryptWithPassword(encShare.content, password);
            const obj = JSON.parse(atob(decrypted));
            if (obj.threshold && obj.index && obj.data) decryptedShares.push(obj);
          } catch (e) {
            const msg = String(e?.message || e).toLowerCase();
            const wrongPwd = msg.includes('password') && (msg.includes('wrong') || msg.includes('incorrect')) || msg.includes('密码');
            if (wrongPwd) {
              isRetry = true;
              try {
                password = await this.getPasswordFromDialog(isRetry);
                const decrypted2 = await decryptWithPassword(encShare.content, password);
                const obj2 = JSON.parse(atob(decrypted2));
                if (obj2.threshold && obj2.index && obj2.data) decryptedShares.push(obj2);
              } catch (retryError) {
                const rmsg = String(retryError?.message || retryError).toLowerCase();
                if (rmsg.includes('password') && (rmsg.includes('wrong') || rmsg.includes('incorrect')) || rmsg.includes('密码')) {
                  throw new Error(t('encryption.invalidPassword'));
                }
              }
            }
          }
        }

        const finalShares = validShareData.filter((s) => !s.encrypted).concat(decryptedShares);

        if (finalShares.length === 0) {
          throw new Error(t('encryption.decryptionFailed') + t('errors.noValidShares'));
        }

        const threshold = finalShares[0].threshold;
        if (finalShares.length < threshold) {
          throw new Error(t('errors.insufficientShares', threshold, finalShares.length));
        }

        // Try string shares first, then bytes
        const shareStrings = finalShares.slice(0, threshold).map((data) => atob(data.data));
        let combined;
        try {
          combined = await combine(shareStrings);
        } catch (_) {
          const shareBytes = shareStrings.map((bin) => {
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return bytes;
          });
          combined = await combine(shareBytes);
        }
        const mnemonic = combined instanceof Uint8Array ? new TextDecoder().decode(combined) : String(combined);

        this.displayRecoverResult(mnemonic, finalShares.length, threshold);
        return true;
      }

      if (validShareData.length === 0) throw new Error(t('errors.noValidShares'));

      const threshold = validShareData[0].threshold;
      if (validShareData.length < threshold) {
        throw new Error(t('errors.insufficientShares', threshold, validShareData.length));
      }

      const shareStrings2 = validShareData.slice(0, threshold).map((data) => atob(data.data));
      let combined2;
      try {
        combined2 = await combine(shareStrings2);
      } catch (_) {
        const shareBytes2 = shareStrings2.map((bin) => {
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return bytes;
        });
        combined2 = await combine(shareBytes2);
      }
      const recoveredMnemonic = combined2 instanceof Uint8Array ? new TextDecoder().decode(combined2) : String(combined2);

      this.displayRecoverResult(recoveredMnemonic, validShareData.length, threshold);
      return true;
    } catch (error) {
      this.displayRecoverError(error.message);
      return false;
    } finally {
      recoverBtn.disabled = false;
      recoverBtn.textContent = t('recoverBtn');
      this.clearUploadEncryptionPassword();
    }
  }

  /** Render recovery success block */
  displayRecoverResult(mnemonic, usedShares, threshold) {
    const activeTabBtn = getElement('.tab-btn.active');
    let resultDiv;

    if (activeTabBtn && activeTabBtn.id === 'pasteTabBtn') {
      resultDiv = getElement(SELECTORS.PASTE_RECOVER_RESULT);
    } else if (activeTabBtn && activeTabBtn.id === 'uploadTabBtn') {
      resultDiv = getElement(SELECTORS.UPLOAD_RECOVER_RESULT);
    } else {
      resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    }

    if (!resultDiv) return;

    const words = mnemonic
      .split(' ')
      .map((w) => `<span class="word">${w}</span>`)
      .join(' ');

    const html = `
      <div class="alert alert-success">
        <strong>${t('success.recoverySuccess')}</strong><br>
        <strong>${t('mnemonic')}:</strong><br>
        <span class="recovered-mnemonic">${words}</span><br>
        <strong>${t('sharesUsed')}:</strong>${usedShares} ${t('shares')} (${t('need')} ${threshold} ${t('shares')})<br>
        <strong>${t('recoveryTime')}:</strong>${formatDateTime()}
      </div>
    `;
    setHTML(resultDiv, html);
  }

  /** Render recovery error */
  displayRecoverError(errorMessage) {
    const activeTabBtn = getElement('.tab-btn.active');
    let resultDiv;

    if (activeTabBtn && activeTabBtn.id === 'pasteTabBtn') {
      resultDiv = getElement(SELECTORS.PASTE_RECOVER_RESULT);
    } else if (activeTabBtn && activeTabBtn.id === 'uploadTabBtn') {
      resultDiv = getElement(SELECTORS.UPLOAD_RECOVER_RESULT);
    } else {
      resultDiv = getElement(SELECTORS.RECOVER_RESULT);
    }

    if (!resultDiv) return;

    resultDiv.innerHTML = '';

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-error';

    const strong = document.createElement('strong');
    strong.textContent = t('errors.recoveryFailed');
    alertDiv.appendChild(strong);

    const span = document.createElement('span');
    span.textContent = errorMessage;
    alertDiv.appendChild(span);

    alertDiv.appendChild(document.createElement('br'));

    const small = document.createElement('small');
    small.textContent = t('errors.checkShareFormat');
    alertDiv.appendChild(small);

    resultDiv.appendChild(alertDiv);
  }

  /** Update inline status box */
  updateStatus(status, message) {
    const statusDiv = getElement(SELECTORS.INPUT_STATUS);
    if (!statusDiv) return;

    statusDiv.className = 'input-status';
    toggleClass(statusDiv, `input-${status}`, true);
    statusDiv.innerHTML = `<span class="status-text">${message}</span>`;
  }

  showSuccess(message) { this.showAlert('success', message); }
  showError(message) { this.showAlert('error', message); }
  showInfo(message) { this.showAlert('info', message); }

  /** Generic alert renderer (auto-hide) */
  showAlert(type, message) {
    this.hideAllAlerts();

    let el;
    switch (type) {
      case 'success': el = getElement(SELECTORS.SUCCESS_ALERT); break;
      case 'error': el = getElement(SELECTORS.GENERAL_ERROR_ALERT); break;
      case 'info':
        el = document.createElement('div');
        el.className = 'alert alert-info';
        el.style.display = 'none';
        const container = getElement('.main-content');
        if (container) container.appendChild(el);
        break;
      default: el = getElement(SELECTORS.GENERAL_ERROR_ALERT); break;
    }

    if (el) {
      setHTML(el, message);
      toggleElement(el, true);
      setTimeout(() => {
        toggleElement(el, false);
        if (type === 'info' && el.parentNode) el.parentNode.removeChild(el);
      }, 3000);
    }
  }

  /** Hide all fixed alerts */
  hideAllAlerts() {
    const alerts = [SELECTORS.INPUT_ERROR_ALERT, SELECTORS.DUPLICATE_ALERT, SELECTORS.GENERAL_ERROR_ALERT, SELECTORS.SUCCESS_ALERT];
    alerts.forEach((selector) => {
      const a = getElement(selector);
      if (a) toggleElement(a, false);
    });
  }

  /** Ask password with modal dialog */
  async getPasswordFromDialog(isRetry = false) {
    return await passwordDialog.show(isRetry);
  }

  /** Cleanup */
  destroy() {
    this.currentShares = [];
    this.currentThreshold = 0;
    this.copiedShares.clear();
  }
}
