'use strict';

const { BasePage } = require('./base.page');

/**
 * Page object for /app/users
 *
 * Live DOM re-synced 2026-07-01 against
 * https://coloplast-prohealth-test.bbsystemstest.com/app/users
 *
 * IMPORTANT — the list view is a CUSTOM component (`bbl-list`), NOT a PrimeNG
 * DataTable. The page renders `bbl-page--custom-view`. There is also a hidden
 * `<table.p-datatable-table>` in the DOM (kept `display:none` by PrimeNG); do
 * NOT wait on it — waiting for it to be "visible" hangs the full timeout.
 *
 * Key UI facts (live):
 *  - Toolbar        : Invite -> button.bbl-page__primary-btn ("Invite user")
 *                     Export -> button.bbl-page__export-btn
 *                     Search -> input.bbl-page__search-input (single box)
 *                     Filter -> button.bbl-page__toolbar-filter-btn (popover)
 *  - Status tabs    : button.bbl-page__tab  (All / Active / Pending / Locked)
 *                     active tab -> button.bbl-page__tab--active
 *  - View toggle    : button.bbl-page__view-btn[title="List view"|"Card view"]
 *  - List container : .bbl-list  (removed from DOM entirely when there are 0 rows)
 *  - Header cells   : .bbl-list__head .bbl-list__cell  (User/Role/Account/
 *                     Prescription Capabilities/Last Logged In/Status/actions)
 *  - Rows           : .bbl-list__row
 *  - Row user name  : .bbl-list__user-name   email: .bbl-list__user-email
 *  - Row actions    : .bbl-list__cell--actions button.bbl-list__action-btn[title]
 *  - Invite panel   : aside.bsp-panel (title "Invite User", badge CREATE)
 *                     PrimeNG p-tabview: "User Details" + "Access" tabs
 *                     Tab1 ids: #title(p-dropdown) #jobTitle #firstName
 *                       #middleName #lastName #email #phoneNumber #mobile #uuid
 *                     Tab2: p-multiselect#role (formcontrolname="roles")
 *                     Submit -> .bsp-panel .bsp-btn--primary ("Invite", disabled
 *                       until First Name + Surname + Email are valid)
 *                     Inline errors -> small.bsp-form__error
 *                     Required label -> label.bsp-form__label.required
 *  - Edit navigates to full page route /app/users/edit/{uuid}
 */
