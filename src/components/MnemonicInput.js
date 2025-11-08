/**
 * Mnemonic input component: renders inputs, suggestions, and validation.
 * Provides duplicate detection and mobile/desktop autocomplete behavior.
 */

import { getElement, createElement, toggleElement, toggleClass, addEvent, clearElement } from '../utils/dom.js';
import { isValidBIP39Word } from '../utils/validation.js';
import { debounce, isMobile } from '../utils/helpers.js';
import { BIP39_WORDLIST } from '../constants/bip39-words.js';
import { UI_CONFIG, SELECTORS, CSS_CLASSES } from '../constants/index.js';
import { t } from '../utils/i18n.js';

export class MnemonicInput {
  constructor(wordCount = 12) {
    this.wordCount = wordCount;
    this.autocompleteTimeouts = new Map();
    this.suggestionCache = new Map();

    // Lazy-load i18n and re-render on language change
    import('../utils/i18n.js').then(({ i18n }) => {
      i18n.addListener(() => {
        this.renderInputs();
      });
    });
  }

  /**
   * Set total mnemonic word count.
   * @param {number} count - Number of words (12 or 24)
   */
  setWordCount(count) {
    this.wordCount = count;
    this.renderInputs();
  }

  /** Render input fields for the current word count. */
  renderInputs() {
    const container = getElement(SELECTORS.WORDS_GRID);
    if (!container) return;

    // Preserve any existing values before re-rendering the inputs
    const currentValues = new Map();
    for (let i = 1; i <= this.wordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (input && input.value.trim()) {
        currentValues.set(i, input.value.trim());
      }
    }

    clearElement(container);

    for (let i = 1; i <= this.wordCount; i++) {
      const wordInput = this.createWordInput(i);
      container.appendChild(wordInput);

      // Restore previously entered word if present
      if (currentValues.has(i)) {
        const input = getElement(SELECTORS.WORD_INPUT(i));
        if (input) {
          input.value = currentValues.get(i);
          // Validate and style the restored value
          this.validateAndStyleInput(input, i);
        }
      }
    }
  }

  /**
   * Create a single word input field.
   * @param {number} index - 1-based word position
   * @returns {Element}
   */
  createWordInput(index) {
    const wrapper = createElement('div', ['word-input']);

    const inputContainer = createElement('div', ['input-wrapper']);

    const input = createElement('input', [], {
      type: 'text',
      id: `word${index}`,
      placeholder: '',
      autocomplete: 'off',
    });

    const label = createElement('label', [], {
      for: `word${index}`,
    });
    label.textContent = t('wordLabel', index);

    const suggestionsDiv = createElement('div', ['autocomplete-suggestions'], {
      id: `suggestions${index}`,
    });

    inputContainer.appendChild(input);
    inputContainer.appendChild(label);
    inputContainer.appendChild(suggestionsDiv);
    wrapper.appendChild(inputContainer);

    this.attachInputListeners(input, index);

    return wrapper;
  }

  /**
   * Attach event listeners for input, blur, and focus.
   * @param {Element} input
   * @param {number} index
   */
  attachInputListeners(input, index) {
    const debouncedHandler = debounce(() => {
      this.handleInputChange(input, index);
    }, UI_CONFIG.DELAY.DEBOUNCE);

    addEvent(input, 'input', debouncedHandler);

    addEvent(input, 'blur', () => {
      setTimeout(() => {
        this.validateAndStyleInput(input, index);
        this.hideSuggestions(index);
      }, UI_CONFIG.DELAY.BLUR_DELAY);
    });

    addEvent(input, 'focus', (e) => {
      if (e.target.value.trim().length > 0) {
        this.handleInputChange(input, index);
      }
    });
  }

  /**
   * Debounced input handler for autocomplete and duplicate checks.
   * @param {Element} input
   * @param {number} index
   */
  handleInputChange(input, index) {
    const value = input.value.trim().toLowerCase();

    // Clear any pending autocomplete timeout before scheduling a new one
    this.clearAutocompleteTimeout(index);

    if (value.length === 0) {
      this.hideSuggestions(index);
      this.checkForDuplicateWords();
      return;
    }

    // Show suggestions and check duplicates
    this.showSuggestions(value, index);
    this.checkForDuplicateWords();
  }

