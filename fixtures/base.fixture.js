const base = require('@playwright/test');
const fs = require('fs');
const { LoginPage }          = require('../pages/login.page');
const { DashboardPage }      = require('../pages/dashboard.page');
const { UsersPage }          = require('../pages/users.page');
const { DacsPage }           = require('../pages/dacs.page');
const { PharmaciesPage }     = require('../pages/pharmacies.page');
const { AccountsPage }       = require('../pages/accounts.page');
const { EmailTemplatesPage } = require('../pages/emailTemplates.page');
const { OrganizationsPage }  = require('../pages/organizations.page');
const { SystemConfigPage }   = require('../pages/systemConfig.page');
const { RolePermissionsPage }= require('../pages/rolePermissions.page');
const { LoginAuditPage }     = require('../pages/loginAudit.page');
const { DataAuditPage }      = require('../pages/dataAudit.page');
const { EditUserPage }       = require('../pages/editUser.page');
const config = require('../config/env.config');
const logger = require('../utils/logger');

const AUTH_STATE = '.auth/user.json';

async function ensureDashboardReady(page) {
  const loginPage = new LoginPage(page);

  await page.goto(config.homeUrl, { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  let loginFormVisible = await loginPage.emailInput.isVisible().catch(() => false);

  if (!loginFormVisible && !/\/app(\/|\?|$)/i.test(page.url())) {
    const landingState = await Promise.race([
      loginPage.emailInput.waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'login'),
      page.waitForURL(/\/app(\/|\?|$)/, { timeout: 10_000 }).then(() => 'app'),
    ]).catch(() => null);

    loginFormVisible = landingState === 'login';
  }

  if (/\/account\/login/i.test(page.url()) || loginFormVisible) {
    await loginPage.dismissCookieBanner();
    await loginPage.login(config.credentials.email, config.credentials.password);
    await page.waitForURL(/\/app(\/|\?|$)/, { timeout: 30_000 });
  }

  await loginPage.dismissCookieBanner();
}

async function newAuthenticatedPage(browser) {
  const contextOptions = fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {};
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await ensureDashboardReady(page);

  return { context, page };
}

const test = base.test.extend({
  config: async ({ }, use) => {
    await use(config);
  },

  page: async ({ page }, use) => {
    // The Coloplast cookie banner (.cookie-toast) re-appears on every navigation
    // and overlays the bottom of the page, intercepting pointer events on
    // controls like the role multiselect. Neutralise it deterministically on
    // every document load instead of racing to click "Got it".
    await page.addInitScript(() => {
      const inject = () => {
        if (document.getElementById('__pw_hide_cookie_toast')) return;
        const style = document.createElement('style');
        style.id = '__pw_hide_cookie_toast';
        style.textContent = '.cookie-toast{display:none !important;pointer-events:none !important;}';
        (document.head || document.documentElement).appendChild(style);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
      } else {
        inject();
      }
    });
    await use(page);
  },

  logger: async ({ }, use) => {
    await use(logger);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  usersPage: async ({ page }, use) => {
    await use(new UsersPage(page));
  },

  dacsPage: async ({ page }, use) => {
    await use(new DacsPage(page));
  },

  pharmaciesPage: async ({ page }, use) => {
    await use(new PharmaciesPage(page));
  },

  accountsPage: async ({ page }, use) => {
    await use(new AccountsPage(page));
  },

  emailTemplatesPage: async ({ page }, use) => {
    await use(new EmailTemplatesPage(page));
  },

  organizationsPage: async ({ page }, use) => {
    await use(new OrganizationsPage(page));
  },

  systemConfigPage: async ({ page }, use) => {
    await use(new SystemConfigPage(page));
  },

  rolePermissionsPage: async ({ page }, use) => {
    await use(new RolePermissionsPage(page));
  },

  loginAuditPage: async ({ page }, use) => {
    await use(new LoginAuditPage(page));
  },

  dataAuditPage: async ({ page }, use) => {
    await use(new DataAuditPage(page));
  },

  editUserPage: async ({ page }, use) => {
    await use(new EditUserPage(page));
  },

  authedRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: config.apiBaseUrl,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(context);
    await context.dispose();
  },

  prepareAuthenticatedPage: async ({ }, use) => {
    await use(ensureDashboardReady);
  },

  newAuthenticatedPage: async ({ }, use) => {
    await use(newAuthenticatedPage);
  },
});

module.exports = {
  test,
  expect: base.expect,
};
