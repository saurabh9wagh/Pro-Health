const logger = require('../utils/logger');

/**
 * BasePage
 * --------
 * Parent class for every Page Object. Centralizes common browser
 * interactions (navigation, waits, typing, clicking, assertions helpers)
 * so individual page objects stay small and focused on their own locators.
 *
 * Usage:
 *   class LoginPage extends BasePage {
 *     constructor(page) {
 *       super(page);
 *       this.usernameInput = page.locator('#user-name');
 *     }
 *   }
 *
 * All wait/interaction methods accept either a Locator or a string selector,
 * so callers can pass `this.usernameInput` or '#user-name' interchangeably.
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.logger = logger;
  }

  /** Resolve a Locator or selector string into a Locator. */
  _toLocator(target) {
    return typeof target === 'string' ? this.page.locator(target) : target;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async navigate(url, { waitUntil = 'domcontentloaded' } = {}) {
    this.logger.info(`Navigating to ${url}`);
    await this.page.goto(url, { waitUntil });
  }

  async reload() { await this.page.reload(); }
  async goBack()  { await this.page.goBack(); }

  async waitForLoadState(state = 'networkidle') {
    await this.page.waitForLoadState(state);
  }

  async getTitle() { return this.page.title(); }
  async getUrl()   { return this.page.url(); }

  // ---------------------------------------------------------------------------
  // Element waits
  // ---------------------------------------------------------------------------

  async waitForElement(target, { state = 'visible', timeout = 10_000 } = {}) {
    await this._toLocator(target).waitFor({ state, timeout });
  }

  async waitForHidden(target, timeout = 10_000) {
    await this._toLocator(target).waitFor({ state: 'hidden', timeout });
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  async click(target, { timeout = 10_000 } = {}) {
    const locator = this._toLocator(target);
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click();
  }

  async fill(target, value, { timeout = 10_000 } = {}) {
    const locator = this._toLocator(target);
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(value);
  }

  async type(target, value, { delay = 50 } = {}) {
    await this._toLocator(target).pressSequentially(value, { delay });
  }

  async selectOption(target, value) { await this._toLocator(target).selectOption(value); }
  async check(target)               { await this._toLocator(target).check(); }
  async uncheck(target)             { await this._toLocator(target).uncheck(); }
  async hover(target)               { await this._toLocator(target).hover(); }
  async press(target, key)          { await this._toLocator(target).press(key); }

  async uploadFile(target, filePath) {
    await this._toLocator(target).setInputFiles(filePath);
  }

  // ---------------------------------------------------------------------------
  // Reads / state queries
  // ---------------------------------------------------------------------------

  async getText(target) {
    return (await this._toLocator(target).textContent())?.trim() || '';
  }

  async getInputValue(target)         { return this._toLocator(target).inputValue(); }
  async getAttribute(target, name)    { return this._toLocator(target).getAttribute(name); }
  async isVisible(target)             { return this._toLocator(target).isVisible(); }
  async isEnabled(target)             { return this._toLocator(target).isEnabled(); }
  async count(target)                 { return this._toLocator(target).count(); }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  async screenshot(name) {
    const path = `reports/test-output/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.logger.info(`Screenshot saved: ${path}`);
    return path;
  }

  async scrollIntoView(target) {
    await this._toLocator(target).scrollIntoViewIfNeeded();
  }

  async waitForResponse(urlPattern, { timeout = 15_000 } = {}) {
    return this.page.waitForResponse(urlPattern, { timeout });
  }

  // ---------------------------------------------------------------------------
  // Angular / SPA helpers
  // ---------------------------------------------------------------------------

  /**
   * Dismiss the cookie / consent banner if present.
   * Silently no-ops if the banner is not visible.
   */
  async dismissCookieBanner() {
    try {
      // ProHealth uses .cookie-toast with a "Got it" button.
      // OneTrust selectors kept as fallback for other environments.
      const banner = this.page.locator(
        '.cookie-toast button, ' +
        'button:has-text("Got it"), ' +
        '#onetrust-accept-btn-handler, ' +
        'button:has-text("Accept All"), ' +
        'button:has-text("Accept all cookies"), ' +
        'button:has-text("Accept Cookies"), ' +
        '.cookie-banner button, ' +
        '[class*="cookie"] button[class*="accept"], ' +
        '[class*="consent"] button[class*="accept"]'
      ).first();
      await banner.waitFor({ state: 'visible', timeout: 1_500 });
      await banner.click();
      this.logger.info('Cookie banner dismissed');
    } catch {
      // Banner not present — expected in most tests
    }
  }

  /**
   * Fill an Angular reactive-form input correctly.
   * Plain fill() bypasses Angular change detection; dispatching native
   * input + change + blur events triggers validators and ngModel updates.
   */
  async fillAngularInput(target, value) {
    const locator = this._toLocator(target);
    await locator.waitFor({ state: 'visible', timeout: 10_000 });
    await locator.fill(value);
    await locator.dispatchEvent('input');
    await locator.dispatchEvent('change');
    await locator.dispatchEvent('blur');
  }

  /**
   * Wait for Angular to finish pending async work.
   * Uses domcontentloaded + a short settling delay.
   */
  async waitForAngular() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for a p-toast success message to appear and return its text.
   * @param {number} [timeout=10000]
   * @returns {Promise<string>}
   */
  async waitForSuccessToast(timeout = 10_000) {
    const toast = this.page
      .locator('p-toast .p-toast-message.p-toast-message-success, p-toast .p-message-success')
      .first();
    await toast.waitFor({ state: 'visible', timeout });
    const text = (await toast.textContent())?.trim() || '';
    this.logger.info(`Toast: ${text}`);
    return text;
  }
}

module.exports = { BasePage };