  /**
   * Validate a word and apply success/error styles.
   * @param {Element} input
   * @param {number} index
   */
  validateAndStyleInput(input, index) {
    const value = input.value.trim();

    if (value.length === 0) {
      toggleClass(input, CSS_CLASSES.VALID_WORD, false);
      toggleClass(input, CSS_CLASSES.INVALID_WORD, false);
      return;
    }

    if (isValidBIP39Word(BIP39_WORDLIST, value)) {
      toggleClass(input, CSS_CLASSES.INVALID_WORD, false);
      toggleClass(input, CSS_CLASSES.VALID_WORD, true);
    } else {
      toggleClass(input, CSS_CLASSES.VALID_WORD, false);
      toggleClass(input, CSS_CLASSES.INVALID_WORD, true);
      input.value = '';
      this.showInvalidWordError(index);
    }

    this.checkForDuplicateWords();
  }

  /**
   * Display and auto-hide invalid-word alert.
   * @param {number} index
   */
  showInvalidWordError(index) {
    const errorAlert = getElement(SELECTORS.INPUT_ERROR_ALERT);
    if (errorAlert) {
      errorAlert.textContent = t('errors.invalidWordCleared', index);
      toggleElement(errorAlert, true);

      setTimeout(() => {
        toggleElement(errorAlert, false);
      }, UI_CONFIG.DELAY.AUTO_HIDE_ALERT);
    }
  }

  /**
   * Search the BIP39 word list by prefix.
   * @param {string} query
   * @returns {string[]}
   */
  searchWords(query) {
    if (!query || query.length === 0) {
      return [];
    }

    // Cache hit
    if (this.suggestionCache.has(query)) {
      return this.suggestionCache.get(query);
    }

    const matches = BIP39_WORDLIST.filter((word) => word.toLowerCase().startsWith(query)).slice(0, UI_CONFIG.SUGGESTIONS.MAX_SUGGESTIONS);

    // Cache store
    this.suggestionCache.set(query, matches);

    return matches;
  }

  /**
   * Show autocomplete suggestions for a word index.
   * @param {string} query
   * @param {number} wordIndex
   */
  showSuggestions(query, wordIndex) {
    const suggestions = this.searchWords(query);
    const suggestionsDiv = getElement(SELECTORS.SUGGESTIONS(wordIndex));

    if (!suggestionsDiv || suggestions.length === 0) {
      this.hideSuggestions(wordIndex);
      return;
    }

    clearElement(suggestionsDiv);
    suggestionsDiv.style.display = 'block';

    this.positionSuggestions(suggestionsDiv, wordIndex);
    this.renderSuggestionItems(suggestionsDiv, suggestions, wordIndex);
  }

  /**
   * Position suggestions container (mobile vs desktop).
   * @param {Element} suggestionsDiv
   * @param {number} wordIndex
   */
  positionSuggestions(suggestionsDiv, wordIndex) {
    const input = getElement(SELECTORS.WORD_INPUT(wordIndex));
    if (!input) return;

    const mobile = isMobile();

    if (mobile) {
      // Mobile: fixed bottom suggestions tray
      Object.assign(suggestionsDiv.style, {
        position: 'fixed',
        top: 'auto',
        bottom: UI_CONFIG.SUGGESTIONS.MOBILE_BOTTOM_OFFSET,
        left: '10px',
        right: '10px',
        width: 'calc(100% - 20px)',
        zIndex: '99999',
        background: 'rgba(0, 0, 0, 0.95)',
        padding: '12px',
        borderRadius: '12px',
        textAlign: 'center',
      });
    } else {
      const containerRect = input.closest('.words-grid').getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const inputRelativeLeft = inputRect.left - containerRect.left;
      const containerWidth = containerRect.width;
      const isNearRightEdge = inputRelativeLeft > containerWidth * 0.6;

      // Desktop: positioned below input (RTL-aware)
      Object.assign(suggestionsDiv.style, {
        position: 'absolute',
        top: '100%',
        zIndex: '99999',
        background: 'transparent',
        padding: '8px 0 0 0',
        textAlign: isNearRightEdge ? 'right' : 'left',
      });
    }
  }

