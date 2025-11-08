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

// ✅ NEW: SLIP-39 wrapper (encryption via OpenPGP; shares via SLIP-39)
import {
  generateSlip39ForMnemonic,
  recoverMnemonicWithSlip39,
} from './crypto/slip39Wrapper.js';

// Polyfill for crypto.randomUUID (older engines or injected contexts)
// Safe v4 UUID using crypto.getRandomValues; no inline code (CSP-friendly)
(() => {
  try {
    if (typeof crypto !== 'undefined' && !crypto.randomUUID && crypto.getRandomValues) {
      const bytes = () => {
        const a = new Uint8Array(16);
        crypto.getRandomValues(a);
        // RFC 4122 version/variant bits
        a[6] = (a[6] & 0x0f) | 0x40;
        a[8] = (a[8] & 0x3f) | 0x80;
        return a;
      };
      crypto.randomUUID = () => {
        const b = bytes();
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return (
          toHex(b[0]) + toHex(b[1]) + toHex(b[2]) + toHex(b[3]) + '-' +
          toHex(b[4]) + toHex(b[5]) + '-' +
          toHex(b[6]) + toHex(b[7]) + '-' +
          toHex(b[8]) + toHex(b[9]) + '-' +
          toHex(b[10]) + toHex(b[11]) + toHex(b[12]) + toHex(b[13]) + toHex(b[14]) + toHex(b[15])
        );
      };
    }
  } catch (_) { /* ignore */ }
})();

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
    // Word count toggles (12 / 24)
    const words12Btn = getElement('#words12');
    const words24Btn = getElement('#words24');
    if (words12Btn) addEvent(words12Btn, 'click', () => this.setWordCount(12));
    if (words24Btn) addEvent(words24Btn, 'click', () => this.setWordCount(24));

    // Total shares change => rebuild threshold options
    const totalSharesSelect = getElement(SELECTORS.TOTAL_SHARES);
    if (totalSharesSelect) {
      addEvent(totalSharesSelect, 'change', () => this.updateThresholdOptions());
    }

    // Generate classic Shamir shares
    const generateBtn = getElement(SELECTORS.GENERATE_BTN);
    if (generateBtn) {
      addEvent(generateBtn, 'click', () => this.handleGenerateShares());
    }

    // ✅ NEW: Generate SLIP-39 (IDs needed in HTML: #generateSlip39Btn, #slip39Passphrase)
    const generateSlip39Btn = getElement('#generateSlip39Btn');
    if (generateSlip39Btn) {
      addEvent(generateSlip39Btn, 'click', () => this.handleGenerateSlip39());
    }

    // Recover mnemonic (classic paste/files tab)
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
    if (recoverBtn) {
      addEvent(recoverBtn, 'click', () => this.handleRecoverMnemonic());
    }

    // ✅ NEW: Recover via SLIP-39 (IDs: #recoverSlip39Btn, #slip39MnemonicsInput, #slip39Ciphertext, #slip39PassphraseRecover)
    const recoverSlip39Btn = getElement('#recoverSlip39Btn');
    if (recoverSlip39Btn) {
      addEvent(recoverSlip39Btn, 'click', () => this.handleRecoverSlip39());
    }

    // Recover textarea: validate on input/paste (replaces inline handlers)
    const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
    if (recoverInput) {
      addEvent(recoverInput, 'input', () => {
        if (this.recoveryTabManager) this.recoveryTabManager.validateCurrentTab();
      });
      addEvent(recoverInput, 'paste', () => {
        setTimeout(() => {
          if (this.recoveryTabManager) this.recoveryTabManager.validateCurrentTab();
        }, 100);
      });
    }

    // Optional: event delegation for share action buttons to avoid any inline handlers
    const sharesList = getElement('#sharesList');
    if (sharesList) {
      addEvent(sharesList, 'click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const content = btn.dataset.content;
        if (action === 'copy') {
          this.shareManager.copyShare(btn, content);
        } else if (action === 'download') {
          const idx = parseInt(btn.dataset.index || '0', 10);
          this.shareManager.downloadShare(content, idx);
        }
      });
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
   */
  switchLanguage(language) {
    i18n.setLanguage(language);
  }

  updateLanguageUI(language) {
    const langButtons = document.querySelectorAll('.language-btn');
    langButtons.forEach((button) => {
      const buttonLang = button.getAttribute('data-lang');
      if (buttonLang === language) button.classList.add('active');
      else button.classList.remove('active');
    });
  }

  updateDynamicContent() {
    this.updateThresholdOptions();
    this.updateTotalSharesOptions();
    this.updatePlaceholders();
    this.updateWordInputPlaceholders();
  }

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

  updatePlaceholders() {
    const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
    if (recoverInput) {
      const placeholderKey = recoverInput.getAttribute('data-i18n-placeholder');
      if (placeholderKey) recoverInput.placeholder = i18n.t(placeholderKey);
    }
  }

  updateWordInputPlaceholders() {
    for (let i = 1; i <= this.currentWordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (input) input.placeholder = '';
    }
  }

  setInitialState() {
    this.updateWordCountButtons();
    // Render word inputs for the initial word count
    this.mnemonicInput.renderInputs();
    this.shareManager.hideAllAlerts();
  }

  setWordCount(count) {
    if (!MNEMONIC_CONFIG.WORD_COUNTS.includes(count)) return;

    this.currentWordCount = count;
    this.mnemonicInput.setWordCount(count);
    this.updateWordCountButtons();
    this.shareManager.hideAllAlerts();
  }

  updateWordCountButtons() {
    const words12Btn = getElement('#words12');
    const words24Btn = getElement('#words24');
    if (words12Btn) toggleClass(words12Btn, CSS_CLASSES.ACTIVE, this.currentWordCount === 12);
    if (words24Btn) toggleClass(words24Btn, CSS_CLASSES.ACTIVE, this.currentWordCount === 24);
  }

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
   * Utility: read current BIP-39 from inputs as a single string
   */
  getCurrentBip39Phrase() {
    const validation = this.mnemonicInput.validateAllInputs();
    if (!validation.isValid) return { ok: false, validation };
    return { ok: true, phrase: validation.words.join(' ') };
  }

  /**
   * Generate shard set from the current mnemonic (classic Shamir)
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
   * ✅ NEW: Generate SLIP-39 mnemonics + OpenPGP ciphertext for the current BIP-39
   * Required HTML IDs:
   * - #slip39Passphrase (optional)
   * - #slip39ResultCiphertext (block to display armored message)
   * - #slip39ResultMnemonics (block to display mnemonics list)
   */
  async handleGenerateSlip39() {
    try {
      const bip39 = this.getCurrentBip39Phrase();
      if (!bip39.ok) {
        const v = bip39.validation;
        if (v.hasEmpty) return this.shareManager.showError(i18n.t('errors.fillAllWords'));
        if (v.hasInvalidWord) {
          this.shareManager.showError(i18n.t('errors.invalidWord', v.invalidWordIndex));
          return this.focusInvalidInput(v.invalidWordIndex);
        }
        return;
      }

      const totalShares = parseInt(getElement(SELECTORS.TOTAL_SHARES).value, 10);
      const threshold = parseInt(getElement(SELECTORS.THRESHOLD).value, 10);
      const passEl = getElement('#slip39Passphrase');
      const slipPass = passEl && passEl.value ? passEl.value : undefined;

      // Generate SLIP-39 set
      const { ciphertext, mnemonics } = await generateSlip39ForMnemonic(
        bip39.phrase,
        threshold,
        totalShares,
        slipPass
      );

      // Render results (minimal UI — safe DOM updates)
      const outCipher = getElement('#slip39ResultCiphertext');
      const outList = getElement('#slip39ResultMnemonics');

      if (outCipher) {
        outCipher.textContent = ciphertext; // armored OpenPGP
      }
      if (outList) {
        outList.innerHTML = ''; // reset
        mnemonics.forEach((m, idx) => {
          const li = document.createElement('li');
          li.textContent = `${idx + 1}. ${m}`;
          outList.appendChild(li);
        });
      }

      this.shareManager.showSuccess(i18n.t('success.sharesGenerated'));
      this.scrollToResult();
    } catch (err) {
      this.shareManager.showError(i18n.t('errors.generateFailed')
        ? i18n.t('errors.generateFailed', err.message || String(err))
        : `Failed to generate shares: ${err.message || err}`);
    }
  }

  /**
   * Recover mnemonic from provided shards (classic paste/file flow)
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
   * ✅ NEW: Recover via SLIP-39 mnemonics + OpenPGP ciphertext
   * Required HTML IDs:
   * - #slip39MnemonicsInput (textarea: one mnemonic per line)
   * - #slip39Ciphertext (textarea/input with armored OpenPGP)
   * - #slip39PassphraseRecover (optional passphrase used at SLIP-39 level)
   * Renders the recovered BIP-39 into existing #recoverResult area.
   */
  async handleRecoverSlip39() {
    const btn = getElement('#recoverSlip39Btn');
    try {
      const mnemsEl = getElement('#slip39MnemonicsInput');
      const ctEl = getElement('#slip39Ciphertext');
      const passEl = getElement('#slip39PassphraseRecover');

      if (!mnemsEl || !ctEl) {
        this.shareManager.showError('SLIP-39 recovery inputs are missing in DOM.');
        return;
      }

      const mnemonics = mnemsEl.value
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (mnemonics.length === 0) {
        this.shareManager.showError(i18n.t('errors.noValidShares'));
        return;
      }
      const ciphertext = ctEl.value.trim();
      if (!ciphertext) {
        this.shareManager.showError('Missing ciphertext.');
        return;
      }
      const pass = passEl && passEl.value ? passEl.value : undefined;

      if (btn) {
        btn.disabled = true;
        btn.textContent = i18n.t('info.recovering');
      }

      const bip39 = await recoverMnemonicWithSlip39(mnemonics, ciphertext, pass);

      // Render into existing recover result panel
      const recDiv = getElement(SELECTORS.RECOVER_RESULT);
      if (recDiv) {
        recDiv.innerHTML = '';
        const pre = document.createElement('pre');
        pre.textContent = bip39;
        recDiv.appendChild(pre);
      }
      this.shareManager.showSuccess(i18n.t('success.mnemonicRecovered'));
      this.scrollToResult();
    } catch (err) {
      this.shareManager.showError(i18n.t('errors.recoveryFailed') + (err?.message || String(err)));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = i18n.t('recoverBtn'); // reuse the label
      }
    }
  }

  /**
   * Focus the first invalid word input
   */
  focusInvalidInput(index) {
    const input = getElement(SELECTORS.WORD_INPUT(index));
    if (input) {
      toggleClass(input, CSS_CLASSES.INVALID_WORD, true);
      input.focus();
    }
  }

  scrollToResult() {
    const resultDiv =
      getElement(SELECTORS.SHARES_RESULT) || getElement(SELECTORS.RECOVER_RESULT);
    if (resultDiv) resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

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

  getAppInfo() {
    return {
      name: APP_CONFIG.NAME,
      description: APP_CONFIG.DESCRIPTION,
      version: APP_CONFIG.VERSION,
      currentWordCount: this.currentWordCount,
    };
  }

  destroy() {
    this.mnemonicInput.destroy();
    this.shareManager.destroy();
    if (this.recoveryTabManager) this.recoveryTabManager.destroy();
  }
}

// Global app instance
let app;

function initApp() {
  try {
    app = new MnemonicSplitApp();
  } catch (error) {
    // Swallow initialization errors to avoid breaking UI
  }
}

function bindGlobalFunctions() {
  window.setWordCount = (count) => app && app.setWordCount(count);
  window.generateShares = () => app && app.handleGenerateShares();
  window.copyShare = (button, shareContent) => app && app.shareManager.copyShare(button, shareContent);
  window.downloadShare = (shareContent, shareIndex) =>
    app && app.shareManager.downloadShare(shareContent, shareIndex);
  window.recoverMnemonic = () => app && app.handleRecoverMnemonic();
  window.validateShares = () => app && app.recoveryTabManager && app.recoveryTabManager.validateCurrentTab();

  // ✅ Provide SLIP-39 functions too (if you want to trigger them externally)
  window.generateSlip39 = () => app && app.handleGenerateSlip39();
  window.recoverSlip39 = () => app && app.handleRecoverSlip39();
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
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base =
      (typeof import.meta !== 'undefined' &&
       import.meta.env &&
       import.meta.env.BASE_URL)
        ? import.meta.env.BASE_URL
        : '/';
    const swUrl = base.replace(/\/$/, '') + '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}
