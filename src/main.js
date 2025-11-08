/**
 * MnemonicShards - Main application file
 * Refactored main module using a componentized architecture for maintainability.
 */

import { MnemonicInput } from './components/MnemonicInput.js';
import { ShareManager } from './components/ShareManager.js';
import { RecoveryTabManager } from './components/RecoveryTabManager.js';
import { getElement, addEvent, toggleElement, toggleClass } from './utils/dom.js';
import { APP_CONFIG, MNEMONIC_CONFIG, SELECTORS, CSS_CLASSES } from './constants/index.js';
import { i18n } from './utils/i18n.js';
import { LANGUAGES } from './constants/i18n.js';

/**
 * Main application class
 */
class MnemonicSplitApp {
  constructor() {
    this.mnemonicInput = new MnemonicInput(MNEMONIC_CONFIG.DEFAULT_WORD_COUNT);
    this.shareManager = new ShareManager();
    this.recoveryTabManager = new RecoveryTabManager();
    this.currentWordCount = MNEMONIC_CONFIG.DEFAULT_WORD_COUNT;

    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.setupLanguageSwitcher();
    this.updateThresholdOptions();
    this.setInitialState();
    // Initialize encryption listeners (currently a no-op placeholder)
    this.shareManager.initEncryptionListeners();
    i18n.init();
  }