  /**
   * Render clickable suggestion items.
   * @param {Element} container
   * @param {string[]} suggestions
   * @param {number} wordIndex
   */
  renderSuggestionItems(container, suggestions, wordIndex) {
    const suggestionsContainer = createElement('div', ['suggestions-container']);
    const mobile = isMobile();

    if (mobile) {
      Object.assign(suggestionsContainer.style, {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        maxHeight: UI_CONFIG.SUGGESTIONS.MOBILE_MAX_HEIGHT,
        overflowY: 'auto',
        webkitOverflowScrolling: 'touch',
      });
    } else {
      const input = getElement(SELECTORS.WORD_INPUT(wordIndex));
      const containerRect = input.closest('.words-grid').getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const inputRelativeLeft = inputRect.left - containerRect.left;
      const containerWidth = containerRect.width;
      const isNearRightEdge = inputRelativeLeft > containerWidth * 0.6;

      Object.assign(suggestionsContainer.style, {
        display: 'flex',
        gap: '6px',
        justifyContent: isNearRightEdge ? 'flex-end' : 'flex-start',
        flexWrap: 'nowrap',
        alignItems: 'center',
      });
    }

    suggestions.forEach((word) => {
      const suggestionItem = this.createSuggestionItem(word, wordIndex, mobile);
      suggestionsContainer.appendChild(suggestionItem);
    });

    container.appendChild(suggestionsContainer);
  }

  /**
   * Create one suggestion pill/button.
   * @param {string} word
   * @param {number} wordIndex
   * @param {boolean} mobile
   * @returns {Element}
   */
  createSuggestionItem(word, wordIndex, mobile) {
    const item = createElement('div', ['suggestion-item']);
    item.textContent = word;

    const mobileStyles = {
      fontSize: '14px',
      padding: '8px 14px',
      background: '#00584a',
      color: 'white',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      userSelect: 'none',
      webkitUserSelect: 'none',
    };

    const desktopStyles = {
      padding: '6px 12px',
      fontSize: '0.85rem',
      whiteSpace: 'nowrap',
      flexShrink: '0',
      color: 'white',
      fontWeight: '500',
      borderRadius: '6px',
      background: '#00584a',
    };

    Object.assign(item.style, mobile ? mobileStyles : desktopStyles);

    addEvent(item, 'click', () => this.selectWord(word, wordIndex));

    return item;
  }

  /**
   * Apply the selected suggestion into the input.
   * @param {string} word
   * @param {number} wordIndex
   */
  selectWord(word, wordIndex) {
    const input = getElement(SELECTORS.WORD_INPUT(wordIndex));
    if (!input) return;

    input.value = word;
    toggleClass(input, CSS_CLASSES.INVALID_WORD, false);
    toggleClass(input, CSS_CLASSES.VALID_WORD, true);

    // Hide suggestions and re-check for duplicates
    this.hideSuggestions(wordIndex);
    this.checkForDuplicateWords();

    if (wordIndex < this.wordCount) {
      const nextInput = getElement(SELECTORS.WORD_INPUT(wordIndex + 1));
      nextInput?.focus();
    }
  }

  /** Hide and clear the suggestions container. */
  hideSuggestions(wordIndex) {
    const suggestionsDiv = getElement(SELECTORS.SUGGESTIONS(wordIndex));
    if (suggestionsDiv) {
      toggleElement(suggestionsDiv, false);
      clearElement(suggestionsDiv);
    }
  }

