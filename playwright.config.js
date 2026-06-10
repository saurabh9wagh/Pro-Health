// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

const STORAGE_STATE = '.auth/user.json';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 2,

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
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  projects: [
    // 1) Auth setup — runs once, produces storageState used by other projects
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },

    // 2) Browser projects — depend on setup, reuse the saved storage state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
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

    // 3) Project for tests that should NOT use the saved auth state
    //    (e.g. login tests themselves, signup, password reset)
    {
      name: 'no-auth',
      testMatch: /.*\.noauth\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],

  outputDir: 'reports/test-output',
});
