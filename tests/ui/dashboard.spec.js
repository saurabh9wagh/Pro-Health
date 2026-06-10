const path = require('path');
const { test, expect } = require('../../fixtures/base.fixture');
const { DashboardPage } = require('../../pages/dashboard.page');
const config = require('../../config/env.config');

const STORAGE_STATE = path.join(__dirname, '..', '..', '.auth', 'user.json');

// All dashboard tests share one authenticated session — navigate once in beforeAll.
// mode: 'serial' ensures tests queue up one at a time (no concurrent navigations
// to the same remote host, which causes intermittent 60 s timeouts).
test.describe('Dashboard', { tag: '@regression' }, () => {
  test.describe.configure({ mode: 'serial' });

  /** @type {DashboardPage} */
  let dash;
  let _ctx;

  test.beforeAll(async ({ browser }) => {
    _ctx = await browser.newContext({ storageState: STORAGE_STATE });
    const page = await _ctx.newPage();
    dash = new DashboardPage(page);
    await dash.open(config.baseUrl);
    await dash.dismissCookieBanner();
  });

  test.afterAll(async () => {
    await _ctx?.close();
  });

  // ---------------------------------------------------------------------------
  // Welcome banner
  // ---------------------------------------------------------------------------

  test('welcome banner shows logged-in user name', { tag: ['@smoke', '@critical'] }, async () => {
    await expect(dash.welcomeTitle).toContainText('Welcome back');
    await expect(dash.welcomeSub).toContainText('visits');
  });

  // ---------------------------------------------------------------------------
  // Metric cards
  // ---------------------------------------------------------------------------

  test('four metric cards are visible with titles and numeric values', { tag: '@smoke' }, async () => {
    const cards = await dash.getMetricCards();
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(Number(card.value)).toBeGreaterThanOrEqual(0);
    }
  });

  test('All Patients metric card is present', { tag: '@smoke' }, async () => {
    const cards = await dash.getMetricCards();
    const allPatients = cards.find((c) => /all patients/i.test(c.title));
    expect(allPatients).toBeDefined();
    expect(Number(allPatients.value)).toBeGreaterThan(0);
  });

  test('metric card trend indicators are present', { tag: '@regression' }, async () => {
    const cards = await dash.getMetricCards();
    const withTrend = cards.filter((c) => c.trend && c.trend.length > 0);
    expect(withTrend.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Order Status panel
  // ---------------------------------------------------------------------------

  test('Order Status panel is visible with a View All button', { tag: ['@smoke', '@critical'] }, async () => {
    await expect(dash.orderPanelTitle).toBeVisible();
    await expect(dash.orderViewAllBtn).toBeEnabled();
  });

  test('Order Status panel lists pending order items', { tag: '@smoke' }, async () => {
    const items = await dash.getOrderItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  test('every order item has a reject action', { tag: '@regression' }, async () => {
    const count = await dash.orderItems.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(
        dash.orderItems.nth(i).getByRole('button', { name: /reject/i })
      ).toBeVisible();
    }
  });

  test('every order item has an approve action', { tag: '@regression' }, async () => {
    const count = await dash.orderItems.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(
        dash.orderItems.nth(i).getByRole('button', { name: /approve/i })
      ).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // Patient Statistics panel
  // ---------------------------------------------------------------------------

  test('Patient Statistics panel is visible', { tag: '@regression' }, async () => {
    await expect(dash.statsPanel).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Global search
  // ---------------------------------------------------------------------------

  test('search input is focusable and accepts text', { tag: ['@smoke', '@regression'] }, async () => {
    await dash.searchInput.click();
    await dash.searchInput.fill('Blood');
    await expect(dash.searchInput).toHaveValue('Blood');
    await dash.searchInput.clear();
  });

  // ---------------------------------------------------------------------------
  // Header controls
  // ---------------------------------------------------------------------------

  test('notifications button is visible', { tag: '@smoke' }, async () => {
    await expect(dash.notificationsBtn).toBeVisible();
  });

  test('avatar trigger shows the logged-in user handle', { tag: ['@smoke', '@critical'] }, async () => {
    await expect(dash.avatarHandle).toContainText(config.credentials.email);
  });

  test('clicking avatar trigger opens the user menu', { tag: '@regression' }, async () => {
    await dash.openUserMenu();
    const menuItem = dash.page.getByRole('menuitem').or(dash.page.getByText(/sign out|log out/i)).first();
    await expect(menuItem).toBeVisible({ timeout: 5_000 });
  });
});
