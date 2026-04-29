/**
 * Recovery Tab Manager
 * Handles tab switching, file uploads, and share parsing for recovery
 */

import { getElement, createElement, toggleElement, toggleClass, setHTML, clearElement, addEvent } from '../utils/dom.js';
import { validateShareCollection } from '../utils/validation.js';
import { decryptWithPassword, detectGpgFormat } from '../utils/encryption.js';
import { t } from '../utils/i18n.js';
import { passwordDialog } from './PasswordDialog.js';
import {
  detectShareFormat,
  detectShareCollectionFormat,
  getDetectedFormatLabel,
  SHARE_FORMAT,
} from '../formats/formatDetector.js';

function canUseWebCrypto() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    typeof globalThis !== 'undefined' &&
    !!globalThis.crypto &&
    !!globalThis.crypto.subtle
  );
}

export class RecoveryTabManager {
  constructor() {
    this.activeTab = 'paste'; // 'paste' | 'upload'
    this.uploadedFiles = [];
    this.parsedShares = [];
    this.isEncryptionEnabled = false;
    this.encryptionPassword = '';
    this.currentThreshold = 0;
    this.validShareCount = 0;
    this.pendingFiles = []; // files waiting to be processed
    this.hasEncryptedFiles = false; // whether there are encrypted files
    this.uploadPassword = ''; // decryption password for uploaded files
    this.passwordVisible = false; // whether password field is visible
    this.currentDetectedFormat = SHARE_FORMAT.UNKNOWN;

    // NEW: cache capability
    this.webCryptoAvailable = canUseWebCrypto();

    this.init();
  }

  /**
   * Initialize module
   */
  init() {
    this.setupTabSwitching();
    this.setupFileUpload();
    this.setupDragAndDrop();
    this.setupEncryptionPassword();

    // NEW: If WebCrypto is not available, make sure password UI is hidden
    if (!this.webCryptoAvailable) {
      this.togglePasswordSection(false);
    }
  }

  /**
   * Set up tab switching
   */
  setupTabSwitching() {
    const pasteTabBtn = getElement('#pasteTabBtn');
    const uploadTabBtn = getElement('#uploadTabBtn');
    const pasteTab = getElement('#pasteTab');
    const uploadTab = getElement('#uploadTab');

    if (!pasteTabBtn || !uploadTabBtn || !pasteTab || !uploadTab) return;

    addEvent(pasteTabBtn, 'click', () => this.switchTab('paste'));
    addEvent(uploadTabBtn, 'click', () => this.switchTab('upload'));
  }

  /**
   * Switch tab
   * @param {string} tabType - 'paste' | 'upload'
   */
  switchTab(tabType) {
    if (this.activeTab === tabType) return;

    const pasteTabBtn = getElement('#pasteTabBtn');
    const uploadTabBtn = getElement('#uploadTabBtn');
    const pasteTab = getElement('#pasteTab');
    const uploadTab = getElement('#uploadTab');

    toggleClass(pasteTabBtn, 'active', tabType === 'paste');
    toggleClass(uploadTabBtn, 'active', tabType === 'upload');

    toggleClass(pasteTab, 'active', tabType === 'paste');
    toggleClass(uploadTab, 'active', tabType === 'upload');

    if (this.activeTab === 'paste') {
      const pasteResultDiv = getElement('#pasteRecoverResult');
      if (pasteResultDiv) setHTML(pasteResultDiv, '');
    } else if (this.activeTab === 'upload') {
      const uploadResultDiv = getElement('#uploadRecoverResult');
      if (uploadResultDiv) setHTML(uploadResultDiv, '');
    }

    this.activeTab = tabType;

    // Re-validate after switching
    this.validateCurrentTab();
  }

  /**
   * Set up file upload buttons/inputs
   */
  setupFileUpload() {
    const selectFilesBtn = getElement('#selectFilesBtn');
    const fileInput = getElement('#fileInput');
    const clearFilesBtn = getElement('#clearFilesBtn');

    if (!selectFilesBtn || !fileInput) return;

    addEvent(selectFilesBtn, 'click', () => fileInput.click());

    addEvent(fileInput, 'change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    if (clearFilesBtn) {
      addEvent(clearFilesBtn, 'click', () => this.clearAllFiles());
    }
  }

