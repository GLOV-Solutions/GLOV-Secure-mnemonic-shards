/**
 * MnemonicShards - 主应用文件
 * 重构后的主文件，使用组件化架构提高可维护性
 */

import { MnemonicInput } from './components/MnemonicInput.js';
import { ShareManager } from './components/ShareManager.js';
import { RecoveryTabManager } from './components/RecoveryTabManager.js';
import { getElement, addEvent, toggleElement, toggleClass } from './utils/dom.js';
import { APP_CONFIG, MNEMONIC_CONFIG, SELECTORS, CSS_CLASSES } from './constants/index.js';
import { i18n } from './utils/i18n.js';
import { LANGUAGES } from './constants/i18n.js';

/**
 * 主应用类
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
   * 初始化应用
   */
  init() {
    this.setupEventListeners();
    this.setupLanguageSwitcher();
    this.updateThresholdOptions();
    this.setInitialState();
    this.shareManager.initEncryptionListeners(); // 初始化加密监听器（现在是空方法）
    i18n.init();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 助记词数量切换
    const words12Btn = getElement('#words12');
    const words24Btn = getElement('#words24');

    if (words12Btn) {
      addEvent(words12Btn, 'click', () => this.setWordCount(12));
    }
    if (words24Btn) {
      addEvent(words24Btn, 'click', () => this.setWordCount(24));
    }

    // 分片配置变更
    const totalSharesSelect = getElement(SELECTORS.TOTAL_SHARES);
    if (totalSharesSelect) {
      addEvent(totalSharesSelect, 'change', () => this.updateThresholdOptions());
    }

    // 生成分片按钮
    const generateBtn = getElement(SELECTORS.GENERATE_BTN);
    if (generateBtn) {
      addEvent(generateBtn, 'click', () => this.handleGenerateShares());
    }

    // 恢复功能 - 现在由RecoveryTabManager处理
    const recoverBtn = getElement(SELECTORS.RECOVER_BTN);

    if (recoverBtn) {
      addEvent(recoverBtn, 'click', (e) => {
        this.handleRecoverMnemonic();
      });
    }

    // 键盘快捷键
    addEvent(document, 'keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  /**
   * 设置语言切换器
   */
  setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.language-btn');

    langButtons.forEach((button) => {
      const lang = button.getAttribute('data-lang');

      addEvent(button, 'click', (e) => {
        e.preventDefault();
        if (lang === LANGUAGES.EN || lang === LANGUAGES.ZH) {
          this.switchLanguage(lang);
        }
      });
    });

    // 监听语言变化
    i18n.addListener((lang) => {
      this.updateLanguageUI(lang);
      this.updateDynamicContent();
    });

    // 初始化语言UI
    this.updateLanguageUI(i18n.getCurrentLanguage());
  }

  /**
   * 切换语言
   * @param {string} language - 语言代码
   */
  switchLanguage(language) {
    i18n.setLanguage(language);
  }

  /**
   * 更新语言UI
   * @param {string} language - 语言代码
   */
  updateLanguageUI(language) {
    const langButtons = document.querySelectorAll('.language-btn');

    langButtons.forEach((button) => {
      const buttonLang = button.getAttribute('data-lang');
      if (buttonLang === language) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * 更新动态内容
   */
  updateDynamicContent() {
    // 更新select选项
    this.updateThresholdOptions();
    this.updateTotalSharesOptions();

    // 更新placeholder属性
    this.updatePlaceholders();

    // 更新助记词输入框的placeholder
    this.updateWordInputPlaceholders();
  }

  /**
   * 更新分片数量选项
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
      optionElement.textContent = i18n.t('sharesOption', parseInt(option.value));

      if (option.value === currentValue) {
        optionElement.selected = true;
      }

      totalSharesSelect.appendChild(optionElement);
    });
  }

  /**
   * 更新placeholder属性
   */
  updatePlaceholders() {
    const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
    if (recoverInput) {
      const placeholderKey = recoverInput.getAttribute('data-i18n-placeholder');
      if (placeholderKey) {
        recoverInput.placeholder = i18n.t(placeholderKey);
      }
    }
  }

  /**
   * 更新助记词输入框的placeholder
   */
  updateWordInputPlaceholders() {
    for (let i = 1; i <= this.currentWordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (input) {
        input.placeholder = '';
      }
    }
  }

  /**
   * 设置初始状态
   */
  setInitialState() {
    this.updateWordCountButtons();
    this.mnemonicInput.renderInputs(); // 初始化输入框
    this.shareManager.hideAllAlerts();
  }

  /**
   * 设置助记词数量
   * @param {number} count - 助记词数量
   */
  setWordCount(count) {
    if (!MNEMONIC_CONFIG.WORD_COUNTS.includes(count)) {
      return;
    }

    this.currentWordCount = count;
    this.mnemonicInput.setWordCount(count);
    this.updateWordCountButtons();
    this.shareManager.hideAllAlerts();
  }

  /**
   * 更新助记词数量按钮状态
   */
  updateWordCountButtons() {
    const words12Btn = getElement('#words12');
    const words24Btn = getElement('#words24');

    if (words12Btn) {
      toggleClass(words12Btn, CSS_CLASSES.ACTIVE, this.currentWordCount === 12);
    }
    if (words24Btn) {
      toggleClass(words24Btn, CSS_CLASSES.ACTIVE, this.currentWordCount === 24);
    }
  }

  /**
   * 更新阈值选项
   */
  updateThresholdOptions() {
    const totalSharesSelect = getElement(SELECTORS.TOTAL_SHARES);
    const thresholdSelect = getElement(SELECTORS.THRESHOLD);

    if (!totalSharesSelect || !thresholdSelect) return;

    const totalShares = parseInt(totalSharesSelect.value);
    const currentThreshold = parseInt(thresholdSelect.value);

    thresholdSelect.innerHTML = '';

    for (let i = 2; i <= totalShares; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i18n.t('sharesOption', i);

      if (i === Math.min(currentThreshold, totalShares)) {
        option.selected = true;
      }

      thresholdSelect.appendChild(option);
    }
  }

  /**
   * 处理生成分片
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

    const totalShares = parseInt(getElement(SELECTORS.TOTAL_SHARES).value);
    const threshold = parseInt(getElement(SELECTORS.THRESHOLD).value);

    const success = await this.shareManager.generateShares(validation.words, totalShares, threshold);

    if (success) {
      this.scrollToResult();
    }
  }

  /**
   * 处理恢复助记词
   */
  async handleRecoverMnemonic() {
    try {
      // 获取当前分片数据
      const shares = this.recoveryTabManager.getCurrentShares();
      const encryptionPassword = this.recoveryTabManager.getEncryptionPassword();

      if (shares.length === 0) {
        this.shareManager.showError(i18n.t('errors.noValidShares'));
        return;
      }

      // 显示处理状态
      const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
      if (recoverBtn) {
        recoverBtn.disabled = true;
        recoverBtn.textContent = i18n.t('info.recovering');
      }

      // 调用ShareManager的恢复方法，但传入自定义数据
      const success = await this.shareManager.recoverMnemonicWithShares(shares, encryptionPassword);

      if (success) {
        this.scrollToResult();
      }
    } catch (error) {
      this.shareManager.showError(i18n.t('errors.recoveryFailed') + error.message);
    } finally {
      // 恢复按钮状态
      const recoverBtn = getElement(SELECTORS.RECOVER_BTN);
      if (recoverBtn) {
        recoverBtn.disabled = false;
        recoverBtn.textContent = i18n.t('recoverBtn');
      }
    }
  }

  /**
   * 聚焦到无效输入框
   * @param {number} index - 输入框索引
   */
  focusInvalidInput(index) {
    const input = getElement(SELECTORS.WORD_INPUT(index));
    if (input) {
      toggleClass(input, CSS_CLASSES.INVALID_WORD, true);
      input.focus();
    }
  }

  /**
   * 滚动到结果区域
   */
  scrollToResult() {
    const resultDiv = getElement(SELECTORS.SHARES_RESULT) || getElement(SELECTORS.RECOVER_RESULT);
    if (resultDiv) {
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 处理键盘快捷键
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter 生成分片或恢复助记词
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();

      const recoverSection = getElement('.recover-section');
      const recoverInput = getElement(SELECTORS.RECOVER_INPUT);
      const isActiveInRecover = recoverInput && document.activeElement === recoverInput;

      if (isActiveInRecover && !getElement(SELECTORS.RECOVER_BTN).disabled) {
        this.handleRecoverMnemonic();
      } else if (!isActiveInRecover) {
        this.handleGenerateShares();
      }
    }

    // ESC 清除所有提示
    if (e.key === 'Escape') {
      this.shareManager.hideAllAlerts();
    }
  }

  /**
   * 获取应用信息
   * @returns {Object} 应用信息
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
   * 销毁应用，清理资源
   */
  destroy() {
    this.mnemonicInput.destroy();
    this.shareManager.destroy();
    if (this.recoveryTabManager) {
      this.recoveryTabManager.destroy();
    }
  }
}

// 创建全局应用实例
let app;

/**
 * 初始化应用
 */
function initApp() {
  try {
    app = new MnemonicSplitApp();
  } catch (error) {
    // 静默处理初始化错误
  }
}

/**
 * 安全的函数绑定到全局作用域
 * 用于内联事件处理器
 */
function bindGlobalFunctions() {
  window.setWordCount = (count) => {
    if (app) {
      app.setWordCount(count);
    }
  };

  window.generateShares = () => {
    if (app) {
      app.handleGenerateShares();
    }
  };

  window.copyShare = (button, shareContent) => {
    if (app) {
      app.shareManager.copyShare(button, shareContent);
    }
  };

  window.downloadShare = (shareContent, shareIndex) => {
    if (app) {
      app.shareManager.downloadShare(shareContent, shareIndex);
    }
  };

  window.recoverMnemonic = () => {
    if (app) {
      app.handleRecoverMnemonic();
    }
  };

  window.validateShares = () => {
    if (app && app.recoveryTabManager) {
      app.recoveryTabManager.validateCurrentTab();
    }
  };
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  bindGlobalFunctions();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

// 导出应用实例（用于调试）
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
    const base = (typeof import !== 'undefined' && import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
    const swUrl = base.replace(/\/$/, '') + '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}
