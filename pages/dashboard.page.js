const { BasePage } = require('./base.page');

class DashboardPage extends BasePage {
  constructor(page) {
    super(page);

    // Cookie consent banner
    this.cookieBanner = page.locator('.cookie-toast');
    this.cookieAcceptBtn = page.getByRole('button', { name: /got it/i });

    // Welcome section
    this.welcomeTitle = page.locator('.dashboard__hero-title');
    this.welcomeSub = page.locator('.dashboard__hero-sub');

    // Metric cards (.metric-card articles — 4 on the dashboard)
    this.metricCards = page.locator('.metric-card');

    // Order Status panel
    this.orderPanel = page.locator('.panel', { hasText: 'Order Status' });
    this.orderPanelTitle = this.orderPanel.locator('.panel__title');
    this.orderPanelSub = this.orderPanel.locator('.panel__sub');
    this.orderItems = this.orderPanel.locator('.order-item');
    this.orderViewAllBtn = this.orderPanel.getByRole('button', { name: /view all/i });

    // Patient Statistics panel
    this.statsPanel = page.locator('.panel', { hasText: 'Patient Statistics' });

    // Global search
    this.searchInput = page.locator('input[placeholder*="Search" i]');

    // Header controls
    this.notificationsBtn = page.getByRole('button', { name: /notifications/i });
    this.avatarTrigger = page.locator('button.ph-avatar-trigger');
    this.avatarName = page.locator('.ph-avatar-trigger__name');
    this.avatarHandle = page.locator('.ph-avatar-trigger__handle');
  }

  async open(baseUrl) {
    await this.navigate(`${baseUrl}/app`, { waitUntil: 'commit' });
    await this.waitForElement(this.welcomeTitle, { timeout: 60_000 });
  }

  /** Dismiss the cookie consent banner if it's visible. */
  async dismissCookieBanner() {
    const visible = await this.cookieBanner.isVisible().catch(() => false);
    if (visible) {
      await this.click(this.cookieAcceptBtn);
      await this.waitForHidden(this.cookieBanner, 5_000).catch(() => {});
      this.logger.info('Cookie banner dismissed');
    }
  }

  /** Returns { title, value, trend } for every metric card on the page. */
  async getMetricCards() {
    const count = await this.metricCards.count();
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this.metricCards.nth(i);
      const title = (await card.locator('.metric-card__title').textContent())?.trim() || '';
      const value = (await card.locator('.metric-card__value').textContent())?.trim() || '';
      const trend = await card.locator('.metric-card__trend').textContent().catch(() => '');
      cards.push({ title, value: Number(value) || value, trend: trend?.trim() });
    }
    return cards;
  }

  /** Returns { name, tag } for every order item in the Order Status panel. */
  async getOrderItems() {
    const count = await this.orderItems.count();
    const items = [];
    for (let i = 0; i < count; i++) {
      const item = this.orderItems.nth(i);
      const name = (await item.locator('.order-item__name').textContent())?.trim() || '';
      const tag = (await item.locator('.order-item__tag').textContent())?.trim() || '';
      items.push({ name, tag });
    }
    return items;
  }

  /** Click the approve action on the Nth order item (0-based). */
  async approveOrder(index = 0) {
    await this.orderItems.nth(index).getByRole('button', { name: /approve/i }).click();
  }

  /** Click the reject action on the Nth order item (0-based). */
  async rejectOrder(index = 0) {
    await this.orderItems.nth(index).getByRole('button', { name: /reject/i }).click();
  }

  async search(query) {
    await this.fill(this.searchInput, query);
    this.logger.info(`Searched for "${query}"`);
  }

  async openUserMenu() {
    await this.click(this.avatarTrigger);
  }
}

module.exports = { DashboardPage };
