/**
 * DOM utility functions
 */

/**
 * Safely get a DOM element
 * @param {string} selector - CSS selector
 * @returns {Element|null} The DOM element or null
 */
export function getElement(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    return null;
  }
}

/**
 * Safely get multiple DOM elements
 * @param {string} selector - CSS selector
 * @returns {NodeList} List of DOM elements
 */
export function getElements(selector) {
  try {
    return document.querySelectorAll(selector);
  } catch (error) {
    return [];
  }
}

/**
 * Create a DOM element
 * @param {string} tagName - Tag name
 * @param {string[]} [classNames] - Array of class names
 * @param {Object} [attributes] - Attributes object
 * @returns {Element} The created DOM element
 */
export function createElement(tagName, classNames = [], attributes = {}) {
  const element = document.createElement(tagName);

  if (classNames.length > 0) {
    element.className = classNames.join(' ');
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

/**
 * Show or hide an element
 * @param {Element|string} element - DOM element or selector
 * @param {boolean} show - Whether to show the element
 */
export function toggleElement(element, show) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  el.style.display = show ? '' : 'none';
}

/**
 * Add or remove a CSS class
 * @param {Element|string} element - DOM element or selector
 * @param {string} className - Class name
 * @param {boolean} add - Whether to add the class
 */
export function toggleClass(element, className, add) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  el.classList.toggle(className, add);
}

/**
 * Set element inner HTML content
 * @param {Element|string} element - DOM element or selector
 * @param {string} content - HTML content
 */
export function setHTML(element, content) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  el.innerHTML = content;
}

/**
 * Set element text content
 * @param {Element|string} element - DOM element or selector
 * @param {string} text - Text content
 */
export function setText(element, text) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  el.textContent = text;
}

/**
 * Clear element content
 * @param {Element|string} element - DOM element or selector
 */
export function clearElement(element) {
  setHTML(element, '');
}

/**
 * Add an event listener to an element
 * @param {Element|string} element - DOM element or selector
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 * @param {Object} [options] - Event options
 */
export function addEvent(element, event, handler, options = {}) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  el.addEventListener(event, handler, options);
}

/**
 * Remove an event listener from an element
 * @param {Element|string} element - DOM element or selector
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 */
export function removeEvent(element, event, handler) {
  const el = typeof element === 'string' ? getElement(element) : element;
  if (!el) return;

  el.removeEventListener(event, handler);
}