  /** Detect duplicate words and update UI hints. */
  checkForDuplicateWords() {
    const words = [];
    const duplicates = new Set();
    const duplicatePositions = new Map();

    // Collect words and track duplicate positions
    for (let i = 1; i <= this.wordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (!input) continue;

      const word = input.value.trim().toLowerCase();
      if (word) {
        if (words.includes(word)) {
          duplicates.add(word);
          if (!duplicatePositions.has(word)) {
            duplicatePositions.set(word, []);
          }
          duplicatePositions.get(word).push(i);
        } else {
          words.push(word);
        }
      }
    }

    this.updateDuplicateAlert(duplicates, duplicatePositions);
    this.updateDuplicateStyling(duplicates);
  }

  /**
   * Render duplicate word details for the alert.
   * @param {Set<string>} duplicates
   * @param {Map<string, number[]>} duplicatePositions
   */
  updateDuplicateAlert(duplicates, duplicatePositions) {
    const duplicateAlert = getElement(SELECTORS.DUPLICATE_ALERT);
    if (!duplicateAlert) return;

    // Reset alert contents
    duplicateAlert.innerHTML = '';

    if (duplicates.size > 0) {
      // Use textContent to avoid XSS
      const strongTitle = document.createElement('strong');
      strongTitle.textContent = t('warnings.duplicateWordsDetected');
      duplicateAlert.appendChild(strongTitle);

      duplicateAlert.appendChild(document.createElement('br'));

      for (const [word, positions] of duplicatePositions) {
        const strongWord = document.createElement('strong');
        strongWord.textContent = word;
        duplicateAlert.appendChild(strongWord);

        const positionText = document.createTextNode(`: ${t('position')} ${positions.join(', ')}`);
        duplicateAlert.appendChild(positionText);

        duplicateAlert.appendChild(document.createElement('br'));
      }

      const smallNote = document.createElement('small');
      smallNote.textContent = t('warnings.uniqueWordsNote');
      duplicateAlert.appendChild(smallNote);

      toggleElement(duplicateAlert, true);
    } else {
      toggleElement(duplicateAlert, false);
    }
  }

  /**
   * Toggle duplicate styling on inputs.
   * @param {Set<string>} duplicates
   */
  updateDuplicateStyling(duplicates) {
    for (let i = 1; i <= this.wordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (!input) continue;

      const word = input.value.trim().toLowerCase();
      const isDuplicate = word && duplicates.has(word);

      toggleClass(input, CSS_CLASSES.DUPLICATE_WORD, isDuplicate);
    }
  }

  /** Clear any pending autocomplete timeout. */
  clearAutocompleteTimeout(index) {
    if (this.autocompleteTimeouts.has(index)) {
      clearTimeout(this.autocompleteTimeouts.get(index));
      this.autocompleteTimeouts.delete(index);
    }
  }

  /**
   * Collect all non-empty words in order.
   * @returns {string[]}
   */
  getWords() {
    const words = [];
    for (let i = 1; i <= this.wordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (input) {
        const word = input.value.trim();
        if (word) {
          words.push(word);
        }
      }
    }
    return words;
  }

  /**
   * Validate that all inputs are non-empty and valid BIP39 words.
   * @returns {{isValid: boolean, words: string[], hasEmpty: boolean, hasInvalidWord: boolean, invalidWordIndex: number}}
   */
  validateAllInputs() {
    const words = [];
    let hasEmpty = false;
    let hasInvalidWord = false;
    let invalidWordIndex = -1;

    for (let i = 1; i <= this.wordCount; i++) {
      const input = getElement(SELECTORS.WORD_INPUT(i));
      if (!input) continue;

      const word = input.value.trim();
      if (!word) {
        hasEmpty = true;
        break;
      }

      if (!isValidBIP39Word(BIP39_WORDLIST, word)) {
        hasInvalidWord = true;
        invalidWordIndex = i;
        break;
      }

      words.push(word);
    }

    return {
      isValid: !hasEmpty && !hasInvalidWord,
      words,
      hasEmpty,
      hasInvalidWord,
      invalidWordIndex,
    };
  }

  /** Cleanup resources and caches. */
  destroy() {
    this.autocompleteTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.autocompleteTimeouts.clear();

    this.suggestionCache.clear();
  }
}