  /**
   * Wire up DOM event listeners
   */
  setupEventListeners() {
    // Word count toggles
    const words12Btn = getElement('#words12');
    const words24Btn = getElement('#words24');

    if (words12Btn) addEvent(words12Btn, 'click', () => this.setWordCount(12));
    if (words24Btn) addEvent(words24Btn, 'click', () => this.setWordCount(24));

    // Update threshold options when total shares changes
    const totalSharesSelect = getElement(SELECTORS.TOTAL_SHARES);
    if (totalSharesSelect) {
      addEvent(totalSharesSelect, 'change', () => this.updateThresholdOptions());
    }

    // Generate shares
    const generateBtn = getElement(SELECTORS.GENERATE_BTN);
    if (generateBtn) {
      addEvent(generateBtn, 'click', () => this.handleGenerateShares());
    }

    // Recover mnemonic
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
    if (recoverBtn) {
      addEvent(recoverBtn, 'click', () => this.handleRecoverMnemonic());
    }

    // Keyboard shortcuts
    addEvent(document, 'keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  /**
   * Setup language switcher (EN / FR)
   */
  setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.language-btn');

    langButtons.forEach((button) => {
      const lang = button.getAttribute('data-lang');
      addEvent(button, 'click', (e) => {
        e.preventDefault();
        // FIX: support EN and FR (not ZH)
        if (lang === LANGUAGES.EN || lang === LANGUAGES.FR) {
          this.switchLanguage(lang);
        }
      });
    });

    // React to language changes
    i18n.addListener((lang) => {
      this.updateLanguageUI(lang);
      this.updateDynamicContent();
    });

    // Initial UI sync
    this.updateLanguageUI(i18n.getCurrentLanguage());
  }

  /**
   * Switch the app language
   * @param {string} language - Language code
   */
  switchLanguage(language) {
    i18n.setLanguage(language);
  }

  /**
   * Update active state on language buttons
   * @param {string} language - Language code
   */
  updateLanguageUI(language) {
    const langButtons = document.querySelectorAll('.language-btn');
    langButtons.forEach((button) => {
      const buttonLang = button.getAttribute('data-lang');
      if (buttonLang === language) button.classList.add('active');
      else button.classList.remove('active');
    });
  }

  /**
   * Update UI text that depends on current language
   */
  updateDynamicContent() {
    this.updateThresholdOptions();
    this.updateTotalSharesOptions();
    this.updatePlaceholders();
    this.updateWordInputPlaceholders();
  }

  /**
   * Rebuild "total shares" select with translated labels
   */
  updateTotalSharesOptions() {
    const totalSharesSelect = getElement(SELECTORS.TOTAL_SHARES);
    if (!totalSharesSelect) return;

    const currentValue = totalSharesSelect.value;
    const options = [{ value: '3' }, { value: '4' }, { value: '5' }, { value: '6' }, { value: '7' }];

    totalSharesSelect.innerHTML = '';
    options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = i18n.t('sharesOption', parseInt(option.value, 10));
      if (option.value === currentValue) optionElement.selected = true;
      totalSharesSelect.appendChild(optionElement);
    });
  }

  /**
   * Refresh placeholders that use i18n keys
   */
  updatePlaceholders() {
    const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
    if (recoverInput) {
      const placeholderKey = recoverInput.getAttribute('data-i18n-placeholder');
      if (placeholderKey) recoverInput.placeholder = i18n.t(placeholderKey);
    }
  }

  /**
   * Clear placeholders for mnemonic inputs (visual consistency)
   */
  updateWordInputPlaceholders() {
    for (let i = 1; i <= this.currentWordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (input) input.placeholder = '';
    }
  }

  /**
   * Set initial UI state
   */
  setInitialState() {
    this.updateWordCountButtons();
    // Render word inputs for the initial word count
    this.mnemonicInput.renderInputs();
    this.shareManager.hideAllAlerts();
  }

  /**
   * Change mnemonic word count (12/24)
   * @param {number} count - Number of words
   */
  setWordCount(count) {
    if (!MNEMONIC_CONFIG.WORD_COUNTS.includes(count)) return;

    this.currentWordCount = count;
    this.mnemonicInput.setWordCount(count);
    this.updateWordCountButtons();
    this.shareManager.hideAllAlerts();
  }

  /**
   * Toggle active state for 12/24 buttons
   */
  updateWordCountButtons() {
    const words12Btn = getElement('#words12');
    const words24Btn = getElement('#words24');
    if (words12Btn) toggleClass(words12Btn, CSS_CLASSES.ACTIVE, this.currentWordCount === 12);
    if (words24Btn) toggleClass(words24Btn, CSS_CLASSES.ACTIVE, this.currentWordCount === 24);
  }

  /**
   * Rebuild threshold select to reflect current total shares
   */
  updateThresholdOptions() {
    const totalSharesSelect = getElement(SELECTORS.TOTAL_SHARES);
    const thresholdSelect = getElement(SELECTORS.THRESHOLD);
    if (!totalSharesSelect || !thresholdSelect) return;

    const totalShares = parseInt(totalSharesSelect.value, 10);
    const currentThreshold = parseInt(thresholdSelect.value, 10);

    thresholdSelect.innerHTML = '';
    for (let i = 2; i <= totalShares; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i18n.t('sharesOption', i);
      if (i === Math.min(currentThreshold, totalShares)) option.selected = true;
      thresholdSelect.appendChild(option);
    }
  }

  /**
   * Generate shard set from the current mnemonic
   */
  async handleGenerateShares() {
    const validation = this.mnemonicInput.validateAllInputs();
    if (!validation.isValid) {
      if (validation.hasEmpty) {
        this.shareManager.showError(i18n.t('errors.fillAllWords'));
      } else if (validation.hasInvalidWord) {
        this.shareManager.showError(i18n.t('errors.invalidWord', validation.invalidWordIndex));
        this.focusInvalidInput(validation.invalidWordIndex);
      }
      return;
    }

    const totalShares = parseInt(getElement(SELECTORS.TOTAL_SHARES).value, 10);
    const threshold = parseInt(getElement(SELECTORS.THRESHOLD).value, 10);

    const success = await this.shareManager.generateShares(
      validation.words,
      totalShares,
      threshold
    );
    if (success) this.scrollToResult();
  }

  /**
   * Recover mnemonic from provided shards (paste or file upload)
   */
  async handleRecoverMnemonic() {
    try {
      const shares = this.recoveryTabManager.getCurrentShares();
      const encryptionPassword = this.recoveryTabManager.getEncryptionPassword();

      if (shares.length === 0) {
        this.shareManager.showError(i18n.t('errors.noValidShares'));
        return;
      }

      const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
      if (recOVERBtn) { /* intentional typo check? No. We'll correct below */ }
      if (recoverBtn) {
        recoverBtn.disabled = true;
        recoverBtn.textContent = i18n.t('info.recovering');
      }

      const success = await this.shareManager.recoverMnemonicWithShares(shares, encryptionPassword);
      if (success) this.scrollToResult();
    } catch (error) {
      this.shareManager.showError(i18n.t('errors.recoveryFailed') + error.message);
    } finally {
      const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
      if (recoverBtn) {
        recoverBtn.disabled = false;
        recoverBtn.textContent = i18n.t('recoverBtn');
      }
    }
  }

  /**
   * Focus the first invalid word input
   * @param {number} index - 1-based input index
   */
  focusInvalidInput(index) {
    const input = getElement(SELECTORS.WORD_INPUT(index));
    if (input) {
      toggleClass(input, CSS_CLASSES.INVALID_WORD, true);
      input.focus();
    }
  }

  /**
   * Smooth-scroll to the result section
   */
  scrollToResult() {
    const resultDiv =
      getElement(SELECTORS.SHARES_RESULT) || getElement(SELECTORS.RECOVER_RESULT);
    if (resultDiv) resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Global keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter: generate or recover
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();

      const recoverSection = getElement('.recover-section');
      const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
      const isActiveInRecover = recoverInput && document.activeElement === recoverInput;

      const recoverBtnEl = getElement(SELECTORS.RECOVER_BTN);
      if (isActiveInRecover && recoverBtnEl && !recoverBtnEl.disabled) {
        this.handleRecoverMnemonic();
      } else if (!isActiveInRecover) {
        this.handleGenerateShares();
      }
    }

    // ESC: clear all alerts
    if (e.key === 'Escape') {
      this.shareManager.hideAllAlerts();
    }
  }

  /**
   * Expose app info (useful for diagnostics)
   * @returns {Object} Application metadata
   */
  getAppInfo() {
    return {
      name: APP_CONFIG.NAME,
      description: APP_CONFIG.DESCRIPTION,
      version: APP_CONFIG.VERSION,
      currentWordCount: this.currentWordCount,
    };
  }

  /**
   * Cleanup resources on teardown
   */
  destroy() {
    this.mnemonicInput.destroy();
    this.shareManager.destroy();
    if (this.recoveryTabManager) this.recoveryTabManager.destroy();
  }
}

