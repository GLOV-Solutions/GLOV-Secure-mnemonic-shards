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
import { generateMnemonicWords } from './utils/mnemonic.js';

/**
 * Returns true if WebCrypto (crypto.subtle) is available in a secure context.
 * On ESP32 served over HTTP, this is typically false.
 */
function canUseWebCrypto() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    typeof globalThis !== 'undefined' &&
    !!globalThis.crypto &&
    !!globalThis.crypto.subtle
  );
}

// Polyfill for crypto.randomUUID (older engines or injected contexts)
// Safe v4 UUID using crypto.getRandomValues; no inline code (CSP-friendly)
(() => {
  try {
    if (
      typeof crypto !== 'undefined' &&
      !crypto.randomUUID &&
      crypto.getRandomValues // guard: only if available
    ) {
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

    // i18n first (so messages can be translated)
    i18n.init();

    // Encryption listeners inside ShareManager (kept)
    this.shareManager.initEncryptionListeners();
    this.updateSeedGenerationUI();

    // Hard-disable encryption UI when WebCrypto isn't available (HTTP on ESP32)
    this.disableEncryptionUIIfNeeded();
  }

  /**
   * Disable encryption UI if WebCrypto isn't available.
   * This prevents runtime crashes in HTTP contexts (ESP32).
   */
  disableEncryptionUIIfNeeded() {
    if (canUseWebCrypto()) return;

    const enableEncryptionCheckbox = getElement(SELECTORS.ENABLE_ENCRYPTION);
    const encryptionFields = getElement(SELECTORS.ENCRYPTION_FIELDS);

    if (enableEncryptionCheckbox) {
      enableEncryptionCheckbox.checked = false;
      enableEncryptionCheckbox.disabled = true;
    }

    if (encryptionFields) {
      toggleElement(encryptionFields, false);
    }

    // Inform user (best-effort, doesn't break if missing translation)
    if (this.shareManager && typeof this.shareManager.showInfo === 'function') {
      this.shareManager.showInfo(
        i18n.t('encryption.requiresHttps') ||
          'Encryption is disabled on HTTP. Use HTTPS (secure context) to enable it.'
      );
    }
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

    // Generate shares
    const generateBtn = getElement(SELECTORS.GENERATE_BTN);
    if (generateBtn) {
      addEvent(generateBtn, 'click', () => this.handleGenerateShares());
    }

    // Generate mnemonic seed
    const generateSeedBtn = getElement(SELECTORS.GENERATE_SEED_BTN);
    if (generateSeedBtn) {
      addEvent(generateSeedBtn, 'click', () => this.handleGenerateSeed());
    }

    // Recover mnemonic
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
    if (recoverBtn) {
      addEvent(recoverBtn, 'click', () => this.handleRecoverMnemonic());
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

    // Optional: event delegation for share action buttons
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
        if (lang === LANGUAGES.EN || lang === LANGUAGES.FR) {
          this.switchLanguage(lang);
        }
      });
    });

    i18n.addListener((lang) => {
      this.updateLanguageUI(lang);
      this.updateDynamicContent();
      this.updateSeedGenerationUI();
      // Re-apply encryption UI rules after language changes (for translated message)
      this.disableEncryptionUIIfNeeded();
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

  getSeedGenerationMessages() {
    const isFrench = i18n.getCurrentLanguage && i18n.getCurrentLanguage() === LANGUAGES.FR;
    if (isFrench) {
      return {
        label: 'Generation de seed',
        button: 'Generer une seed',
        hint: 'Genere une seed BIP-39 valide, ou saisis la tienne ci-dessous.',
        autoShard: 'Generer automatiquement les shards apres la generation de la seed',
        generated: 'Seed generee avec succes. Tu peux maintenant la modifier ou generer les shards.',
        failed: 'Echec de la generation de seed. Veuillez reessayer.',
      };
    }

    return {
      label: 'Seed generation',
      button: 'Generate Seed',
      hint: 'Generate a valid BIP-39 seed phrase, or enter your own below.',
      autoShard: 'Automatically generate shards right after seed generation',
      generated: 'Seed generated successfully. You can now edit it or generate shards.',
      failed: 'Seed generation failed. Please retry.',
    };
  }

  updateSeedGenerationUI() {
    const messages = this.getSeedGenerationMessages();
    const label = getElement('#seedGenerationLabel');
    const button = getElement(SELECTORS.GENERATE_SEED_BTN);
    const hint = getElement('#seedGenerationHint');
    const autoShardLabel = getElement('#autoShardAfterSeedLabel');

    if (label) label.textContent = messages.label;
    if (button) button.textContent = messages.button;
    if (hint) hint.textContent = messages.hint;
    if (autoShardLabel) autoShardLabel.textContent = messages.autoShard;
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

    const success = await this.shareManager.generateShares(validation.words, totalShares, threshold);
    if (success) this.scrollToResult();
  }

  async handleGenerateSeed() {
    const messages = this.getSeedGenerationMessages();

    try {
      const words = generateMnemonicWords(this.currentWordCount);
      const applied = this.mnemonicInput.setWords(words);

      if (!applied) {
        this.shareManager.showError(`${messages.failed} (inputs not ready)`);
        return;
      }

      this.shareManager.showSuccess(messages.generated);

      const autoShard = getElement(SELECTORS.AUTO_SHARD_AFTER_SEED);
      if (autoShard && autoShard.checked) {
        await this.handleGenerateShares();
      }
    } catch (error) {
      const details = error && error.message ? ` ${error.message}` : '';
      this.shareManager.showError(`${messages.failed}${details}`);
      // Keep visible diagnostics for environments where the app wraps/locks intrinsics.
      console.error('Seed generation error:', error);
    }
  }

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
  window.downloadShare = (shareContent, shareIndex) => app && app.shareManager.downloadShare(shareContent, shareIndex);
  window.recoverMnemonic = () => app && app.handleRecoverMnemonic();
  window.validateShares = () => app && app.recoveryTabManager && app.recoveryTabManager.validateCurrentTab();
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  bindGlobalFunctions();
});

window.addEventListener('beforeunload', () => {
  if (app) app.destroy();
});

if (typeof window !== 'undefined') {
  window.MnemonicSplitApp = MnemonicSplitApp;
  window.app = app;
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base =
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
        ? import.meta.env.BASE_URL
        : '/';
    const swUrl = base.replace(/\/$/, '') + '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}
