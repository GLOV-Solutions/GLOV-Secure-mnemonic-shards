/**
 * Recovery Tab Manager
 * Handles tab switching, file uploads, and share parsing for recovery
 */

import { getElement, createElement, toggleElement, toggleClass, setHTML, clearElement, addEvent } from '../utils/dom.js';
import { validateShareCollection } from '../utils/validation.js';
import { validatePasswordMatch, decryptWithPassword, detectGpgFormat } from '../utils/encryption.js';
import { t } from '../utils/i18n.js';
import { passwordDialog } from './PasswordDialog.js';

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

    // Tab button handlers
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

    // Update button state
    toggleClass(pasteTabBtn, 'active', tabType === 'paste');
    toggleClass(uploadTabBtn, 'active', tabType === 'upload');

    // Update content visibility
    toggleClass(pasteTab, 'active', tabType === 'paste');
    toggleClass(uploadTab, 'active', tabType === 'upload');

    // Clear previous tab result area
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

    // Open file selector
    addEvent(selectFilesBtn, 'click', () => fileInput.click());

    // On file chosen
    addEvent(fileInput, 'change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // Clear files
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

    // Prevent default browser behavior
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      addEvent(uploadArea, eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Visual feedback on drag over
    ['dragenter', 'dragover'].forEach((eventName) => {
      addEvent(uploadArea, eventName, () => {
        toggleClass(uploadArea, 'drag-over', true);
      });
    });

    // Remove feedback when leaving
    addEvent(uploadArea, 'dragleave', () => {
      toggleClass(uploadArea, 'drag-over', false);
    });

    // Handle drop
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

    // Check if any are encrypted
    this.hasEncryptedFiles = validFiles.some((file) => file.name.endsWith('.gpg'));

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

    // Update UI and validate current state
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
      // Add to uploads list
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

      // Read content
      const content = await this.readFileContent(file);
      fileData.content = content;

      // Detect content format
      if (fileData.isEncrypted) {
        fileData.contentFormat = (content instanceof ArrayBuffer) ? 'binary' : 'text';
        fileData.status = 'encrypted';
      } else {
        // Non-encrypted files must be text
        if (typeof content !== 'string') {
          fileData.status = 'invalid';
          return;
        }
        fileData.contentFormat = 'text';

        // Parse share content
        const shareData = this.parseShareContent(content);
        if (shareData && !shareData.encrypted) {
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

  /**
   * Get password from dialog
   * @param {boolean} isRetry
   * @returns {Promise<string>}
   */
  async getPasswordFromDialog(isRetry = false) {
    return await passwordDialog.show(isRetry);
  }

  /**
   * Retry decryption for encrypted files with supplied password
   * @param {Array<Object>} encryptedFiles
   * @param {string} password
   */
  async retryDecryption(encryptedFiles, password) {
    let decryptionSuccess = false;

    for (const file of encryptedFiles) {
      try {
        const decryptedContent = await decryptWithPassword(file.content, password);
        file.decryptedContent = decryptedContent;

        // Parse decrypted share
        const shareData = this.parseShareContent(decryptedContent);
        if (shareData && !shareData.encrypted) {
          file.shareData = shareData;
          file.status = 'valid';
          decryptionSuccess = true;
        } else {
          file.status = 'invalid';
        }
      } catch (error) {
        file.status = 'invalid';
        // More explicit error handling in English
        if (/invalid password|wrong password/i.test(error.message)) {
          // Wrong password; continue with other files
        } else if (/invalid format|malformed/i.test(error.message)) {
          // Format error; mark invalid but continue
          console.warn(`File ${file.name} has invalid format:`, error.message);
        } else {
          // Other errors
          console.warn(`File ${file.name} decryption failed:`, error.message);
        }
      }

      // Update UI and validation after each file
      this.updateFilesList();
      this.validateCurrentShares();
    }

    // If all failed, show a clear error message
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

    // Collect valid shares
    const allShares = this.uploadedFiles
      .filter((file) => file.status === 'valid' && file.shareData)
      .map((file) => file.shareData);

    // Check for files pending decryption
    const encryptedFiles = this.uploadedFiles.filter((file) => file.status === 'encrypted');

    if (allShares.length === 0 && encryptedFiles.length === 0) {
      this.updateStatus('invalid', t('errors.noValidShares'), statusDiv);
      recoverBtn.disabled = true;
      return;
    }

    if (allShares.length === 0 && encryptedFiles.length > 0) {
      this.updateStatus('waiting', t('encryption.passwordRequired'), statusDiv);
      // Allow pressing Recover to trigger password dialog later
      recoverBtn.disabled = false;
      return;
    }

    // Validate combined shares
    const validation = validateShareCollection(allShares);

    if (validation.isValid) {
      this.updateStatus('valid', t('sharesDecrypted', validation.validCount, validation.threshold), statusDiv);
      recoverBtn.disabled = false;
      this.currentThreshold = validation.threshold;
      this.validShareCount = validation.validCount;
    } else {
      if (validation.validCount < validation.threshold) {
        this.updateStatus('insufficient', t('insufficientSharesAfterDecryption', validation.threshold, validation.validCount), statusDiv);
      } else {
        this.updateStatus('invalid', t('errors.invalidShareFormat'), statusDiv);
      }
      recoverBtn.disabled = true;
    }
  }

  /**
   * Read file content with smart GPG handling
   * @param {File} file
   * @returns {Promise<string|ArrayBuffer>}
   */
  async readFileContent(file) {
    if (file.name.endsWith('.gpg')) {
      return this.readGpgFile(file);
    } else {
      // Plain text
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }
  }

  /**
   * Read GPG file and detect format (binary vs ASCII armor)
   * @param {File} file
   * @returns {Promise<string|ArrayBuffer>}
   */
  async readGpgFile(file) {
    // Try ArrayBuffer first
    try {
      const binaryResult = await this.readAsArrayBuffer(file);
      const format = detectGpgFormat(binaryResult);

      // Binary packets -> return as-is
      if (format.type === 'binary-packet' || format.type === 'binary') {
        return binaryResult;
      }

      // ASCII armor -> convert to text
      if (format.type === 'ascii-armor') {
        try {
          const textContent = new TextDecoder('utf-8', { fatal: false }).decode(binaryResult);
          return textContent;
        } catch (_decodeError) {
          // Fallback to binary if decoding fails
          return binaryResult;
        }
      }

      // Unclear: try reading as text too
      const textResult = await this.readAsText(file);
      const trimmed = textResult.trim();

      if (trimmed.startsWith('-----BEGIN PGP MESSAGE-----')) {
        return textResult;
      }

      // Very short or contains control chars -> likely binary misread
      if (trimmed.length < 200 || /[\x00-\x08\x0E-\x1F\x7F]/.test(trimmed)) {
        return binaryResult;
      }

      // Default to text (assume ASCII armor)
      return textResult;
    } catch (error) {
      // If binary read fails, fallback to text
      console.warn('Binary read failed, falling back to text mode:', error);
      return this.readAsText(file);
    }
  }

  /**
   * Read file as ArrayBuffer
   * @param {File} file
   * @returns {Promise<ArrayBuffer>}
   */
  readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file as binary'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read file as UTF-8 text
   * @param {File} file
   * @returns {Promise<string>}
   */
  readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file as text'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Parse share file content
   * @param {string} content
   * @returns {Object|null} shareData or { encrypted: true, content }
   */
  parseShareContent(content) {
    try {
      // Try single-line share first
      try {
        const trimmedContent = content.trim();

        // GPG ASCII armor?
        if (trimmedContent.startsWith('-----BEGIN PGP MESSAGE-----')) {
          return { encrypted: true, content: trimmedContent };
        }

        // Standard encoded share?
        const shareData = JSON.parse(atob(trimmedContent));
        if (shareData.threshold && shareData.index !== undefined && shareData.data) {
          return shareData;
        }
      } catch (e) {
        // Continue to multi-line attempt
      }

      // Try multi-line parsing (one share per line)
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (const line of lines) {
        try {
          if (line.startsWith('-----BEGIN PGP MESSAGE-----')) {
            return { encrypted: true, content: line };
          }

          const shareData = JSON.parse(atob(line));
          if (shareData.threshold && shareData.index !== undefined && shareData.data) {
            return shareData;
          }
        } catch (e) {
          // Keep trying next line
        }
      }

      // Fallback: treat as encrypted/unknown, return raw content
      return { encrypted: true, content: content.trim() };
    } catch (_error) {
      // Still return something that upstream can handle
      return { encrypted: true, content: content.trim() };
    }
  }

  /**
   * Update uploaded files list UI
   */
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

  /**
   * Build single file item row
   * @param {Object} file
   * @param {number} index
   * @returns {Element}
   */
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

  /**
   * Human-readable file status text
   * @param {string} status
   * @returns {string}
   */
  getFileStatusText(status) {
    const statusTexts = t('fileStatus');
    if (typeof statusTexts === 'object') {
      return statusTexts[status] || statusTexts.unknown;
    }

    // Fallback to English
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

  /**
   * Remove file from list
   * @param {number} index
   */
  removeFile(index) {
    this.uploadedFiles.splice(index, 1);
    this.updateFilesList();
    this.validateCurrentTab();
  }

  /**
   * Clear all uploaded files
   */
  clearAllFiles() {
    this.uploadedFiles = [];
    this.hasEncryptedFiles = false;
    this.uploadPassword = '';
    this.updateFilesList();
    this.validateCurrentTab();

    // Hide password section
    this.togglePasswordSection(false);
  }

  /**
   * Validate active tab
   */
  validateCurrentTab() {
    if (this.activeTab === 'paste') {
      this.validatePasteInput();
    } else {
      this.validateFileUpload();
    }
  }

  /**
   * Validate pasted input area
   */
  validatePasteInput() {
    const input = getElement('#recoverInput');
    const statusDiv = getElement('#inputStatus');
    const recoverBtn = getElement('#recoverBtn');

    if (!input || !statusDiv || !recoverBtn) return;

    const inputText = input.value.trim();

    if (!inputText) {
      this.updateStatus('waiting', t('waitingForInput'), statusDiv);
      recoverBtn.disabled = true;
      return;
    }

    const shareStrings = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (shareStrings.length === 0) {
      this.updateStatus('waiting', t('waitingForInput'), statusDiv);
      recoverBtn.disabled = true;
      return;
    }

    const validation = validateShareCollection(shareStrings);
    this.processValidationResult(validation, statusDiv, recoverBtn);
  }

  /**
   * Validate uploaded files tab
   */
  validateFileUpload() {
    const statusDiv = getElement('#uploadStatus');
    const recoverBtn = getElement('#recoverBtn');

    if (!statusDiv || !recoverBtn) return;

    if (this.uploadedFiles.length === 0) {
      this.updateStatus('waiting', t('waitingForUpload'), statusDiv);
      recoverBtn.disabled = true;
      return;
    }

    // Unified validation path
    this.validateCurrentShares();
  }

  /**
   * Process validation result
   * @param {Object} validation
   * @param {Element} statusDiv
   * @param {Element} recoverBtn
   */
  processValidationResult(validation, statusDiv, recoverBtn) {
    if (!validation.isValid) {
      if (validation.validCount === 0) {
        this.updateStatus('invalid', t('errors.invalidShareFormat'), statusDiv);
      } else if (validation.errors && validation.errors.some((error) => /duplicate/i.test(error))) {
        this.updateStatus('invalid', t('errors.duplicateShares'), statusDiv);
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

  /**
   * Update a status area with class + message
   * @param {string} status - 'waiting' | 'valid' | 'invalid' | 'insufficient'
   * @param {string} message
   * @param {Element} statusDiv
   */
  updateStatus(status, message, statusDiv) {
    if (!statusDiv) return;

    // Remove previous status classes
    statusDiv.className = statusDiv.className.replace(/\b(input|upload)-\w+\b/g, '');

    // Add new status class based on the container type
    const statusClass = statusDiv.id === 'inputStatus' ? `input-${status}` : `upload-${status}`;
    toggleClass(statusDiv, statusClass, true);

    // Safe DOM update (avoid XSS)
    statusDiv.innerHTML = '';
    const spanElement = document.createElement('span');
    spanElement.className = 'status-text';
    spanElement.textContent = message;
    statusDiv.appendChild(spanElement);
  }

  /**
   * Get current shares based on active tab
   * @returns {Array}
   */
  getCurrentShares() {
    if (this.activeTab === 'paste') {
      const input = getElement('#recoverInput');
      if (!input) return [];

      const inputText = input.value.trim();
      if (!inputText) return [];

      return inputText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else {
      // Return valid share objects from uploaded files
      return this.uploadedFiles
        .filter((file) => file.status === 'valid' && file.shareData)
        .map((file) => file.shareData);
    }
  }

  /**
   * Get encryption password (deprecated, now always via dialog)
   * @returns {string}
   */
  getEncryptionPassword() {
    return '';
  }

  /**
   * Show a temporary error toast
   * @param {string} message
   */
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

  /**
   * Destroy manager state
   */
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

  /**
   * Set up decryption password input area (upload flow)
   */
  setupEncryptionPassword() {
    const passwordInput = getElement('#uploadEncryptionPassword');
    const passwordToggle = getElement('#uploadPasswordToggleBtn');
    const applyBtn = getElement('#applyDecryptionBtn');
    const skipBtn = getElement('#skipDecryptionBtn');

    if (!passwordInput || !passwordToggle || !applyBtn || !skipBtn) return;

    // Store password (no complexity checks here)
    addEvent(passwordInput, 'input', () => {
      this.uploadPassword = passwordInput.value;
    });

    // Toggle visibility
    addEvent(passwordToggle, 'click', () => {
      this.togglePasswordVisibility();
    });

    // Apply decryption
    addEvent(applyBtn, 'click', () => {
      this.applyDecryption();
    });

    // Skip decryption
    addEvent(skipBtn, 'click', () => {
      this.skipDecryption();
    });

    // Enter key to apply
    addEvent(passwordInput, 'keydown', (e) => {
      if (e.key === 'Enter') {
        this.applyDecryption();
      }
    });
  }

  /**
   * Toggle password field visibility
   */
  togglePasswordVisibility() {
    const passwordInput = getElement('#uploadEncryptionPassword');
    const passwordToggle = getElement('#uploadPasswordToggleBtn');

    if (!passwordInput || !passwordToggle) return;

    this.passwordVisible = !this.passwordVisible;
    passwordInput.type = this.passwordVisible ? 'text' : 'password';
    passwordToggle.querySelector('.password-toggle-icon').textContent = this.passwordVisible ? 'Hide' : 'Show';
  }

  /**
   * Show or hide password section near upload area
   * @param {boolean} show
   * @param {boolean} hasEncryptedFiles
   */
  togglePasswordSection(show, hasEncryptedFiles = false) {
    const passwordSection = getElement('#encryptionPasswordSection');
    const uploadArea = getElement('#uploadArea');

    if (!passwordSection || !uploadArea) return;

    if (show && hasEncryptedFiles) {
      // Reveal password input
      toggleElement(passwordSection, true);

      // Add encrypted files indicator
      this.addEncryptedFilesIndicator();

      // Focus password input shortly after
      setTimeout(() => {
        const passwordInput = getElement('#uploadEncryptionPassword');
        if (passwordInput) passwordInput.focus();
      }, 100);
    } else {
      // Hide password input
      toggleElement(passwordSection, false);
      this.removeEncryptedFilesIndicator();
    }
  }

  /**
   * Add a small indicator above upload area when encrypted files are detected
   */
  addEncryptedFilesIndicator() {
    const uploadArea = getElement('#uploadArea');
    if (!uploadArea) return;

    // Avoid duplicates
    if (uploadArea.querySelector('.encrypted-files-indicator')) return;

    const indicator = createElement('div', ['encrypted-files-indicator']);

    // Safe DOM structure
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.textContent = '🔒';
    indicator.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.textContent = t('encryption.encryptedFileDetected') || 'Encrypted file(s) detected — enter password to decrypt.';
    indicator.appendChild(textSpan);

    // Insert before upload area
    uploadArea.parentNode.insertBefore(indicator, uploadArea);
  }

  /**
   * Remove encrypted files indicator
   */
  removeEncryptedFilesIndicator() {
    const indicator = document.querySelector('.encrypted-files-indicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  /**
   * Apply decryption to all encrypted files
   */
  async applyDecryption() {
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

    // Hide password section after attempt
    this.togglePasswordSection(false);
  }

  /**
   * Skip decryption flow and validate only plain files
   */
  skipDecryption() {
    this.togglePasswordSection(false);
    this.validateCurrentShares();
  }
}