  /**
   * Set up drag-and-drop upload
   */
  setupDragAndDrop() {
    const uploadArea = getElement('#uploadArea');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      addEvent(uploadArea, eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      addEvent(uploadArea, eventName, () => {
        toggleClass(uploadArea, 'drag-over', true);
      });
    });

    addEvent(uploadArea, 'dragleave', () => {
      toggleClass(uploadArea, 'drag-over', false);
    });

    addEvent(uploadArea, 'drop', (e) => {
      toggleClass(uploadArea, 'drag-over', false);
      this.handleFileSelect(e.dataTransfer.files);
    });
  }

  /**
   * Handle selected/dropped files
   * @param {FileList} files
   */
  async handleFileSelect(files) {
    if (!files || files.length === 0) return;

    // Validate file types and sizes
    const validFiles = this.validateFiles(files);
    if (validFiles.length === 0) return;

    const incomingEncrypted = validFiles.some((file) => file.name.endsWith('.gpg'));
    const incomingPlain = validFiles.some((file) => !file.name.endsWith('.gpg'));
    const existingEncrypted = this.uploadedFiles.some((file) => file.isEncrypted === true);
    const existingPlain = this.uploadedFiles.some((file) => file.isEncrypted === false);

    if (
      (incomingEncrypted && incomingPlain) ||
      (incomingEncrypted && existingPlain) ||
      (incomingPlain && existingEncrypted)
    ) {
      this.showError(t('errors.mixedUploadedShareFormats'));
      this.validateCurrentShares();
      return;
    }

    // Check if any are encrypted
    this.hasEncryptedFiles = validFiles.some((file) => file.name.endsWith('.gpg'));

    // NEW: If .gpg files exist but WebCrypto is not available, block them now.
    if (this.hasEncryptedFiles && !this.webCryptoAvailable) {
      // Filter out gpg files so txt can still work
      const nonEncrypted = validFiles.filter((f) => !f.name.endsWith('.gpg'));
      const blockedCount = validFiles.length - nonEncrypted.length;

      if (blockedCount > 0) {
        this.showError(
          t('encryption.requiresHttps') ||
            'Encrypted (.gpg) files are disabled on HTTP. Use HTTPS (secure context) to enable decryption.'
        );
      }

      // Process only non-encrypted files (if any)
      if (nonEncrypted.length === 0) {
        // Ensure password UI stays hidden
        this.togglePasswordSection(false);
        this.updateFilesList();
        this.validateCurrentShares();
        return;
      }

      await this.processFiles(nonEncrypted);
      // Ensure password UI stays hidden
      this.togglePasswordSection(false);
      return;
    }

    // Process files
    await this.processFiles(validFiles);

    // If encrypted files exist, reveal password section
    if (this.hasEncryptedFiles) {
      this.togglePasswordSection(true, true);
    }
  }

  /**
   * Process list of files
   * @param {Array<File>} files
   */
  async processFiles(files) {
    for (const file of files) {
      await this.processFile(file);
    }

    this.updateFilesList();
    this.validateCurrentShares();
  }

  /**
   * Validate files (type/size/duplication)
   * @param {FileList} files
   * @returns {Array<File>}
   */
  validateFiles(files) {
    const validFiles = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validExtensions = ['.txt', '.gpg'];

    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        this.showError(t('errors.fileTypeNotSupported', file.name));
        continue;
      }

      // NEW: block .gpg immediately if WebCrypto isn't available
      if (fileExtension === '.gpg' && !this.webCryptoAvailable) {
        this.showError(
          t('encryption.requiresHttps') ||
            'Encrypted (.gpg) files are disabled on HTTP. Use HTTPS (secure context) to enable decryption.'
        );
        continue;
      }

      if (file.size > maxSize) {
        this.showError(t('errors.fileTooLarge', file.name));
        continue;
      }

      if (this.uploadedFiles.some((f) => f.name === file.name)) {
        this.showError(t('errors.duplicateFile', file.name));
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  /**
   * Process a single file
   * @param {File} file
   */
  async processFile(file) {
    try {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        content: '',
        status: 'processing',
        shareData: null,
        isEncrypted: file.name.endsWith('.gpg'),
        decryptedContent: null,
        contentFormat: 'text', // 'text' or 'binary'
      };

      this.uploadedFiles.push(fileData);

      const content = await this.readFileContent(file);
      fileData.content = content;

      if (fileData.isEncrypted) {
        fileData.contentFormat = (content instanceof ArrayBuffer) ? 'binary' : 'text';
        fileData.status = 'encrypted';
      } else {
        if (typeof content !== 'string') {
          fileData.status = 'invalid';
          return;
        }
        fileData.contentFormat = 'text';

        const shareData = this.parseShareContent(content);
        if (shareData) {
          fileData.shareData = shareData;
          fileData.status = 'valid';
        } else {
          fileData.status = 'invalid';
        }
      }
    } catch (error) {
      const fileIndex = this.uploadedFiles.findIndex((f) => f.name === file.name);
      if (fileIndex !== -1) {
        this.uploadedFiles[fileIndex].status = 'invalid';
      }
    }
  }

  async getPasswordFromDialog(isRetry = false) {
    return await passwordDialog.show(isRetry);
  }

  /**
   * Retry decryption for encrypted files with supplied password
   * @param {Array<Object>} encryptedFiles
   * @param {string} password
   */
  async retryDecryption(encryptedFiles, password) {
    // NEW: hard stop if no WebCrypto
    if (!this.webCryptoAvailable) {
      this.showError(
        t('encryption.requiresHttps') ||
          'Decryption is disabled on HTTP. Use HTTPS (secure context) to enable it.'
      );
      return;
    }

    let decryptionSuccess = false;

    for (const file of encryptedFiles) {
      try {
        const decryptedContent = await decryptWithPassword(file.content, password);
        file.decryptedContent = decryptedContent;

        const shareData = this.parseShareContent(decryptedContent);
        if (shareData) {
          file.shareData = shareData;
          file.status = 'valid';
          decryptionSuccess = true;
        } else {
          file.status = 'invalid';
        }
      } catch (error) {
        file.status = 'invalid';
        if (/invalid password|wrong password/i.test(error.message)) {
          // ignore, keep going
        } else if (/invalid format|malformed/i.test(error.message)) {
          console.warn(`File ${file.name} has invalid format:`, error.message);
        } else {
          console.warn(`File ${file.name} decryption failed:`, error.message);
        }
      }

      this.updateFilesList();
      this.validateCurrentShares();
    }

    if (!decryptionSuccess) {
      this.showError(t('encryption.invalidPassword') || 'Invalid password or unsupported file format.');
    }
  }

  /**
   * Validate current share state (uploaded files)
   */
  validateCurrentShares() {
    const statusDiv = getElement('#uploadStatus');
    const recoverBtn = getElement('#recoverBtn');

    if (!statusDiv || !recoverBtn) return;

    // NEW: if webcrypto not available, force-hide password section
    if (!this.webCryptoAvailable) {
      this.togglePasswordSection(false);
    }

    const allShares = this.uploadedFiles
      .filter((file) => file.status === 'valid' && file.shareData && typeof file.shareData.rawShare === 'string')
      .map((file) => file.shareData.rawShare);

    const encryptedFiles = this.uploadedFiles.filter((file) => file.status === 'encrypted');
    const hasEncryptedUploads = this.uploadedFiles.some((file) => file.isEncrypted === true);
    const hasPlainUploads = this.uploadedFiles.some((file) => file.isEncrypted === false);

    if (hasEncryptedUploads && hasPlainUploads) {
      this.updateStatus('invalid', t('errors.mixedUploadedShareFormats'), statusDiv);
      recoverBtn.disabled = true;
      this.togglePasswordSection(false);
      this.clearDetectedFormatBadge();
      return;
    }

    // NEW: if encrypted files exist but no WebCrypto, mark them invalid (defensive)
    if (encryptedFiles.length > 0 && !this.webCryptoAvailable) {
      encryptedFiles.forEach((f) => {
        f.status = 'invalid';
      });
    }

    const encryptedStillThere = this.uploadedFiles.some((f) => f.status === 'encrypted');

    if (allShares.length === 0 && !encryptedStillThere) {
      this.updateStatus('invalid', t('errors.noValidShares'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    if (allShares.length === 0 && encryptedStillThere) {
      this.updateStatus('waiting', t('encryption.passwordRequired'), statusDiv);
      recoverBtn.disabled = false;
      this.updateDetectedFormatBadge(SHARE_FORMAT.GLOV_SECURE_ENCRYPTED);
      return;
    }

    const detected = detectShareCollectionFormat(allShares);

    if (detected.hasIncompatibleSlip39Sets) {
      this.updateStatus('invalid', t('errors.incompatibleSlip39Sets'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    if (detected.isMixed) {
      this.updateStatus('invalid', t('errors.mixedGlovAndSlip39'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    if (detected.format === SHARE_FORMAT.SLIP39) {
      this.updateStatus(
        'valid',
        `Detected ${allShares.length} SLIP-39 share(s). Recovery can start when threshold is met.`,
        statusDiv,
      );
      recoverBtn.disabled = false;
      this.validShareCount = allShares.length;
      this.currentThreshold = 0;
      this.updateDetectedFormatBadge(SHARE_FORMAT.SLIP39);
      return;
    }

    if (detected.format === SHARE_FORMAT.GLOV_SECURE) {
      const validation = validateShareCollection(allShares);
      this.processValidationResult(validation, statusDiv, recoverBtn);
      this.updateDetectedFormatBadge(SHARE_FORMAT.GLOV_SECURE);
      return;
    }

    this.updateStatus('invalid', t('errors.invalidShareFormat'), statusDiv);
    recoverBtn.disabled = true;
    this.clearDetectedFormatBadge();
  }

  async readFileContent(file) {
    if (file.name.endsWith('.gpg')) {
      return this.readGpgFile(file);
    } else {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }
  }

  async readGpgFile(file) {
    try {
      const binaryResult = await this.readAsArrayBuffer(file);
      const format = detectGpgFormat(binaryResult);

      if (format.type === 'binary-packet' || format.type === 'binary') {
        return binaryResult;
      }

      if (format.type === 'ascii-armor') {
        try {
          const textContent = new TextDecoder('utf-8', { fatal: false }).decode(binaryResult);
          return textContent;
        } catch (_decodeError) {
          return binaryResult;
        }
      }

      const textResult = await this.readAsText(file);
      const trimmed = textResult.trim();

      if (trimmed.startsWith('-----BEGIN PGP MESSAGE-----')) {
        return textResult;
      }

      if (trimmed.length < 200 || /[\x00-\x08\x0E-\x1F\x7F]/.test(trimmed)) {
        return binaryResult;
      }

      return textResult;
    } catch (error) {
      console.warn('Binary read failed, falling back to text mode:', error);
      return this.readAsText(file);
    }
  }

  readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file as binary'));
      reader.readAsArrayBuffer(file);
    });
  }

  readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file as text'));
      reader.readAsText(file, 'utf-8');
    });
  }

  parseShareContent(content) {
    const detected = detectShareFormat(typeof content === 'string' ? content : '');
    if (!detected.extractedShares || detected.extractedShares.length === 0) {
      return null;
    }

    return {
      format: detected.format,
      rawShare: detected.extractedShares[0],
    };
  }

  updateFilesList() {
    const uploadedFiles = getElement('#uploadedFiles');
    const filesList = getElement('#filesList');

    if (!uploadedFiles || !filesList) return;

    if (this.uploadedFiles.length === 0) {
      toggleElement(uploadedFiles, false);
      return;
    }

    toggleElement(uploadedFiles, true);
    clearElement(filesList);

    this.uploadedFiles.forEach((file, index) => {
      const fileItem = this.createFileItem(file, index);
      filesList.appendChild(fileItem);
    });
  }

  createFileItem(file, index) {
    const fileItem = createElement('div', ['file-item']);

    const fileInfo = createElement('div', ['file-info']);

    const fileIcon = createElement('div', ['file-icon']);
    fileIcon.textContent = file.name.endsWith('.gpg') ? '🔒' : '📄';

    const fileDetails = createElement('div', ['file-details']);

    const fileName = createElement('div', ['file-name']);
    fileName.textContent = file.name;

    const fileStatus = createElement('div', ['file-status', file.status]);
    fileStatus.textContent = this.getFileStatusText(file.status);

    fileDetails.appendChild(fileName);
    fileDetails.appendChild(fileStatus);

    fileInfo.appendChild(fileIcon);
    fileInfo.appendChild(fileDetails);

    const fileRemove = createElement('button', ['file-remove']);
    fileRemove.textContent = '×';
    addEvent(fileRemove, 'click', () => this.removeFile(index));

    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileRemove);

    return fileItem;
  }

  getFileStatusText(status) {
    const statusTexts = t('fileStatus');
    if (typeof statusTexts === 'object') {
      return statusTexts[status] || statusTexts.unknown;
    }

    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'valid':
        return 'Valid share';
      case 'invalid':
        return 'Invalid format';
      case 'encrypted':
        return 'Encrypted — awaiting decryption';
      default:
        return 'Unknown status';
    }
  }

  removeFile(index) {
    this.uploadedFiles.splice(index, 1);
    this.updateFilesList();
    this.validateCurrentTab();
  }

  clearAllFiles() {
    this.uploadedFiles = [];
    this.hasEncryptedFiles = false;
    this.uploadPassword = '';
    this.updateFilesList();
    this.validateCurrentTab();
    this.togglePasswordSection(false);
  }

  validateCurrentTab() {
    if (this.activeTab === 'paste') {
      this.validatePasteInput();
    } else {
      this.validateFileUpload();
    }
  }

  validatePasteInput() {
    const input = getElement('#recoverInput');
    const statusDiv = getElement('#inputStatus');
    const recoverBtn = getElement('#recoverBtn');

    if (!input || !statusDiv || !recoverBtn) return;

    const inputText = input.value.trim();

    if (!inputText) {
      this.updateStatus('waiting', t('waitingForInput'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    const detectedInput = detectShareFormat(inputText);
    const extractedShares = detectedInput.extractedShares || [];

    if (extractedShares.length === 0) {
      this.updateStatus('invalid', t('errors.invalidShareFormat'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    const detected = detectShareCollectionFormat(extractedShares);

    if (detected.hasIncompatibleSlip39Sets) {
      this.updateStatus('invalid', t('errors.incompatibleSlip39Sets'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    if (detected.isMixed) {
      const isPlainAndEncryptedMix =
        detected.glovCount > 0 &&
        detected.glovEncryptedCount > 0 &&
        detected.slip39Count === 0;

      this.updateStatus(
        'invalid',
        isPlainAndEncryptedMix ? t('errors.mixedPastedShareFormats') : t('errors.mixedGlovAndSlip39'),
        statusDiv,
      );
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    if (detected.format === SHARE_FORMAT.GLOV_SECURE_ENCRYPTED) {
      this.updateStatus('waiting', t('encryption.passwordRequired'), statusDiv);
      recoverBtn.disabled = false;
      this.updateDetectedFormatBadge(SHARE_FORMAT.GLOV_SECURE_ENCRYPTED);
      return;
    }

    if (detected.format === SHARE_FORMAT.SLIP39) {
      this.updateStatus(
        'valid',
        `Detected ${extractedShares.length} SLIP-39 share(s). Recovery can start when threshold is met.`,
        statusDiv,
      );
      recoverBtn.disabled = false;
      this.validShareCount = extractedShares.length;
      this.currentThreshold = 0;
      this.updateDetectedFormatBadge(SHARE_FORMAT.SLIP39);
      return;
    }

    if (detected.format === SHARE_FORMAT.GLOV_SECURE) {
      const validation = validateShareCollection(extractedShares);
      this.processValidationResult(validation, statusDiv, recoverBtn);
      this.updateDetectedFormatBadge(SHARE_FORMAT.GLOV_SECURE);
      return;
    }

    this.updateStatus('invalid', t('errors.invalidShareFormat'), statusDiv);
    recoverBtn.disabled = true;
    this.clearDetectedFormatBadge();
  }

  validateFileUpload() {
    const statusDiv = getElement('#uploadStatus');
    const recoverBtn = getElement('#recoverBtn');

    if (!statusDiv || !recoverBtn) return;

    if (this.uploadedFiles.length === 0) {
      this.updateStatus('waiting', t('waitingForUpload'), statusDiv);
      recoverBtn.disabled = true;
      this.clearDetectedFormatBadge();
      return;
    }

    this.validateCurrentShares();
  }

  processValidationResult(validation, statusDiv, recoverBtn) {
    if (!validation.isValid) {
      if (validation.validCount === 0) {
        this.updateStatus('invalid', t('errors.invalidShareFormat'), statusDiv);
      } else if (validation.errors && validation.errors.some((error) => /duplicate/i.test(error))) {
        this.updateStatus('invalid', t('errors.duplicateShares'), statusDiv);
      } else if (validation.errors && validation.errors.some((error) => /set identifier|same set/i.test(error))) {
        this.updateStatus('invalid', t('errors.inconsistentShareSet'), statusDiv);
      } else {
        this.updateStatus('insufficient', t('errors.insufficientShares', validation.threshold, validation.validCount), statusDiv);
      }
      recoverBtn.disabled = true;
    } else {
      this.updateStatus('valid', t('info.validShares', validation.validCount, validation.threshold), statusDiv);
      recoverBtn.disabled = false;
      this.currentThreshold = validation.threshold;
      this.validShareCount = validation.validCount;
    }
  }

  updateStatus(status, message, statusDiv) {
    if (!statusDiv) return;

    statusDiv.className = statusDiv.className.replace(/\b(input|upload)-\w+\b/g, '');

    const statusClass = statusDiv.id === 'inputStatus' ? `input-${status}` : `upload-${status}`;
    toggleClass(statusDiv, statusClass, true);

    statusDiv.innerHTML = '';
    const spanElement = document.createElement('span');
    spanElement.className = 'status-text';
    spanElement.textContent = message;
    statusDiv.appendChild(spanElement);
  }

  updateDetectedFormatBadge(format) {
    const badge = getElement('#detectedFormatBadge');
    if (!badge) return;

    const label = getDetectedFormatLabel(format);
    if (!label) {
      badge.textContent = '';
      toggleElement(badge, false);
      this.currentDetectedFormat = SHARE_FORMAT.UNKNOWN;
      return;
    }

    badge.textContent = label;
    toggleElement(badge, true);
    this.currentDetectedFormat = format;
  }

  clearDetectedFormatBadge() {
    this.updateDetectedFormatBadge(SHARE_FORMAT.UNKNOWN);
  }

  getCurrentShares() {
    if (this.activeTab === 'paste') {
      const input = getElement('#recoverInput');
      if (!input) return [];

      const inputText = input.value.trim();
      if (!inputText) return [];

      const detected = detectShareFormat(inputText);
      return detected.extractedShares || [];
    } else {
      return this.uploadedFiles
        .filter((file) => file.status === 'valid' && file.shareData && typeof file.shareData.rawShare === 'string')
        .map((file) => file.shareData.rawShare);
    }
  }

  getEncryptionPassword() {
    return '';
  }

  showError(message) {
    const errorAlert = createElement('div', ['alert', 'alert-error']);
    errorAlert.style.position = 'fixed';
    errorAlert.style.top = '20px';
    errorAlert.style.right = '20px';
    errorAlert.style.zIndex = '9999';
    errorAlert.style.maxWidth = '400px';
    errorAlert.textContent = message;

    document.body.appendChild(errorAlert);

    setTimeout(() => {
      if (errorAlert.parentNode) {
        errorAlert.parentNode.removeChild(errorAlert);
      }
    }, 3000);
  }

  destroy() {
    this.uploadedFiles = [];
    this.parsedShares = [];
    this.isEncryptionEnabled = false;
    this.encryptionPassword = '';
    this.currentThreshold = 0;
    this.validShareCount = 0;
    this.pendingFiles = [];
    this.hasEncryptedFiles = false;
  }

  setupEncryptionPassword() {
    const uploadDecryptionForm = getElement('#uploadDecryptionForm');
    const passwordInput = getElement('#uploadEncryptionPassword');
    const passwordToggle = getElement('#uploadPasswordToggleBtn');
    const applyBtn = getElement('#applyDecryptionBtn');
    const skipBtn = getElement('#skipDecryptionBtn');

    if (!passwordInput || !passwordToggle || !applyBtn || !skipBtn) return;

    if (uploadDecryptionForm) {
      addEvent(uploadDecryptionForm, 'submit', (e) => e.preventDefault());
    }

    // NEW: if WebCrypto not available, disable the whole section
    if (!this.webCryptoAvailable) {
      toggleElement('#encryptionPasswordSection', false);
      return;
    }

    addEvent(passwordInput, 'input', () => {
      this.uploadPassword = passwordInput.value;
    });

    addEvent(passwordToggle, 'click', () => {
      this.togglePasswordVisibility();
    });

    addEvent(applyBtn, 'click', () => {
      this.applyDecryption();
    });

    addEvent(skipBtn, 'click', () => {
      this.skipDecryption();
    });

    addEvent(passwordInput, 'keydown', (e) => {
      if (e.key === 'Enter') {
        this.applyDecryption();
      }
    });
  }

  togglePasswordVisibility() {
    const passwordInput = getElement('#uploadEncryptionPassword');
    const passwordToggle = getElement('#uploadPasswordToggleBtn');

    if (!passwordInput || !passwordToggle) return;

    this.passwordVisible = !this.passwordVisible;
    passwordInput.type = this.passwordVisible ? 'text' : 'password';
    passwordToggle.querySelector('.password-toggle-icon').textContent = this.passwordVisible ? 'Hide' : 'Show';
  }

  togglePasswordSection(show, hasEncryptedFiles = false) {
    const passwordSection = getElement('#encryptionPasswordSection');
    const uploadArea = getElement('#uploadArea');

    if (!passwordSection || !uploadArea) return;

    // NEW: force-hide if no WebCrypto
    if (!this.webCryptoAvailable) {
      toggleElement(passwordSection, false);
      this.removeEncryptedFilesIndicator();
      return;
    }

    if (show && hasEncryptedFiles) {
      toggleElement(passwordSection, true);
      this.addEncryptedFilesIndicator();

      setTimeout(() => {
        const passwordInput = getElement('#uploadEncryptionPassword');
        if (passwordInput) passwordInput.focus();
      }, 100);
    } else {
      toggleElement(passwordSection, false);
      this.removeEncryptedFilesIndicator();
    }
  }

  addEncryptedFilesIndicator() {
    const uploadArea = getElement('#uploadArea');
    if (!uploadArea) return;

    if (uploadArea.querySelector('.encrypted-files-indicator')) return;

    const indicator = createElement('div', ['encrypted-files-indicator']);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.textContent = '🔒';
    indicator.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.textContent = t('encryption.encryptedFileDetected') || 'Encrypted file(s) detected — enter password to decrypt.';
    indicator.appendChild(textSpan);

    uploadArea.parentNode.insertBefore(indicator, uploadArea);
  }

  removeEncryptedFilesIndicator() {
    const indicator = document.querySelector('.encrypted-files-indicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  async applyDecryption() {
    // NEW: hard stop if no WebCrypto
    if (!this.webCryptoAvailable) {
      this.showError(
        t('encryption.requiresHttps') ||
          'Decryption is disabled on HTTP. Use HTTPS (secure context) to enable it.'
      );
      return;
    }

    if (!this.uploadPassword) {
      this.showError(t('encryption.passwordRequired') || 'Please enter a decryption password.');
      return;
    }

    const encryptedFiles = this.uploadedFiles.filter((file) => file.status === 'encrypted');

    if (encryptedFiles.length === 0) {
      this.showError(t('encryption.noEncryptedFiles') || 'No encrypted files to decrypt.');
      return;
    }

    await this.retryDecryption(encryptedFiles, this.uploadPassword);
    this.togglePasswordSection(false);
  }

  skipDecryption() {
    this.togglePasswordSection(false);
    this.validateCurrentShares();
  }
}