class UsersPage extends BasePage {
  constructor(page) {
    super(page);

    // ── Toolbar ──────────────────────────────────────────────────────────────
    this.newUserBtn = page.locator('button.bbl-page__primary-btn');
    this.exportBtn  = page.locator('button.bbl-page__export-btn');
    this.searchInput = page.locator('input.bbl-page__search-input');
    this.filterBtn  = page.locator('button.bbl-page__toolbar-filter-btn');
    this.filterPanel = page.locator('.bbl-page__toolbar-filter-pop');

    // ── Status tabs ──────────────────────────────────────────────────────────
    this.tabs        = page.locator('button.bbl-page__tab');
    this.tabAll      = page.locator('button.bbl-page__tab').filter({ hasText: /^\s*All\s*$/i });
    this.tabActive   = page.locator('button.bbl-page__tab').filter({ hasText: /^\s*Active\s*$/i });
    this.tabPending  = page.locator('button.bbl-page__tab').filter({ hasText: /^\s*Pending\s*$/i });
    this.tabLocked   = page.locator('button.bbl-page__tab').filter({ hasText: /^\s*Locked\s*$/i });
    this.activeTab   = page.locator('button.bbl-page__tab--active');
    this.statusDropdown = this.tabs;

    // ── View toggles ─────────────────────────────────────────────────────────
    this.listViewBtn = page.locator('button.bbl-page__view-btn[title="List view"]');
    this.cardViewBtn = page.locator('button.bbl-page__view-btn[title="Card view"]');

    // ── List (custom bbl-list component) ───────────────────────────────────────
    this.list         = page.locator('.bbl-list');
    // `table` kept as an alias for the visible list container (old specs assert
    // `expect(table).toBeVisible()`); it points at the custom list, not <table>.
    this.table        = page.locator('.bbl-list');
    this.listHead     = page.locator('.bbl-list__head');
    this.tableRows    = page.locator('.bbl-list__row');
    // The custom list is removed when empty; the empty state renders its own node.
    this.emptyMessage = page.locator('.bbl-list__empty, .bbl-empty, .bbl-page__empty, [class*="empty"]').first();
    // No skeleton loader exists in the live app (kept for backward-compat refs).
    this.skeletonLoader = page.locator('p-skeleton, [class*="skeleton"]');

    // Column headers (visible custom-list header cells)
    const headCell = (re) => page.locator('.bbl-list__head .bbl-list__cell').filter({ hasText: re });
    this.colUser      = headCell(/user/i);
    this.colRole      = headCell(/role/i);
    this.colAccount   = headCell(/account/i);
    this.colPrescCaps = headCell(/prescription/i);
    this.colLastLogin = headCell(/last\s*log/i);
    this.colStatus    = headCell(/status/i);
    this.colActions   = page.locator('.bbl-list__head .bbl-list__cell--actions');
    // Backward-compat aliases (there is no separate Full Name / Email column;
    // name + email both live in the "User" column).
    this.colFullName  = this.colUser;
    this.colEmail     = this.colUser;
    this.colAccounts  = this.colAccount;

    // Row cell content
    this.rowUserName  = page.locator('.bbl-list__row .bbl-list__user-name');
    this.rowUserEmail = page.locator('.bbl-list__row .bbl-list__user-email');
    this.rowStatusText = page.locator('.bbl-list__row .bbl-list__status-text');

    // Single search box (no per-column filter inputs exist in the live DOM).
    this.filterFullName = this.searchInput;
    this.filterEmail    = this.searchInput;
    this.filterRole     = this.searchInput;
    this.filterAccounts = this.filterBtn;
    this.filterPrescCaps = this.filterBtn;

    // ── Invite slide panel ────────────────────────────────────────────────────
    this.panel      = page.locator('.bsp-panel');
    this.panelBadge = page.locator('.bsp-panel__badge');
    this.panelTitle = page.locator('.bsp-panel__title');

    // Panel tabs (PrimeNG p-tabview)
    this.panelTabUserDetails = page.locator('.bsp-panel a.p-tabview-nav-link').filter({ hasText: /user details/i });
    this.panelTabAccess      = page.locator('.bsp-panel a.p-tabview-nav-link').filter({ hasText: /access/i });

    // Tab 1 — User Details
    this.titleDropdown   = page.locator('#title');
    this.jobTitleInput   = page.locator('#jobTitle');
    this.firstNameInput  = page.locator('#firstName');
    this.middleNameInput = page.locator('#middleName');
    this.lastNameInput   = page.locator('#lastName');
    this.emailInput      = page.locator('#email');
    this.telephoneInput  = page.locator('#phoneNumber');
    this.mobileInput     = page.locator('#mobile');
    this.uuidInput       = page.locator('#uuid');

    // Tab 2 — Access
    this.roleMultiselect = page.locator('p-multiselect#role');
    this.roleDropdown    = this.roleMultiselect;

    // Panel messaging / buttons
    this.inviteNote = page.locator('.bsp-panel .bsp-form__note, .bsp-panel .bsp-panel__note, .bsp-panel [class*="note"], .bsp-panel [class*="info"]').first();
    this.saveBtn    = page.locator('.bsp-panel .bsp-btn--primary').first();
    this.cancelBtn  = page.locator('.bsp-panel .bsp-btn').filter({ hasText: /cancel/i }).first();
    this.requiredMarkers = page.locator('.bsp-panel label.bsp-form__label.required');
    this.inlineErrors = page.locator('.bsp-panel .bsp-form__error');
    this.panelBanner  = page.locator('.bsp-panel .bsp-form__banner, .bsp-panel .bsp-panel__banner, .bsp-panel p-message, .bsp-panel .p-inline-message').first();

    // ── Confirm dialog (PrimeNG) ───────────────────────────────────────────────
    this.confirmDialog    = page.locator('.p-dialog.p-confirm-dialog');
    this.confirmBtn       = page.locator('.p-confirm-dialog-accept');
    this.cancelConfirmBtn = page.locator('.p-confirm-dialog-reject');

    // ── Toast ──────────────────────────────────────────────────────────────────
    this.toast        = page.locator('p-toast');
    this.toastMessage = page.locator('p-toast .p-toast-detail, p-toast .p-toast-summary').first();

    // ── Edit page / password reset (full-page route /app/users/edit/{uuid}) ─────
    this.emailWarningTooltip = page.locator('[class*="tooltip"], .p-tooltip, [role="tooltip"]').first();
    this.passwordResetBtn = page.locator('button').filter({ hasText: /password reset|reset password|send.*reset/i }).first();
    this.resetConfirmDialog = page.locator('.p-dialog, .bsp-panel, [class*="confirm"]').filter({ hasText: /reset/i }).first();

    // ── Card view ───────────────────────────────────────────────────────────────
    this.cardsGrid   = page.locator('.bbl-page__cards-grid, .bbl-cards');
    this.cards       = page.locator('.bbl-card');

    // ── Pagination ───────────────────────────────────────────────────────────────
    this.paginator       = page.locator('p-paginator');
    this.paginationLabel = page.locator('p-paginator .p-paginator-current');
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto() {
    // Navigate with 'commit' (resolves as soon as navigation commits) instead of
    // waiting for 'domcontentloaded' on this heavy Angular SPA — on a slow test
    // server the domcontentloaded wait can exceed 60s and time out. Readiness is
    // established below by waiting for the list / empty-state to become visible.
    await this.navigate('/app/users', { waitUntil: 'commit' });
    await this.dismissCookieBanner();
    // The list view is the custom bbl-list component. It renders once data loads;
    // when there are 0 rows it is removed and an empty-state node shows instead.
    // Wait for whichever appears so we never block on the hidden PrimeNG <table>.
    await Promise.race([
      this.tableRows.first().waitFor({ state: 'visible', timeout: 30_000 }),
      this.emptyMessage.waitFor({ state: 'visible', timeout: 30_000 }),
      this.list.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {});
    await this.waitForAngular();
  }

  // ---------------------------------------------------------------------------
  // Toolbar
  // ---------------------------------------------------------------------------

  async clickNewUser()    { await this.click(this.newUserBtn); await this.waitForElement(this.panel); }
  async clickInviteUser() { return this.clickNewUser(); }
  async clickExport()     { await this.click(this.exportBtn); }
  async search(text)      { await this.fill(this.searchInput, text); await this.waitForAngular(); }
  async openFilters()     { await this.click(this.filterBtn); }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  async clickTab(status) {
    const tab = this.page.locator('button.bbl-page__tab').filter({ hasText: new RegExp(`^\\s*${status}\\s*$`, 'i') });
    await this.click(tab);
    await this.waitForAngular();
  }

  async setStatusFilter(status) { return this.clickTab(status); }

  async getActiveTab() {
    return (await this.activeTab.textContent())?.trim() || '';
  }

  // ---------------------------------------------------------------------------
  // View toggles
  // ---------------------------------------------------------------------------

  async switchToListView() { await this.click(this.listViewBtn); }
  async switchToCardView() { await this.click(this.cardViewBtn); }

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------

  async getRowCount() { return this.tableRows.count(); }

  async getRowCellText(rowIndex, cellIndex) {
    return this.tableRows.nth(rowIndex).locator('.bbl-list__cell').nth(cellIndex).textContent();
  }

  async clickEditOnRow(index = 0) {
    await this.tableRows.nth(index)
      .locator('button.bbl-list__action-btn[title="Edit"], button.bbl-list__action-btn').first()
      .click();
    await this.page.waitForURL(/\/app\/users\/edit\//, { timeout: 15_000 });
    // Wait for the edit form to hydrate before interacting. Acting on a
    // not-yet-populated form is the main source of first-attempt flakiness on
    // the Edit / Password-reset tests (they pass on retry once data has loaded).
    await this.emailInput.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    for (let i = 0; i < 16; i++) {
      const v = await this.emailInput.inputValue().catch(() => '');
      if (v && v.length > 0) break;
      await this.page.waitForTimeout(250);
    }
    await this.waitForAngular();
  }

  async clickDeactivateOnRow(index = 0) {
    await this.tableRows.nth(index)
      .locator('button.bbl-list__action-btn[title*="Deactivate" i], button.bbl-list__action-btn[title*="Delete" i], button.bbl-list__action-btn.is-danger')
      .first()
      .click();
    await this.waitForElement(this.confirmDialog);
  }

  async getRowStatus(index = 0) {
    return (await this.tableRows.nth(index).locator('.bbl-list__status-text').textContent())?.trim() || '';
  }

  // ---------------------------------------------------------------------------
  // Invite / Add form
  // ---------------------------------------------------------------------------

  async selectTitle(title) {
    await this.titleDropdown.click();
    await this.page.locator('.p-dropdown-item').filter({ hasText: title }).first().click();
  }

  async selectRoles(roles = []) {
    await this.click(this.panelTabAccess);
    await this.waitForAngular();
    await this.roleMultiselect.click();
    for (const role of roles) {
      await this.page.locator('.p-multiselect-item').filter({ hasText: role }).first().click();
    }
    // Close the multiselect overlay by clicking the Role label (sits ABOVE the
    // dropdown, so it is not covered by the overlay). Do NOT press Escape: it
    // propagates to the panel and pops the "Discard changes?" confirmation,
    // whose mask then blocks the Invite button.
    await this.page.locator('.bsp-panel label[for="role"]').click({ timeout: 3000 })
      .catch(async () => { await this.panelTitle.click({ force: true }).catch(() => {}); });
  }

  /**
   * Fill the Invite/Add panel. Fields live on the "User Details" tab; roles live
   * on the "Access" tab. Accepts `role` (string) or `roles` (array).
   */
  async fillAddForm({ title, jobTitle, firstName, middleName, lastName, email, telephone, phoneNumber, mobile, uuid, role, roles } = {}) {
    if (title !== undefined) await this.selectTitle(title);
    if (jobTitle   !== undefined) await this.fillAngularInput(this.jobTitleInput,   jobTitle);
    if (firstName  !== undefined) await this.fillAngularInput(this.firstNameInput,  firstName);
    if (middleName !== undefined) await this.fillAngularInput(this.middleNameInput, middleName);
    if (lastName   !== undefined) await this.fillAngularInput(this.lastNameInput,   lastName);
    if (email      !== undefined) await this.fillAngularInput(this.emailInput,      email);
    const tel = telephone ?? phoneNumber;
    if (tel    !== undefined) await this.fillAngularInput(this.telephoneInput, tel);
    if (mobile !== undefined) await this.fillAngularInput(this.mobileInput, mobile);
    if (uuid   !== undefined) await this.fillAngularInput(this.uuidInput,   uuid);

    const roleList = roles ?? (role !== undefined ? [role] : undefined);
    if (roleList !== undefined) {
      // Select roles LAST. Do not switch back to the User Details tab afterwards:
      // once a role is chosen the panel has "unsaved changes", so a tab switch
      // pops a "Discard changes?" dialog whose mask blocks the Invite button.
      // The Invite/Cancel buttons live in the panel footer and stay reachable.
      await this.selectRoles(roleList);
    }
  }

  // Required-field label markers (the app flags required fields with a `*`
  // asterisk; only Email surfaces an inline "is required" message on blur).
  requiredLabel(fieldId) {
    return this.page.locator(`.bsp-panel label[for="${fieldId}"].bsp-form__label.required`);
  }

  // ---------------------------------------------------------------------------
  // Panel actions
  // ---------------------------------------------------------------------------

  async clickSave()   { await this.click(this.saveBtn); }
  async clickCancel() { await this.click(this.cancelBtn); }
  async isPanelOpen()    { return this.panel.isVisible(); }
  async isSaveDisabled() { return !(await this.saveBtn.isEnabled()); }

  // ---------------------------------------------------------------------------
  // Confirm dialog
  // ---------------------------------------------------------------------------

  async confirmDeactivation() { await this.click(this.confirmBtn); }
  async cancelDeactivation()  { await this.click(this.cancelConfirmBtn); }

  // ---------------------------------------------------------------------------
  // Password reset (Edit page)
  // ---------------------------------------------------------------------------

  async clickPasswordReset()   { await this.click(this.passwordResetBtn); }
  async confirmPasswordReset() {
    // Wait for the confirmation dialog to render before accepting (avoids a race
    // where the accept button is clicked before the dialog is interactive).
    await this.page.locator('.p-confirm-dialog, .p-dialog, [class*="confirm"]')
      .first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    const confirm = this.page.locator('.p-confirm-dialog-accept, .p-dialog button, button')
      .filter({ hasText: /confirm|send|reset|yes/i }).first();
    await this.click(confirm);
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  async getToastText() {
    await this.waitForElement(this.toast, { timeout: 8_000 });
    return this.getText(this.toastMessage);
  }

  // ---------------------------------------------------------------------------
  // Sorting / search
  // ---------------------------------------------------------------------------

  async sortBy(col) { await this.click(col); await this.waitForAngular(); }

  async filterByFullName(text) { await this.search(text); }
  async filterByEmail(text)    { await this.search(text); }
  async filterByRole(text)     { await this.search(text); }
}

module.exports = { UsersPage };
