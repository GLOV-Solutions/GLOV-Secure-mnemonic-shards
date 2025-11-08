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

// ✅ SLIP-39 wrapper (OpenPGP for payload; shares via SLIP-39)
import {
  generateSlip39ForMnemonic,
  recoverMnemonicWithSlip39,
} from './crypto/slip39Wrapper.js';

// Polyfill for crypto.randomUUID (older engines or injected contexts)
(() => {
  try {
    if (typeof crypto !== 'undefined' && !crypto.randomUUID && crypto.getRandomValues) {
      const bytes = () => {
        const a = new Uint8Array(16);
        crypto.getRandomValues(a);
        a[6] = (a[6] & 0x0f) | 0x40; // version
        a[8] = (a[8] & 0x3f) | 0x80; // variant
        return a;
      };
      crypto.randomUUID = () => {
        const b = bytes();
        const h = (n) => n.toString(16).padStart(2, '0');
        return (
          h(b[0]) + h(b[1]) + h(b[2]) + h(b[3]) + '-' +
          h(b[4]) + h(b[5]) + '-' +
          h(b[6]) + h(b[7]) + '-' +
          h(b[8]) + h(b[9]) + '-' +
          h(b[10]) + h(b[11]) + h(b[12]) + h(b[13]) + h(b[14]) + h(b[15])
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

  init() {
    this.setupEventListeners();
    this.setupLanguageSwitcher();
    this.updateThresholdOptions();
    this.setInitialState();
    this.shareManager.initEncryptionListeners();
    i18n.init();
  }

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
    if (generateBtn) addEvent(generateBtn, 'click', () => this.handleGenerateShares());

    // ✅ Generate SLIP-39 (IDs needed in HTML: #generateSlip39Btn, #slip39Passphrase)
    const generateSlip39Btn = getElement('#generateSlip39Btn');
    if (generateSlip39Btn) addEvent(generateSlip39Btn, 'click', () => this.handleGenerateSlip39());

    // Recover mnemonic (classic paste/files tab)
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
    if (recoverBtn) addEvent(recoverBtn, 'click', () => this.handleRecoverMnemonic());

    // ✅ Recover via SLIP-39 (IDs: #recoverSlip39Btn, #slip39MnemonicsInput, #slip39Ciphertext, #slip39PassphraseRecover)
    const recoverSlip39Btn = getElement('#recoverSlip39Btn');
    if (recoverSlip39Btn) addEvent(recoverSlip39Btn, 'click', () => this.handleRecoverSlip39());

    // Recover textarea live validation
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

    // Delegated share actions
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

  setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.language-btn');

    langButtons.forEach((button) => {
      const lang = button.getAttribute('data-lang');
      addEvent(button, 'click', (e) => {
        e.preventDefault();
        if (lang === LANGUAGES.EN || lang === LANGUAGES.FR) {
          this.switchLanguage(lang);
        }
      });
    });

    i18n.addListener((lang) => {
      this.updateLanguageUI(lang);
      this.updateDynamicContent();
    });

    this.updateLanguageUI(i18n.getCurrentLanguage());
  }

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
      const el = document.createElement('option');
      el.value = option.value;
      el.textContent = i18n.t('sharesOption', parseInt(option.value, 10));
      if (option.value === currentValue) el.selected = true;
      totalSharesSelect.appendChild(el);
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

  /** Read current BIP-39 phrase as a single string */
  getCurrentBip39Phrase() {
    const validation = this.mnemonicInput.validateAllInputs();
    if (!validation.isValid) return { ok: false, validation };
    return { ok: true, phrase: validation.words.join(' ') };
  }

  /** Classic Shamir flow */
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
      validation.words, totalShares, threshold
    );
    if (success) this.scrollToResult();
  }

  /** ✅ SLIP-39 generation: outputs OpenPGP ciphertext + SLIP-39 mnemonics */
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

      const { ciphertext, mnemonics } = await generateSlip39ForMnemonic(
        bip39.phrase, threshold, totalShares, slipPass
      );

      const outCipher = getElement('#slip39ResultCiphertext');
      const outList = getElement('#slip39ResultMnemonics');

      if (outCipher) outCipher.textContent = ciphertext;
      if (outList) {
        outList.innerHTML = '';
        mnemonics.forEach((m, idx) => {
          const li = document.createElement('li');
          li.textContent = `${idx + 1}. ${m}`;
          outList.appendChild(li);
        });
      }

      this.shareManager.showSuccess(i18n.t('success.sharesGenerated'));
      this.scrollToResult();
    } catch (err) {
      this.shareManager.showError(
        (i18n.t('errors.generateFailed') || 'Failed to generate shares: ') +
        (err?.message || String(err))
      );
    }
  }

  /** Classic Shamir recovery (paste/files) */
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

  /** ✅ SLIP-39 recovery (mnemonics + OpenPGP ciphertext) */
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

      const mnemonics = mnemsEl.value.split('\n').map((l) => l.trim()).filter(Boolean);
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

      if (btn) { btn.disabled = true; btn.textContent = i18n.t('info.recovering'); }

      const bip39 = await recoverMnemonicWithSlip39(mnemonics, ciphertext, pass);

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
        btn.textContent = i18n.t('recoverBtn');
      }
    }
  }

  focusInvalidInput(index) {
    const input = getElement(SELECTORS.WORD_INPUT(index));
    if (input) {
      toggleClass(input, CSS_CLASSES.INVALID_WORD, true);
      input.focus();
    }
  }

  scrollToResult() {
    const resultDiv = getElement(SELECTORS.SHARES_RESULT) || getElement(SELECTORS.RECOVER_RESULT);
    if (resultDiv) resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
      const isActiveInRecover = recoverInput && document.activeElement === recoverInput;
      const recoverBtnEl = getElement(SELECTORS.RECOVER_BTN);
      if (isActiveInRecover && recoverBtnEl && !recoverBtnEl.disabled) {
        this.handleRecoverMnemonic();
      } else if (!isActiveInRecover) {
        this.handleGenerateShares();
      }
    }
    if (e.key === 'Escape') this.shareManager.hideAllAlerts();
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
  try { app = new MnemonicSplitApp(); } catch (_) {}
}

function bindGlobalFunctions() {
  window.setWordCount = (count) => app && app.setWordCount(count);
  window.generateShares = () => app && app.handleGenerateShares();
  window.copyShare = (button, shareContent) => app && app.shareManager.copyShare(button, shareContent);
  window.downloadShare = (shareContent, shareIndex) => app && app.shareManager.downloadShare(shareContent, shareIndex);
  window.recoverMnemonic = () => app && app.handleRecoverMnemonic();
  window.validateShares = () => app && app.recoveryTabManager && app.recoveryTabManager.validateCurrentTab();

  // ✅ expose SLIP-39 helpers if you need them globally
  window.generateSlip39 = () => app && app.handleGenerateSlip39();
  window.recoverSlip39 = () => app && app.handleRecoverSlip39();
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  bindGlobalFunctions();
});

window.addEventListener('beforeunload', () => { if (app) app.destroy(); });

if (typeof window !== 'undefined') {
  window.MnemonicSplitApp = MnemonicSplitApp;
  window.app = app;
}

// Register service worker
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL : '/';
    const swUrl = base.replace(/\/$/, '') + '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}
