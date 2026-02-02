/**
 * Internationalization (i18n) Manager
 * Handles language switching and text translation
 */

import {
  LANGUAGES,
  TRANSLATIONS,
  DEFAULT_LANGUAGE,
  LANGUAGE_NAMES
} from '../constants/i18n.js';

/**
 * Internationalization Manager class
 */
export class I18nManager {
  constructor() {
    this.currentLanguage = this.loadLanguageFromStorage() || DEFAULT_LANGUAGE;
    this.listeners = [];
  }

  /**
   * Load language preference from local storage
   * @returns {string} Language code
   */
  loadLanguageFromStorage() {
    try {
      return localStorage.getItem('mnemonicShards_language');
    } catch {
      return null;
    }
  }

  /**
   * Save language preference to local storage
   * @param {string} language - Language code
   */
  saveLanguageToStorage(language) {
    try {
      localStorage.setItem('mnemonicShards_language', language);
    } catch {
      // Silently ignore storage errors
    }
  }

  /**
   * Get current language code
   * @returns {string} Current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Set the current language
   * @param {string} language - Language code
   */
  setLanguage(language) {
    if (!Object.values(LANGUAGES).includes(language)) {
      return;
    }

    this.currentLanguage = language;
    this.saveLanguageToStorage(language);
    this.updatePageLanguage();
    this.updateAllElements();
    this.notifyListeners();
  }

  /**
   * Translate a key
   * @param {string} key - Translation key
   * @param {...any} params - Parameters for interpolated translations
   * @returns {string} Translated text
   */
  t(key, ...params) {
    const translations = TRANSLATIONS[this.currentLanguage];
    const translation = this.getNestedValue(translations, key);

    if (typeof translation === 'function') {
      return translation(...params);
    }

    if (translation === undefined) {
      // Fallback to English
      const fallback = this.getNestedValue(TRANSLATIONS[LANGUAGES.EN], key);
      if (typeof fallback === 'function') {
        return fallback(...params);
      }
      return fallback || key;
    }

    return translation;
  }

  /**
   * Safely get a nested value from an object
   * @param {object} obj - Target object
   * @param {string} path - Path (e.g. "errors.fillAllWords")
   * @returns {any} Value if found, otherwise undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Add a listener for language changes
   * @param {Function} listener - Listener callback
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   * @param {Function} listener - Listener callback
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of a language change
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentLanguage);
      } catch {
        // Silently handle listener errors
      }
    });
  }

  /**
   * Update the <html> lang attribute
   */
  updatePageLanguage() {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('lang', this.currentLanguage === LANGUAGES.ZH ? 'zh-CN' : 'en');
  }

  /**
   * Update all elements with data-i18n attributes
   */
  updateAllElements() {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);

      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.type === 'submit' || element.type === 'button') {
          element.value = translation;
        } else {
          element.placeholder = translation;
        }
      } else {
        element.innerHTML = translation;
      }
    });

    // Update elements with data-i18n-placeholder
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      element.placeholder = translation;
    });
  }

  /**
   * Switch to a specific language
   * @param {string} language - Language code
   */
  switchTo(language) {
    this.setLanguage(language);
  }

  /**
   * Toggle between available languages
   */
  toggleLanguage() {
    const newLanguage = this.currentLanguage === LANGUAGES.EN ? LANGUAGES.ZH : LANGUAGES.EN;
    this.switchTo(newLanguage);
  }

  /**
   * Get all available languages
   * @returns {Array} Array of language options
   */
  getAvailableLanguages() {
    return Object.values(LANGUAGES).map((code) => ({
      code,
      name: LANGUAGE_NAMES[code],
      isCurrent: code === this.currentLanguage,
    }));
  }

  /**
   * Initialize i18n system
   */
  init() {
    this.updatePageLanguage();
    this.updateAllElements();
  }
}

// Create a global instance
export const i18n = new I18nManager();

// Export helper functions
export const t = (key, ...params) => i18n.t(key, ...params);
export const setLanguage = (language) => i18n.setLanguage(language);
export const getCurrentLanguage = () => i18n.getCurrentLanguage();
export const toggleLanguage = () => i18n.toggleLanguage();
