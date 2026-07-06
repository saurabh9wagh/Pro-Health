'use strict';

const { BasePage } = require('./base.page');

/**
 * Page object for /app/gps (GP Surgeries)
 *
 * Live DOM selectors confirmed 2026-07-02.
 *
 * Key UI facts:
 *  - Add button        : button.bbl-page__primary-btn  text="Add GP Surgery"
 *  - Export button     : button.bbl-page__export-btn
 *  - Search input      : input.bbl-page__search-input  placeholder="Filter by GP Surgery, Post code..."
 *  - Status tabs       : button.bbl-page__tab  (Active / Inactive / All)
 *  - Active tab class  : bbl-page__tab--active
 *  - Table             : table.p-datatable-table  rows: tr.p-selectable-row
 *  - GP Surgery cell   : td.col-title
 *  - Address cell      : td.col-addressLine1
 *  - Post Code cell    : td.col-postCode
 *  - ODS Code cell     : td.col-gpOdsCode
 *  - Status cell       : td.col-status  val-1=Active  val-2=Inactive
 *  - Actions cell      : td.actions-column-cell
 *  - Edit btn          : td.actions-column-cell button:not(.p-button-danger)  (pi-pencil icon)
 *  - Deactivate btn    : td.actions-column-cell button.p-button-danger  (pi-trash icon)
 *  - Panel             : .bsp-panel  open: .bsp-panel--open
 *  - Panel badge       : .bsp-panel__badge  → "CREATE" or "EDIT"
 *  - Panel title       : .bsp-panel__title  → "Create GP Surgery" / "Edit GP Surgery — {name}"
 *  - Close btn         : button.bsp-panel__close
 *  - Form field IDs    : #title (name), #gpOdsCode; others by placeholder
 *  - Status toggle     : #isActive  (type=checkbox via p-inputswitch)
 *  - Save (Add)        : button.bsp-btn.bsp-btn--primary  text="Create GP Surgery"
 *  - Save (Edit)       : button.bsp-btn.bsp-btn--primary  text="Save"
 *  - Cancel            : button.bsp-btn:not(.bsp-btn--primary)
 *  - Confirm dialog    : .p-dialog.p-confirm-dialog
 *    - Yes btn         : .p-confirm-dialog-accept  (or p-button:not(.p-button-secondary))
 *    - No btn          : .p-confirm-dialog-reject  (or p-button-secondary)
 *  - Toast             : p-toast
 */
