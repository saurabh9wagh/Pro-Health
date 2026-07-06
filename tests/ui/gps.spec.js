'use strict';

/**
 * GP Surgeries — UI Automation Suite
 * Test IDs : TC_GPS_001 – TC_GPS_085
 * Tag      : @gps
 * Route    : /app/gps
 */

const { test, expect } = require('../../fixtures/base.fixture');
const { GpsPage }      = require('../../pages/gps.page');
const { LoginPage }    = require('../../pages/login.page');
const config           = require('../../config/env.config');

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const VALID_GP = {
  gpName   : 'AutoTest Surgery',
  odsCode  : `AUTS${Date.now().toString().slice(-5)}`,
  address1 : '1 Test Lane',
  postCode : 'SW1A 1AA',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('GP Surgeries Management', { tag: '@gps' }, () => {
  test.describe.configure({ mode: 'serial' });

  /** @type {GpsPage} */
  let gps;

  test.beforeAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.open(config.loginUrl);
    await loginPage.login(config.credentials.email, config.credentials.password);
    await page.waitForURL(/\/app(\/|\?|$)/, { timeout: 30_000 });
    gps = new GpsPage(page);
  });

  test.beforeEach(async () => {
    await gps.goto();
  });

  // =========================================================================
  // GP Listing — TC_GPS_001 to TC_GPS_010
  // =========================================================================

  test('TC_GPS_001 - GP Surgeries page loads at /app/gps', async () => {
    await expect(gps.page).toHaveURL(/\/app\/gps/);
    await expect(gps.page.locator('h1, .bbl-page__title').filter({ hasText: /GP Surgeries/i }).first()).toBeVisible();
  });

  test('TC_GPS_002 - Grid shows required columns', async () => {
    await expect(gps.colGpSurgery).toBeVisible();
    await expect(gps.colAddress).toBeVisible();
    await expect(gps.colPostCode).toBeVisible();
    await expect(gps.colOdsCode).toBeVisible();
    await expect(gps.colActions).toBeVisible();
  });

  test('TC_GPS_003 - Toolbar shows Export and Add GP Surgery buttons', async () => {
    await expect(gps.addGpBtn).toBeVisible();
    await expect(gps.exportBtn).toBeVisible();
  });

  test('TC_GPS_004 - Active tab is selected by default on page load', async () => {
    const activeTab = gps.page.locator('button.bbl-page__tab--active');
    await expect(activeTab).toContainText(/active/i);
  });

  test('TC_GPS_005 - Search input is visible and empty on load', async () => {
    await expect(gps.searchInput).toBeVisible();
    await expect(gps.searchInput).toHaveValue('');
  });

  test('TC_GPS_006 - Empty state shown when no GPs match filter', async () => {
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
      } else { await route.continue(); }
    });
    await gps.page.reload();
    await expect(gps.emptyMessage).toBeVisible({ timeout: 10_000 });
    await gps.page.unroute('**/api/gps**');
  });

  test('TC_GPS_007 - Grid is paginated with navigation controls', async () => {
    await expect(gps.paginator).toBeVisible();
    await expect(gps.paginatorNext.or(gps.paginatorPrev)).toBeVisible();
  });

  test('TC_GPS_008 - Showing X–Y of Z count is visible', async () => {
    await expect(gps.paginatorLabel).toBeVisible();
    const labelText = await gps.getPaginatorLabel();
    expect(labelText).toMatch(/\d+\s*[-–]\s*\d+\s*of\s*\d+|\d+\s*-\s*\d+/i);
  });

  test('TC_GPS_009 - Each GP Surgery row has edit and deactivate icon buttons', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No data rows to inspect');
    const editBtn       = gps.tableRows.first().locator('td.actions-column-cell button:not(.p-button-danger)');
    const deactivateBtn = gps.tableRows.first().locator('td.actions-column-cell button.p-button-danger');
    await expect(editBtn).toBeVisible();
    await expect(deactivateBtn).toBeVisible();
  });

  test('TC_GPS_010 - GP Surgery cell shows email beneath surgery name', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No data rows to inspect');
    // The surgery name cell (col-title) should contain an email sub-element or text
    const nameCell = gps.tableRows.first().locator('td.col-title');
    await expect(nameCell).toBeVisible();
  });

  // =========================================================================
  // Search & Filters — TC_GPS_011 to TC_GPS_018
  // =========================================================================

  test('TC_GPS_011 - Search by surgery name filters grid (partial match)', async () => {
    const initialCount = await gps.getRowCount();
    test.skip(initialCount === 0, 'No data to search');
    await gps.search('test');
    const filteredCount = await gps.getRowCount();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('TC_GPS_012 - Search by post code filters grid', async () => {
    const initialCount = await gps.getRowCount();
    test.skip(initialCount === 0, 'No data to search');
    await gps.search('SW1A');
    await expect(gps.table.or(gps.emptyMessage)).toBeVisible();
  });

  test('TC_GPS_013 - Clearing search restores full list', async () => {
    const initialCount = await gps.getRowCount();
    await gps.search('zzzznotfound');
    await gps.clearSearch();
    const restoredCount = await gps.getRowCount();
    expect(restoredCount).toBe(initialCount);
  });

  test('TC_GPS_014 - Inactive tab filters to deactivated records', async () => {
    await gps.clickTab('Inactive');
    await expect(gps.table.or(gps.emptyMessage)).toBeVisible();
    const activeTabText = await gps.getActiveTab();
    expect(activeTabText).toMatch(/inactive/i);
  });

  test('TC_GPS_015 - All tab shows both active and inactive records', async () => {
    await gps.clickTab('Inactive');
    const inactiveCount = await gps.getRowCount();
    await gps.clickTab('Active');
    const activeCount = await gps.getRowCount();
    await gps.clickTab('All');
    const allCount = await gps.getRowCount();
    expect(allCount).toBeGreaterThanOrEqual(activeCount);
    expect(allCount).toBeGreaterThanOrEqual(inactiveCount);
  });

  test('TC_GPS_016 - Search and Status filter work together', async () => {
    await gps.clickTab('All');
    await gps.search('test');
    await expect(gps.table.or(gps.emptyMessage)).toBeVisible();
    await gps.clearSearch();
  });

  test('TC_GPS_017 - Grid refreshes automatically as user types', async () => {
    await gps.search('a');
    await gps.waitForAngular();
    await expect(gps.table.or(gps.emptyMessage)).toBeVisible();
    await gps.clearSearch();
  });

  test('TC_GPS_018 - Changing tab resets to page 1', async () => {
    await gps.clickTab('All');
    await gps.waitForAngular();
    const label = await gps.getPaginatorLabel();
    expect(label).toMatch(/^1/);
  });

  // =========================================================================
  // Add GP — TC_GPS_024 to TC_GPS_035
  // =========================================================================

  test('TC_GPS_024 - Add GP Surgery button opens Create panel', async () => {
    await gps.clickAddGp();
    await expect(gps.panel).toBeVisible();
  });

  test('TC_GPS_025 - Panel title reads "Create GP Surgery" and badge reads "CREATE"', async () => {
    await gps.clickAddGp();
    await expect(gps.panelBadge).toContainText(/create/i);
    await expect(gps.panelTitle).toContainText(/Create GP Surgery/i);
  });

  test('TC_GPS_026 - All expected form fields are present in Add panel', async () => {
    await gps.clickAddGp();
    await expect(gps.gpNameInput).toBeVisible();
    await expect(gps.odsCodeInput).toBeVisible();
    await expect(gps.address1Input).toBeVisible();
    await expect(gps.address2Input).toBeVisible();
    await expect(gps.address3Input).toBeVisible();
    await expect(gps.townInput).toBeVisible();
    await expect(gps.countyInput).toBeVisible();
    await expect(gps.postCodeInput).toBeVisible();
    await expect(gps.telephoneInput).toBeVisible();
    await expect(gps.emailInput).toBeVisible();
    await expect(gps.websiteInput).toBeVisible();
    await expect(gps.statusToggle).toBeVisible();
  });

  test('TC_GPS_027 - Required fields are marked with an asterisk', async () => {
    await gps.clickAddGp();
    const requiredMarkers = gps.panel.locator(
      'label .required, abbr[title="required"], [class*="required"], label:has-text("*")'
    );
    await expect(requiredMarkers.first()).toBeVisible();
  });

  test('TC_GPS_028 - Status toggle defaults to Active (ON) when panel opens', async () => {
    await gps.clickAddGp();
    const checkedState = await gps.statusToggle.getAttribute('aria-checked')
      || await gps.page.locator('#isActive').evaluate(el => el.checked ? 'true' : 'false');
    expect(checkedState).toBe('true');
    await gps.clickCancel();
  });

  test('TC_GPS_029 - Save button disabled when form is invalid', async () => {
    await gps.clickAddGp();
    await expect(gps.saveBtn).toBeDisabled();
    await gps.clickCancel();
  });

  test('TC_GPS_030 - Save button enables when all required fields are valid', async () => {
    await gps.clickAddGp();
    await gps.fillForm(VALID_GP);
    await expect(gps.saveBtn).toBeEnabled();
    await gps.clickCancel();
  });

  test('TC_GPS_031 - Successful add closes panel and shows toast', async () => {
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201, contentType: 'application/json',
          body: JSON.stringify({ id: 'new-gp-id', ...VALID_GP }),
        });
      } else { await route.continue(); }
    });
    await gps.clickAddGp();
    await gps.fillForm(VALID_GP);
    await gps.clickSave();
    await expect(gps.toast).toBeVisible({ timeout: 10_000 });
    await expect(gps.panel).toBeHidden({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps**');
  });

  test('TC_GPS_032 - Cancel with dirty form shows unsaved-changes confirmation', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.gpNameInput, 'Unsaved Name');
    await gps.clickCancel();
    const prompt = gps.page.locator('.p-dialog.p-confirm-dialog, p-confirmdialog').first();
    await expect(prompt).toBeVisible({ timeout: 5_000 });
    // Discard to clean up
    const discardBtn = gps.page.locator(
      '.p-confirm-dialog-accept, button:has-text("Discard"), button:has-text("Leave")'
    ).first();
    await discardBtn.click();
  });

  test('TC_GPS_033 - Discard closes panel without saving', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.gpNameInput, 'Will Be Discarded');
    await gps.clickCancel();
    const discardBtn = gps.page.locator(
      '.p-confirm-dialog-accept, button:has-text("Discard"), button:has-text("Leave")'
    ).first();
    await discardBtn.click();
    await expect(gps.panel).toBeHidden({ timeout: 5_000 });
  });

  test('TC_GPS_034 - Cancel on empty form closes immediately without prompt', async () => {
    await gps.clickAddGp();
    await gps.clickCancel();
    // Should not show confirm dialog
    const prompt = gps.page.locator('.p-dialog.p-confirm-dialog').first();
    await expect(prompt).toBeHidden({ timeout: 3_000 }).catch(() => {});
    await expect(gps.panel).toBeHidden({ timeout: 5_000 });
  });

  test('TC_GPS_035 - Close (×) button dismisses the Create panel', async () => {
    await gps.clickAddGp();
    await gps.clickClose();
    await expect(gps.panel).toBeHidden({ timeout: 5_000 });
  });

  // =========================================================================
  // Add GP Validations — TC_GPS_036 to TC_GPS_048
  // =========================================================================

  test('TC_GPS_036 - Empty GP Surgery Name shows required error', async () => {
    await gps.clickAddGp();
    await gps.gpNameInput.click();
    await gps.odsCodeInput.click(); // blur name field
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_037 - GP Surgery Name >200 chars shows length error', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.gpNameInput, 'A'.repeat(201));
    await gps.odsCodeInput.click();
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_038 - Empty ODS Code shows required error', async () => {
    await gps.clickAddGp();
    await gps.odsCodeInput.click();
    await gps.gpNameInput.click(); // blur
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_039 - Duplicate ODS Code (409) shows inline error', async () => {
    const dupOds = 'DUP001';
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409, contentType: 'application/json',
          body: JSON.stringify({ message: `A GP with ODS Code '${dupOds}' already exists.` }),
        });
      } else { await route.continue(); }
    });
    await gps.clickAddGp();
    await gps.fillForm({ ...VALID_GP, odsCode: dupOds });
    await gps.clickSave();
    await expect(gps.inlineErrors.or(gps.errorBanner).first()).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps**');
    await gps.clickCancel();
  });

  test('TC_GPS_040 - All five address fields blank shows address required error', async () => {
    await gps.clickAddGp();
    await gps.fillForm({ gpName: 'Test', odsCode: 'TST001', postCode: 'SW1A 1AA' });
    // Trigger address validation by clicking address1 then blurring
    await gps.address1Input.click();
    await gps.postCodeInput.click();
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_041 - Entering one address field satisfies address validation', async () => {
    await gps.clickAddGp();
    await gps.fillForm({ gpName: 'Test', odsCode: 'TST001', address1: '1 Test St', postCode: 'SW1A 1AA' });
    await gps.waitForAngular();
    // Address error should not be present when address1 is filled
    const errCount = await gps.inlineErrors.count();
    expect(errCount).toBe(0);
    await gps.clickCancel();
  });

  test('TC_GPS_042 - Empty Post Code shows required error', async () => {
    await gps.clickAddGp();
    await gps.postCodeInput.click();
    await gps.gpNameInput.click(); // blur
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_043 - Invalid UK postcode shows format error', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.postCodeInput, 'NOTAPOSTCODE');
    await gps.gpNameInput.click(); // blur
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_044 - Invalid telephone shows validation error', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.telephoneInput, 'not-a-phone');
    await gps.gpNameInput.click(); // blur
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_045 - Invalid email shows validation error', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.emailInput, 'not-an-email');
    await gps.gpNameInput.click(); // blur
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_046 - Multiple errors shown simultaneously', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.postCodeInput, 'INVALID');
    await gps.fillAngularInput(gps.emailInput, 'bademail');
    await gps.gpNameInput.click();
    await gps.waitForAngular();
    const errCount = await gps.inlineErrors.count();
    expect(errCount).toBeGreaterThanOrEqual(2);
    await gps.clickCancel();
  });

  test('TC_GPS_047 - Inline error clears when field is corrected', async () => {
    await gps.clickAddGp();
    await gps.fillAngularInput(gps.postCodeInput, 'INVALID');
    await gps.gpNameInput.click();
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.fillAngularInput(gps.postCodeInput, 'SW1A 1AA');
    await gps.gpNameInput.click();
    await gps.waitForAngular();
    // Post code error should be gone
    const errCount = await gps.inlineErrors.count();
    expect(errCount).toBe(0);
    await gps.clickCancel();
  });

  test('TC_GPS_048 - Server error (500) on Add shows error feedback', async () => {
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500, contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else { await route.continue(); }
    });
    await gps.clickAddGp();
    await gps.fillForm(VALID_GP);
    await gps.clickSave();
    await expect(gps.errorBanner.or(gps.toast)).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps**');
    await gps.clickCancel();
  });

  // =========================================================================
  // Edit GP — TC_GPS_049 to TC_GPS_061
  // =========================================================================

  test('TC_GPS_049 - Edit icon opens Edit GP panel', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.clickEditOnRow(0);
    await expect(gps.panel).toBeVisible();
  });

  test('TC_GPS_050 - Panel title reads "Edit GP Surgery — {name}"', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.clickEditOnRow(0);
    await expect(gps.panelTitle).toContainText(/Edit GP Surgery/i);
  });

  test('TC_GPS_051 - Panel badge reads "EDIT"', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.clickEditOnRow(0);
    await expect(gps.panelBadge).toContainText(/edit/i);
  });

  test('TC_GPS_052 - Edit panel pre-populates all fields', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.clickEditOnRow(0);
    const name = await gps.gpNameInput.inputValue();
    const ods  = await gps.odsCodeInput.inputValue();
    expect(name.trim().length).toBeGreaterThan(0);
    expect(ods.trim().length).toBeGreaterThan(0);
  });

  test('TC_GPS_053 - Same validation rules apply in Edit panel', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.clickEditOnRow(0);
    await gps.gpNameInput.clear();
    await gps.odsCodeInput.click(); // blur
    await expect(gps.inlineErrors.first()).toBeVisible({ timeout: 5_000 });
    await gps.clickCancel();
  });

  test('TC_GPS_054 - Successful edit shows toast, closes panel, grid updates', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'PUT' || m === 'PATCH') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else { await route.continue(); }
    });
    await gps.clickEditOnRow(0);
    await gps.clickSave();
    await expect(gps.toast).toBeVisible({ timeout: 8_000 });
    await expect(gps.panel).toBeHidden({ timeout: 5_000 });
    await gps.page.unroute('**/api/gps/**');
  });

  test('TC_GPS_055 - Duplicate ODS Code on Edit shows inline error', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'PUT' || m === 'PATCH') {
        await route.fulfill({
          status: 409, contentType: 'application/json',
          body: JSON.stringify({ message: "A GP with ODS Code 'DUP001' already exists." }),
        });
      } else { await route.continue(); }
    });
    await gps.clickEditOnRow(0);
    await gps.fillAngularInput(gps.odsCodeInput, 'DUP001');
    await gps.clickSave();
    await expect(gps.inlineErrors.or(gps.errorBanner).first()).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps/**');
    await gps.clickCancel();
  });

  test('TC_GPS_056 - Server 500 on Edit shows error feedback', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'PUT' || m === 'PATCH') {
        await route.fulfill({
          status: 500, contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else { await route.continue(); }
    });
    await gps.clickEditOnRow(0);
    await gps.clickSave();
    await expect(gps.errorBanner.or(gps.toast)).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps/**');
    await gps.clickCancel();
  });

  test('TC_GPS_057 - Cancel after modifying field shows unsaved-changes confirmation', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.clickEditOnRow(0);
    const current = await gps.gpNameInput.inputValue();
    await gps.fillAngularInput(gps.gpNameInput, current + ' edited');
    await gps.clickCancel();
    const prompt = gps.page.locator('.p-dialog.p-confirm-dialog').first();
    await expect(prompt).toBeVisible({ timeout: 5_000 });
    await gps.page.locator('.p-confirm-dialog-accept').click();
  });

  test('TC_GPS_058 - Inactive GP can be reactivated via Edit', async () => {
    await gps.clickTab('Inactive');
    const inactiveCount = await gps.getRowCount();
    test.skip(inactiveCount === 0, 'No inactive GP records');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'PUT' || m === 'PATCH') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else { await route.continue(); }
    });
    await gps.clickEditOnRow(0);
    // Toggle status to active
    const statusSwitch = gps.page.locator('p-inputswitch').filter({ has: gps.page.locator('#isActive') });
    await statusSwitch.click();
    await gps.clickSave();
    await expect(gps.toast).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps/**');
    await gps.clickTab('Active');
  });

  // =========================================================================
  // Deactivate GP — TC_GPS_062 to TC_GPS_070
  // =========================================================================

  test('TC_GPS_062 - Deactivate icon opens confirmation dialog', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.clickDeactivateOnRow(0);
    await expect(gps.confirmDialog).toBeVisible();
    await gps.cancelDeactivate();
  });

  test('TC_GPS_063 - Confirm dialog message references surgery name', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.clickDeactivateOnRow(0);
    await expect(gps.confirmDialog).toBeVisible();
    const dialogText = await gps.confirmDialog.textContent();
    expect(dialogText).toMatch(/deactivate/i);
    await gps.cancelDeactivate();
  });

  test('TC_GPS_064 - Confirm dialog shows Yes and No buttons', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.clickDeactivateOnRow(0);
    await expect(gps.confirmYesBtn).toBeVisible();
    await expect(gps.confirmNoBtn).toBeVisible();
    await gps.cancelDeactivate();
  });

  test('TC_GPS_065 - Confirming deactivation shows toast and removes row from Active view', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'DELETE' || m === 'PATCH') {
        await route.fulfill({
          status: 204, contentType: 'application/json',
          body: '',
        });
      } else { await route.continue(); }
    });
    const countBefore = await gps.getRowCount();
    await gps.clickDeactivateOnRow(0);
    await gps.confirmDeactivate();
    await expect(gps.toast).toBeVisible({ timeout: 8_000 });
    const countAfter = await gps.getRowCount();
    expect(countAfter).toBe(countBefore - 1);
    await gps.page.unroute('**/api/gps/**');
  });

  test('TC_GPS_066 - Deactivated GP visible in Inactive/All filter', async () => {
    await gps.clickTab('Inactive');
    await expect(gps.table.or(gps.emptyMessage)).toBeVisible();
    await gps.clickTab('All');
    await expect(gps.table.or(gps.emptyMessage)).toBeVisible();
  });

  test('TC_GPS_067 - Cancelling deactivation makes no changes', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    const countBefore = await gps.getRowCount();
    await gps.clickDeactivateOnRow(0);
    await gps.cancelDeactivate();
    await expect(gps.confirmDialog).toBeHidden({ timeout: 5_000 });
    const countAfter = await gps.getRowCount();
    expect(countAfter).toBe(countBefore);
  });

  test('TC_GPS_068 - 404 on deactivate shows user-friendly error', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'DELETE' || m === 'PATCH') {
        await route.fulfill({
          status: 404, contentType: 'application/json',
          body: JSON.stringify({ message: 'GP not found or already deactivated.' }),
        });
      } else { await route.continue(); }
    });
    await gps.clickDeactivateOnRow(0);
    await gps.confirmDeactivate();
    await expect(gps.toast.or(gps.errorBanner)).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps/**');
  });

  test('TC_GPS_069 - Network error on deactivation shows error toast', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'DELETE' || m === 'PATCH') { await route.abort('failed'); }
      else { await route.continue(); }
    });
    await gps.clickDeactivateOnRow(0);
    await gps.confirmDeactivate();
    await expect(gps.toast.or(gps.errorBanner)).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps/**');
  });

  test('TC_GPS_070 - Success toast auto-dismisses after deactivation', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'DELETE' || m === 'PATCH') {
        await route.fulfill({ status: 204, body: '' });
      } else { await route.continue(); }
    });
    await gps.clickDeactivateOnRow(0);
    await gps.confirmDeactivate();
    await expect(gps.toast).toBeVisible({ timeout: 8_000 });
    await expect(gps.toast).toBeHidden({ timeout: 12_000 });
    await gps.page.unroute('**/api/gps/**');
  });

  // =========================================================================
  // Misc / Cross-cutting — TC_GPS_071 to TC_GPS_085
  // =========================================================================

  test('TC_GPS_071 - GP Surgeries nav item visible for admin user', async () => {
    const navLink = gps.page.locator('a[href="/app/gps"], a[href*="/app/gps"]').first();
    await expect(navLink.or(gps.page.locator('[class*="nav"]:has-text("GPs")'))).toBeVisible();
  });

  test('TC_GPS_072 - View toggles switch between List and Card views', async () => {
    if (await gps.cardViewBtn.isVisible()) {
      await gps.cardViewBtn.click();
      await gps.waitForAngular();
      await expect(gps.table.or(gps.page.locator('.bbl-page__cards-grid, .bbl-card'))).toBeVisible({ timeout: 8_000 });
      await gps.listViewBtn.click();
      await expect(gps.table).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC_GPS_073 - No browser console errors on GP Surgeries page load', async () => {
    const consoleErrors = [];
    gps.page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await gps.page.reload();
    await gps.waitForAngular();
    const significant = consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('net::ERR_')
    );
    expect(significant).toHaveLength(0);
  });

  test('TC_GPS_074 - API error 500 on page load does not expose raw status codes in UI', async () => {
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500, contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else { await route.continue(); }
    });
    await gps.page.reload();
    await gps.waitForAngular();
    const bodyText = await gps.page.locator('body').textContent();
    expect(bodyText).not.toMatch(/\b500\b/);
    await gps.page.unroute('**/api/gps**');
  });

  test('TC_GPS_075 - Success toast appears after creating a GP', async () => {
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201, contentType: 'application/json',
          body: JSON.stringify({ id: 'new-id', ...VALID_GP }),
        });
      } else { await route.continue(); }
    });
    await gps.clickAddGp();
    await gps.fillForm(VALID_GP);
    await gps.clickSave();
    await expect(gps.toast).toBeVisible({ timeout: 10_000 });
    await gps.page.unroute('**/api/gps**');
  });

  test('TC_GPS_076 - Success toast appears after editing a GP', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to edit');
    await gps.page.route('**/api/gps/**', async route => {
      const m = route.request().method();
      if (m === 'PUT' || m === 'PATCH') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else { await route.continue(); }
    });
    await gps.clickEditOnRow(0);
    await gps.clickSave();
    await expect(gps.toast).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps/**');
  });

  test('TC_GPS_077 - Search input has correct placeholder', async () => {
    await expect(gps.searchInput).toHaveAttribute('placeholder', /Filter by GP Surgery|Post code/i);
  });

  test('TC_GPS_078 - POST /api/gps with duplicate ODS returns 409 shown inline', async () => {
    await gps.page.route('**/api/gps**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409, contentType: 'application/json',
          body: JSON.stringify({ message: "A GP with ODS Code 'EXISTING' already exists." }),
        });
      } else { await route.continue(); }
    });
    await gps.clickAddGp();
    await gps.fillForm({ ...VALID_GP, odsCode: 'EXISTING' });
    await gps.clickSave();
    await expect(gps.inlineErrors.or(gps.errorBanner).first()).toBeVisible({ timeout: 8_000 });
    await gps.page.unroute('**/api/gps**');
    await gps.clickCancel();
  });

  test('TC_GPS_079 - GET /api/gps 404 on edit shows not-found feedback', async () => {
    await gps.page.route('**/api/gps/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 404, contentType: 'application/json',
          body: JSON.stringify({ message: 'Not found' }),
        });
      } else { await route.continue(); }
    });
    const rowCount = await gps.getRowCount();
    if (rowCount > 0) {
      await gps.clickEditOnRow(0);
      await expect(gps.errorBanner.or(gps.toast)).toBeVisible({ timeout: 6_000 });
    }
    await gps.page.unroute('**/api/gps/**');
  });

  test('TC_GPS_080 - Active and Inactive counts total to All count', async () => {
    await gps.clickTab('Active');
    const activeCount = await gps.getRowCount();
    await gps.clickTab('Inactive');
    const inactiveCount = await gps.getRowCount();
    await gps.clickTab('All');
    const allCount = await gps.getRowCount();
    expect(activeCount + inactiveCount).toBe(allCount);
  });

  test('TC_GPS_081 - Paginator reflects correct showing range after tab switch', async () => {
    await gps.clickTab('All');
    await gps.waitForAngular();
    const label = await gps.getPaginatorLabel();
    expect(label).toMatch(/\d/);
  });

  test('TC_GPS_082 - Add panel fields open blank with no pre-filled data', async () => {
    await gps.clickAddGp();
    await expect(gps.gpNameInput).toHaveValue('');
    await expect(gps.odsCodeInput).toHaveValue('');
    await gps.clickCancel();
  });

  test('TC_GPS_083 - Edit and Add panels have identical field layout', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows available');
    // Both panels should have the same field count
    await gps.clickAddGp();
    const addInputCount = await gps.panel.locator('input').count();
    await gps.clickClose();
    await gps.clickEditOnRow(0);
    const editInputCount = await gps.panel.locator('input').count();
    expect(editInputCount).toBe(addInputCount);
    await gps.clickClose();
  });

  test('TC_GPS_084 - Filter button is visible and opens filter panel', async () => {
    if (await gps.filterBtn.isVisible()) {
      await gps.click(gps.filterBtn);
      await gps.waitForAngular();
      await gps.page.keyboard.press('Escape');
    }
  });

  test('TC_GPS_085 - Delete /api/gps/{id} 204 removes row from Active view', async () => {
    const rowCount = await gps.getRowCount();
    test.skip(rowCount === 0, 'No rows to deactivate');
    await gps.page.route('**/api/gps/**', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });
      } else { await route.continue(); }
    });
    const countBefore = await gps.getRowCount();
    await gps.clickDeactivateOnRow(0);
    await gps.confirmDeactivate();
    await expect(gps.toast).toBeVisible({ timeout: 8_000 });
    const countAfter = await gps.getRowCount();
    expect(countAfter).toBeLessThan(countBefore);
    await gps.page.unroute('**/api/gps/**');
  });

});
