// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

const STORAGE_STATE = '.auth/user.json';

// Run headed with maximized window by default; set HEADLESS=true for CI.
const isHeadless = process.env.HEADLESS === 'true';

// Headless has no window manager, so `--start-maximized` + viewport:null falls
// back to a tiny 800x600 window — which triggers the app's responsive CARD layout
// and hides the list/table. Use an explicit desktop viewport when headless so the
// grid renders in List view (matching a maximized headed run); keep viewport:null
// for headed so the real maximized window is used.
const desktopViewport = isHeadless ? { width: 1680, height: 950 } : null;

// Strip viewport/scale properties from a device so viewport:null + --start-maximized work.
const desktopChrome = (function () {
  const { deviceScaleFactor, isMobile, hasTouch, viewport, ...rest } = devices['Desktop Chrome'];
  return rest;
})();

// Open the (headed) browser on the secondary monitor. We point the window at the
// secondary screen's top-left via --window-position. On its own, --start-maximized
// is unreliable when combined with --window-position (Chromium treats the explicit
// position as a normal/restored placement and skips the maximize), so we ALSO pass
// --window-size set to the monitor's resolution. That guarantees a full-screen-sized
// window on the target monitor even when the maximize state doesn't take.
// Override for a different monitor layout/resolution via SCREEN_X / SCREEN_Y /
// SCREEN_WIDTH / SCREEN_HEIGHT (defaults match a 1920x1080 secondary screen at X=1920).
const screenX = process.env.SCREEN_X || '1920';
const screenY = process.env.SCREEN_Y || '0';
const screenWidth = process.env.SCREEN_WIDTH || '1920';
const screenHeight = process.env.SCREEN_HEIGHT || '1080';
const chromeArgs = [
  // Force a 1:1 device scale factor. Without this, Chromium interprets the
  // --window-position/--window-size values below in DIP scaled by the PRIMARY
  // monitor's factor (e.g. 150% -> x1.5), so physical values like 1920 land at
  // ~2880 and the window opens offset/oversized (only "half" shows on the target
  // screen). With scale factor 1, DIP == physical px, so the args map exactly to
  // the secondary monitor regardless of Windows display scaling.
  '--force-device-scale-factor=1',
  '--start-maximized',
  `--window-position=${screenX},${screenY}`,
  `--window-size=${screenWidth},${screenHeight}`,
];

module.exports = defineConfig({
  testDir: './tests',
  // The shared test server can be slow. Fixture setup + hooks all count against a
  // single test's timeout, and when the ~30-min session lapses the `page` fixture's
  // self-heal has to re-login (navigate -> wait for login form -> submit -> wait for
  // /app -> confirm shell) BEFORE beforeEach even runs its own navigation. On a slow
  // server that combined path can exceed 90s, so allow extra headroom. The re-login
  // persists fresh state, so only the first test after an expiry pays this cost.
  timeout: 150_000,
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
    viewport: desktopViewport,
    launchOptions: {
      args: chromeArgs,
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
        viewport: desktopViewport,
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
    // Firefox/WebKit only run for cross-browser sweeps (CROSS_BROWSER=true).
    // By default we run a single browser (chromium) so only ONE window opens.
    ...(process.env.CROSS_BROWSER === 'true'
      ? [
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
        ]
      : []),
    {
      name: 'no-auth',
      testMatch: /.*\.noauth\.spec\.js/,
      use: {
        ...desktopChrome,
        viewport: desktopViewport,
        storageState: { cookies: [], origins: [] },
      },
    },
  ],

  outputDir: 'reports/test-output',
});
