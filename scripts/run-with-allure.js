#!/usr/bin/env node
'use strict';

/**
 * Runs Playwright tests and drives the full Allure reporting pipeline:
 *
 *   Run Playwright Tests
 *         v
 *   Generate Allure Results   (done automatically by the allure-playwright reporter)
 *         v
 *   Generate Allure HTML Report
 *         v
 *   Open/Publish Report (optional)
 *         v
 *   Delete allure-results
 *         v
 *   Keep only the final HTML report
 *
 * Usage:
 *   node scripts/run-with-allure.js [playwright test args...]
 *   node scripts/run-with-allure.js tests/ui --grep @smoke
 *   ALLURE_OPEN=true node scripts/run-with-allure.js --grep @regression
 *   node scripts/run-with-allure.js --report-only   (skip the test run; just
 *                                                     generate + clean from
 *                                                     whatever results already exist)
 *
 * The Playwright test process's exit code is always preserved so CI still
 * fails the build on test failures, even though report generation succeeds.
 * If Allure generation itself fails, raw results are left in place for
 * troubleshooting instead of being deleted.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function arg(name, argv) {
  const flag = `--${name}=`;
  const hit = argv.find((a) => a.startsWith(flag));
  return hit ? hit.slice(flag.length) : null;
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}\n`);
  return spawnSync(command, args, { stdio: 'inherit', shell: true, cwd: ROOT });
}

function hasAnyFiles(dir) {
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

async function main() {
  const rawArgs = process.argv.slice(2);

  const reportOnly = rawArgs.includes('--report-only');
  const openReport = rawArgs.includes('--open') || process.env.ALLURE_OPEN === 'true';
  const resultsDirArg = arg('results-dir', rawArgs);
  const reportDirArg = arg('report-dir', rawArgs);
  const resultsDir = resultsDirArg ? path.resolve(ROOT, resultsDirArg) : path.join(ROOT, 'reports', 'allure-results');
  const reportDir = reportDirArg ? path.resolve(ROOT, reportDirArg) : path.join(ROOT, 'reports', 'allure-report');

  // Strip our own flags before forwarding the rest to `playwright test`.
  const playwrightArgs = rawArgs.filter(
    (a) => a !== '--report-only' && a !== '--open' && !a.startsWith('--results-dir=') && !a.startsWith('--report-dir=')
  );

  let testExitCode = 0;

  if (!reportOnly) {
    console.log('=== Step 1/5: Run Playwright Tests ===');
    const testRun = run('npx', ['playwright', 'test', ...playwrightArgs]);
    testExitCode = testRun.status ?? 1;
    // Step 2 (Generate Allure Results) happens automatically as a side
    // effect of the run above, via the allure-playwright reporter.
  } else {
    console.log('=== --report-only: skipping test run, using existing results ===');
  }

  if (!hasAnyFiles(resultsDir)) {
    console.warn(`\nNo Allure results found at ${resultsDir} — skipping report generation.`);
    process.exit(testExitCode);
  }

  // Carry forward the previous report's trend history so the new report
  // keeps the "History Trend" / "Retries" graphs across executions, even
  // though we discard the raw per-run JSON results below. This is the only
  // thing worth preserving between runs — everything else in
  // allure-results is disposable once the HTML report exists.
  const previousHistory = path.join(reportDir, 'history');
  const resultsHistory = path.join(resultsDir, 'history');
  if (fs.existsSync(previousHistory)) {
    console.log('\n=== Carrying forward previous report history (for trend graphs) ===');
    fs.cpSync(previousHistory, resultsHistory, { recursive: true });
  }

  console.log('\n=== Step 3/5: Generate Allure HTML Report ===');
  const generate = run('npx', ['allure', 'generate', resultsDir, '-o', reportDir, '--clean']);

  if (generate.status !== 0) {
    console.error(
      `\nAllure report generation failed (exit code ${generate.status}). ` +
      `Raw results were left in place at ${resultsDir} for troubleshooting.`
    );
    process.exit(testExitCode || 1);
  }

  console.log(`\nAllure HTML report generated: ${reportDir}`);

  console.log('\n=== Step 4/5: Open/Publish Report (optional) ===');
  if (openReport) {
    run('npx', ['allure', 'open', reportDir]);
  } else {
    console.log('Skipped (pass --open, or set ALLURE_OPEN=true, to open it automatically).');
  }

  console.log('\n=== Step 5/5: Delete allure-results (raw JSON no longer needed) ===');
  fs.rmSync(resultsDir, { recursive: true, force: true });
  console.log(`Removed: ${resultsDir}`);
  console.log(`\nFinal Allure HTML report kept at: ${reportDir}\n`);

  process.exit(testExitCode);
}

main();
