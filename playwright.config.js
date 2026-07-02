// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

const STORAGE_STATE = '.auth/user.json';

// Run headed with maximized window by default; set HEADLESS=true for CI.
const isHeadless = process.env.HEADLESS === 'true';

// Strip viewport/scale properties from a device so viewport:null + --start-maximized work.
const desktopChrome = (function () {
  const { deviceScaleFactor, isMobile, hasTouch, viewport, ...rest } = devices['Desktop Chrome'];
  return rest;
})();

module.exports = defineConfig({
  testDir: './tests',
  // The shared test server can be slow; allow headroom so navigations/actions
  // don't fail purely on latency.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Locally use a single worker so only ONE browser window opens at a time
  // (parallel workers each launch their own browser). CI can parallelise.
  workers: process.env.CI ? 2 : 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'reports/allure-results',
      suiteTitle: false,
      environmentInfo: {
        framework: 'Playwright',
        node: process.version,
        platform: process.platform,
        environment: process.env.ENVIRONMENT || 'test',
      },
    }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://coloplast-prohealth-test.bbsystemstest.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: isHeadless,
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: {
        ...desktopChrome,
        viewport: null,
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'no-auth',
      testMatch: /.*\.noauth\.spec\.js/,
      use: {
        ...desktopChrome,
        viewport: null,
        storageState: { cookies: [], origins: [] },
      },
    },
  ],

  outputDir: 'reports/test-output',
});
