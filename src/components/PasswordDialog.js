/**
 * Password dialog component for symmetric encryption tasks.
 * Presents a modal with password entry and visibility toggle.
 */

import { getElement, createElement, toggleElement, addEvent } from '../utils/dom.js';
import { t } from '../utils/i18n.js';

export class PasswordDialog {
  constructor() {
    this.isVisible = false;
    this.currentPassword = '';
    this.resolveCallback = null;
    this.rejectCallback = null;
    this.isRetry = false;
  }

/**
   * Show the dialog and resolve with the entered password.
   * @param {boolean} isRetry - Whether this is a retry prompt
   * @returns {Promise<string>}
   */
  show(isRetry = false) {
    return new Promise((resolve, reject) => {
      this.isRetry = isRetry;
      this.resolveCallback = resolve;
      this.rejectCallback = reject;
      this.createDialog();
      this.isVisible = true;
    });
  }

  /** Create and mount the dialog elements. */
  createDialog() {
    // Remove any existing dialog before creating a new one
    this.removeDialog();

    // Create overlay element
    const overlay = createElement('div', ['password-dialog-overlay']);

    // Create dialog container
    const dialog = createElement('div', ['password-dialog']);

    // Dialog title
    const title = createElement('h3', ['password-dialog-title']);
    title.textContent = this.isRetry ? t('passwordDialog.retryTitle') : t('passwordDialog.title');

    // Dialog message
    const message = createElement('p', ['password-dialog-message']);
    message.textContent = this.isRetry ? t('passwordDialog.retryMessage') : t('passwordDialog.message');

    // Password input group
    const inputGroup = createElement('div', ['password-input-group']);

    const label = createElement('label', ['password-label']);
    label.setAttribute('for', 'dialogPasswordInput');
    label.textContent = t('encryption.passwordLabel');

    // Password input wrapper
    const passwordWrapper = createElement('div', ['password-input-wrapper']);

    const input = createElement('input', ['password-input']);
    input.id = 'dialogPasswordInput';
    input.type = 'password';
    input.placeholder = t('encryption.passwordPlaceholder');
    input.autocomplete = 'new-password';

    // Visibility toggle button
    const toggleBtn = createElement('button', ['password-toggle-btn']);
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = 'ðŸ‘ï¸';
    toggleBtn.setAttribute('aria-label', 'Toggle password visibility');

    passwordWrapper.appendChild(input);
    passwordWrapper.appendChild(toggleBtn);

    inputGroup.appendChild(label);
    inputGroup.appendChild(passwordWrapper);

    // Buttons container
    const buttonGroup = createElement('div', ['password-dialog-buttons']);

    const confirmBtn = createElement('button', ['btn', 'btn-primary']);
    confirmBtn.textContent = t('passwordDialog.confirm');
    confirmBtn.id = 'dialogConfirmBtn';

    const cancelBtn = createElement('button', ['btn', 'btn-secondary']);
    cancelBtn.textContent = t('passwordDialog.cancel');
    cancelBtn.id = 'dialogCancelBtn';

    buttonGroup.appendChild(confirmBtn);
    buttonGroup.appendChild(cancelBtn);

    // Assemble dialog content
    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(inputGroup);
    dialog.appendChild(buttonGroup);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Setup event listeners
    this.setupEventListeners(input, confirmBtn, cancelBtn, toggleBtn);

    // Focus input shortly after mount
    setTimeout(() => input.focus(), 100);
  }

  /**
   * Wire up DOM event listeners for dialog controls.
   * @param {Element} input
   * @param {Element} confirmBtn
   * @param {Element} cancelBtn
   * @param {Element} toggleBtn
   */
  setupEventListeners(input, confirmBtn, cancelBtn, toggleBtn) {
    // Update current password on input
    addEvent(input, 'input', () => {
      this.currentPassword = input.value;
    });

    // Toggle password visibility
    addEvent(toggleBtn, 'click', () => {
      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      toggleBtn.innerHTML = type === 'password' ? 'ðŸ‘ï¸' : 'ðŸ‘ï¸â€ðŸ—¨ï¸';
    });

    // Confirm on Enter key
    addEvent(input, 'keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleConfirm();
      }
    });

    // Confirm button
    addEvent(confirmBtn, 'click', () => {
      this.handleConfirm();
    });

    // Cancel button
    addEvent(cancelBtn, 'click', () => {
      this.handleCancel();
    });

    const overlay = getElement('.password-dialog-overlay');
    if (overlay) {
      // Close when clicking outside the dialog
      addEvent(overlay, 'click', (e) => {
        if (e.target === overlay) {
          this.handleCancel();
        }
      });
    }
  }

  /** Confirm: validate input, resolve, and close. */
  handleConfirm() {
    if (!this.currentPassword) {
      // Visual feedback for empty input
      const input = getElement('#dialogPasswordInput');
      if (input) {
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 2000);
      }
      return;
    }

    this.removeDialog();
    this.isVisible = false;

    if (this.resolveCallback) {
      this.resolveCallback(this.currentPassword);
    }
  }

  /** Cancel: reject and close the dialog. */
  handleCancel() {
    this.removeDialog();
    this.isVisible = false;

    if (this.rejectCallback) {
      this.rejectCallback(new Error('User cancelled password input'));
    }
  }

  /** Remove the dialog from the DOM if present. */
  removeDialog() {
    const overlay = getElement('.password-dialog-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
  }

  /** Whether the password dialog is currently visible. */
  isDialogVisible() {
    return this.isVisible;
  }
}

export const passwordDialog = new PasswordDialog();