// Global app instance
let app;

/**
 * Bootstrap the application
 */
function initApp() {
  try {
    app = new MnemonicSplitApp();
  } catch (error) {
    // Swallow initialization errors to avoid breaking UI
  }
}

/**
 * Bind safe functions to window for inline handlers
 */
function bindGlobalFunctions() {
  window.setWordCount = (count) => app && app.setWordCount(count);
  window.generateShares = () => app && app.handleGenerateShares();
  window.copyShare = (button, shareContent) => app && app.shareManager.copyShare(button, shareContent);
  window.downloadShare = (shareContent, shareIndex) =>
    app && app.shareManager.downloadShare(shareContent, shareIndex);
  window.recoverMnemonic = () => app && app.handleRecoverMnemonic();
  window.validateShares = () => app && app.recoveryTabManager && app.recoveryTabManager.validateCurrentTab();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  bindGlobalFunctions();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (app) app.destroy();
});

// Export class for debugging
if (typeof window !== 'undefined') {
  window.MnemonicSplitApp = MnemonicSplitApp;
  window.app = app;
}

// Register the service worker on window load (if supported)
// - Ensures offline caching for same-origin assets via public/sw.js
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Best-effort registration; ignore errors to avoid breaking the app
    // Use Vite base URL so the SW is found under GitHub Pages subpath as well
    const base =
      (typeof import !== 'undefined' &&
        typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.BASE_URL) ?
        import.meta.env.BASE_URL : '/';
    const swUrl = base.replace(/\/$/, '') + '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}