class GpsPage extends BasePage {
  constructor(page) {
    super(page);

    // ── Toolbar ──────────────────────────────────────────────────────────────
    this.addGpBtn  = page.locator('button.bbl-page__primary-btn');
    this.exportBtn = page.locator('button.bbl-page__export-btn');
    this.filterBtn = page.locator('button.bbl-page__toolbar-filter-btn');

    // ── Search ───────────────────────────────────────────────────────────────
    this.searchInput = page.locator('input.bbl-page__search-input');

    // ── Status tabs ──────────────────────────────────────────────────────────
    this.tabs        = page.locator('button.bbl-page__tab');
    this.tabActive   = page.locator('button.bbl-page__tab').filter({ hasText: /^Active$/i });
    this.tabInactive = page.locator('button.bbl-page__tab').filter({ hasText: /^Inactive$/i });
    this.tabAll      = page.locator('button.bbl-page__tab').filter({ hasText: /^All$/i });

    // ── View toggles ─────────────────────────────────────────────────────────
    this.listViewBtn = page.locator('button.bbl-page__view-btn[title="List view"]');
    this.cardViewBtn = page.locator('button.bbl-page__view-btn[title="Card view"]');

    // ── Table ─────────────────────────────────────────────────────────────────
    this.table        = page.locator('table.p-datatable-table');
    this.tableRows    = page.locator('tr.p-selectable-row');
    this.emptyMessage = page.locator('.p-datatable-emptymessage');

    // Column headers
    this.colGpSurgery = page.locator('th').filter({ hasText: /gp surgery/i }).first();
    this.colAddress   = page.locator('th').filter({ hasText: /^address$/i });
    this.colPostCode  = page.locator('th').filter({ hasText: /post\s*code/i });
    this.colOdsCode   = page.locator('th').filter({ hasText: /ods\s*code/i });
    this.colStatus    = page.locator('th').filter({ hasText: /^status$/i });
    this.colActions   = page.locator('th').filter({ hasText: /actions/i });

    // Row cell selectors
    this.cellTitle      = page.locator('td.col-title');
    this.cellAddress    = page.locator('td.col-addressLine1');
    this.cellPostCode   = page.locator('td.col-postCode');
    this.cellOdsCode    = page.locator('td.col-gpOdsCode');
    this.cellStatus     = page.locator('td.col-status');

    // ── Slide panel ───────────────────────────────────────────────────────────
    this.panel      = page.locator('.bsp-panel');
    this.panelOpen  = page.locator('.bsp-panel--open');
    this.panelBadge = page.locator('.bsp-panel__badge');
    this.panelTitle = page.locator('.bsp-panel__title').first();
    this.closeBtn   = page.locator('button.bsp-panel__close');

    // Form fields
    this.gpNameInput    = page.locator('#title');
    this.odsCodeInput   = page.locator('#gpOdsCode');
    this.address1Input  = page.locator('input[placeholder="Address Line 1"]');
    this.address2Input  = page.locator('input[placeholder="Address Line 2"]');
    this.address3Input  = page.locator('input[placeholder="Address Line 3"]');
    this.townInput      = page.locator('input[placeholder="e.g. London"]');
    this.countyInput    = page.locator('input[placeholder="e.g. West Sussex"]');
    this.postCodeInput  = page.locator('input[placeholder="SW1A 1AA"]');
    this.telephoneInput = page.locator('input[placeholder="+44"]');
    this.emailInput     = page.locator('input[type="email"]').first();
    this.websiteInput   = page.locator('input[placeholder="https://"]');

    // Status toggle
    this.statusToggle = page.locator('#isActive');

    // Panel action buttons
    this.saveBtn   = page.locator('button.bsp-btn.bsp-btn--primary');
    this.cancelBtn = page.locator('button.bsp-btn:not(.bsp-btn--primary)').first();

    // ── Confirm dialog ────────────────────────────────────────────────────────
    this.confirmDialog  = page.locator('.p-dialog.p-confirm-dialog');
    this.confirmYesBtn  = page.locator('.p-confirm-dialog-accept');
    this.confirmNoBtn   = page.locator('.p-confirm-dialog-reject');
    this.confirmMessage = page.locator('.p-dialog.p-confirm-dialog .p-confirm-dialog-message').first();

    // ── Inline errors ─────────────────────────────────────────────────────────
    this.inlineErrors = page.locator('.p-error, small.p-error, [class*="error-msg"], .ng-invalid ~ small');

    // Error banner
    this.errorBanner = page.locator(
      '.bsp-panel p-message[severity="error"], .bsp-panel .p-message-error, [role="alert"]'
    ).first();

    // ── Toast ─────────────────────────────────────────────────────────────────
    this.toast        = page.locator('p-toast');
    this.toastMessage = page.locator('p-toast .p-toast-detail, p-toast .p-toast-summary').first();

    // ── Paginator ─────────────────────────────────────────────────────────────
    this.paginator        = page.locator('p-paginator');
    this.paginatorLabel   = page.locator('.p-paginator-current');
    this.paginatorFirst   = page.locator('button[aria-label="First Page"]');
    this.paginatorPrev    = page.locator('button[aria-label="Previous Page"]');
    this.paginatorNext    = page.locator('button[aria-label="Next Page"]');
    this.paginatorLast    = page.locator('button[aria-label="Last Page"]');
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto() {
    await this.navigate('/app/gps');
    await this.dismissCookieBanner();
    await this.waitForElement(this.table, { timeout: 30_000 });
  }

  // ---------------------------------------------------------------------------
  // Toolbar
  // ---------------------------------------------------------------------------

  async clickAddGp() {
    await this.click(this.addGpBtn);
    await this.waitForElement(this.panel);
    await this.waitForAngular();
  }

  async clickExport() { await this.click(this.exportBtn); }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search(term) {
    await this.fillAngularInput(this.searchInput, term);
    await this.waitForAngular();
  }

  async clearSearch() {
    await this.searchInput.fill('');
    await this.searchInput.dispatchEvent('input');
    await this.waitForAngular();
  }

  // ---------------------------------------------------------------------------
  // Status tabs
  // ---------------------------------------------------------------------------

  async clickTab(status) {
    const tab = this.page.locator('button.bbl-page__tab').filter({
      hasText: new RegExp(`^${status}$`, 'i'),
    });
    await this.click(tab);
    await this.waitForAngular();
  }

  async getActiveTab() {
    return (await this.page.locator('button.bbl-page__tab--active').textContent())?.trim() || '';
  }

  // ---------------------------------------------------------------------------
  // Table helpers
  // ---------------------------------------------------------------------------

  async getRowCount() { return this.tableRows.count(); }

  async clickEditOnRow(index = 0) {
    await this.tableRows
      .nth(index)
      .locator('td.actions-column-cell button:not(.p-button-danger)')
      .first()
      .click();
    await this.waitForElement(this.panel);
    await this.waitForAngular();
  }

  async clickDeactivateOnRow(index = 0) {
    await this.tableRows
      .nth(index)
      .locator('td.actions-column-cell button.p-button-danger')
      .first()
      .click();
    await this.waitForElement(this.confirmDialog);
  }

  async getRowStatus(index = 0) {
    const cell = this.tableRows.nth(index).locator('td.col-status');
    const cls  = await cell.getAttribute('class') || '';
    if (cls.includes('val-1')) return 'Active';
    if (cls.includes('val-2')) return 'Inactive';
    return (await cell.textContent())?.trim() || '';
  }

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  async fillForm({
    gpName, odsCode,
    address1, address2, address3,
    town, county, postCode,
    telephone, email, website,
  } = {}) {
    if (gpName    !== undefined) await this.fillAngularInput(this.gpNameInput,    gpName);
    if (odsCode   !== undefined) await this.fillAngularInput(this.odsCodeInput,   odsCode);
    if (address1  !== undefined) await this.fillAngularInput(this.address1Input,  address1);
    if (address2  !== undefined) await this.fillAngularInput(this.address2Input,  address2);
    if (address3  !== undefined) await this.fillAngularInput(this.address3Input,  address3);
    if (town      !== undefined) await this.fillAngularInput(this.townInput,      town);
    if (county    !== undefined) await this.fillAngularInput(this.countyInput,    county);
    if (postCode  !== undefined) await this.fillAngularInput(this.postCodeInput,  postCode);
    if (telephone !== undefined) await this.fillAngularInput(this.telephoneInput, telephone);
    if (email     !== undefined) await this.fillAngularInput(this.emailInput,     email);
    if (website   !== undefined) await this.fillAngularInput(this.websiteInput,   website);
  }

  // ---------------------------------------------------------------------------
  // Panel actions
  // ---------------------------------------------------------------------------

  async clickSave()   { await this.click(this.saveBtn); }
  async clickCancel() { await this.click(this.cancelBtn); }
  async clickClose()  { await this.click(this.closeBtn); }

  // ---------------------------------------------------------------------------
  // Confirm dialog
  // ---------------------------------------------------------------------------

  async confirmDeactivate() { await this.click(this.confirmYesBtn); }
  async cancelDeactivate()  { await this.click(this.confirmNoBtn); }

  // ---------------------------------------------------------------------------
  // State queries
  // ---------------------------------------------------------------------------

  async isPanelOpen()    { return this.panelOpen.isVisible(); }
  async isSaveDisabled() { return !(await this.saveBtn.isEnabled()); }

  async getToastText() {
    await this.waitForElement(this.toast, { timeout: 8_000 });
    return this.getText(this.toastMessage);
  }

  async getPaginatorLabel() {
    return (await this.paginatorLabel.textContent())?.trim() || '';
  }
}

module.exports = { GpsPage };
