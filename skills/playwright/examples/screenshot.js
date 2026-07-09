#!/usr/bin/env node
/*
 * Capture a full-page screenshot (and PDF) of a URL — Node.js version.
 *
 * The Node Playwright binding is installed globally in this environment, so run
 * with NODE_PATH pointing at the global modules:
 *
 *     NODE_PATH=$(npm root -g) node examples/screenshot.js https://example.com
 *
 * Browsers are pre-installed; do NOT run `npx playwright install`.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'https://example.com';

(async () => {
  // Binary auto-resolves via PLAYWRIGHT_BROWSERS_PATH. Fallback if it ever fails:
  //   chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' })
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'page.png', fullPage: true });
    await page.pdf({ path: 'page.pdf' }); // Chromium headless only
    console.log(`Saved page.png and page.pdf for ${URL}`);
  } catch (err) {
    await page.screenshot({ path: 'error.png', fullPage: true });
    throw err;
  } finally {
    await context.close();
    await browser.close();
  }
})();
