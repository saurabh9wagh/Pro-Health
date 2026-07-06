const base = require('@playwright/test');
const fs = require('fs');
const { LoginPage }          = require('../pages/login.page');
const { DashboardPage }      = require('../pages/dashboard.page');
const { UsersPage }          = require('../pages/users.page');
const { DacsPage }           = require('../pages/dacs.page');
const { PharmaciesPage }     = require('../pages/pharmacies.page');
const { EditUserPage }       = require('../pages/editUser.page');
const config = require('../config/env.config');
const logger = require('../utils/logger');

const AUTH_STATE = '.auth/user.json';

async function ensureDashboardReady(page) {
  const loginPage = new LoginPage(page);
  let reAuthenticated = false;

  await page.goto(config.homeUrl, { waitUntil: 'commit' });

  // Decide the landing state by waiting for a DEFINITIVE element, not the URL. On
  // an expired session the app COMMITS /app first and only then does the client-
  // side auth guard redirect to /account/login — so waitForURL(/app/) resolves at
  // that first commit and wrongly reports "authenticated", letting a dead session
  // slip through. Instead race the login form (→ expired, re-login) against an
  // authenticated-only element — the user/avatar control that renders only once
  // the app shell is up. Promise.any so a slow branch can't win by rejecting first.
  const landing = await Promise.any([
    loginPage.emailInput.waitFor({ state: 'visible', timeout: 40_000 }).then(() => 'login'),
    loginPage.avatarTrigger.waitFor({ state: 'visible', timeout: 40_000 }).then(() => 'app'),
  ]).catch(() => null);

  // Re-login unless we positively confirmed the authenticated shell (landing==='app').
  // This also covers the null case (neither appeared) and any stray /account/login.
  if (landing !== 'app' || /\/account\/login/i.test(page.url())) {
    await loginPage.dismissCookieBanner();
    await loginPage.login(config.credentials.email, config.credentials.password);
    await page.waitForURL(/\/app(\/|\?|$)/, { timeout: 30_000 });
    // Confirm the shell actually rendered (not just a transient /app commit).
    await loginPage.avatarTrigger.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    reAuthenticated = true;
  }

  await loginPage.dismissCookieBanner();
  return reAuthenticated;
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

    // Self-heal auth. The ProHealth server session is short-lived (~30 min), so the
    // storageState captured by the `setup` project can expire before — or during —
    // a run. When it does, the app redirects every route to /account/login and the
    // only element rendered is the login logo, so every locator times out (this is
    // the real cause behind the recurring `button.bbl-page__primary-btn` timeouts).
    // Verify the session up front and transparently re-login if it lapsed, then
    // persist the refreshed state so later tests/workers reuse it. Skipped for the
    // `no-auth` project, which intentionally starts logged-out, and `setup` itself.
    const projectName = base.test.info().project.name;
    if (projectName !== 'no-auth' && projectName !== 'setup') {
      const reAuthed = await ensureDashboardReady(page);
      if (reAuthed) {
        await page.context().storageState({ path: AUTH_STATE }).catch(() => {});
      }
    }

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
