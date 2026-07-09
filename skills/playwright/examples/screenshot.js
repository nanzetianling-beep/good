#!/usr/bin/env node
/*
 * Capture a full-page screenshot (and PDF) of a URL — Node.js version,
 * with bounded jittered retries and structured JSON-lines logging.
 *
 * The Node Playwright binding is installed globally in this environment, so run
 * with NODE_PATH pointing at the global modules:
 *
 *     NODE_PATH=$(npm root -g) node examples/screenshot.js https://example.com [outfile-prefix]
 *
 * Browsers are pre-installed at /opt/pw-browsers; do NOT run `npx playwright install`.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'https://example.com';
const PREFIX = process.argv[3] || 'page';

function logEvent(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run fn() up to `attempts` times with full-jitter exponential backoff.
 * Each attempt gets fresh state (fn creates its own page), so a poisoned
 * page is never reused.
 */
async function retry(fn, { attempts = 3, label = 'task' } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) {
        logEvent('giving_up', { label, attempts });
        throw err;
      }
      const delayMs = Math.random() * Math.min(30_000, 2 ** attempt * 1000);
      logEvent('retrying', {
        label,
        attempt,
        error: String(err.message || err).split('\n')[0],
        sleep_s: Math.round(delayMs / 100) / 10,
      });
      await sleep(delayMs);
    }
  }
}

async function captureOnce(context) {
  const page = await context.newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    // Rough settle for JS-rendered pages; fine for capture. For scraping,
    // prefer waiting on a specific locator/response (see references/patterns.md).
    await page.waitForLoadState('networkidle').catch(() => {
      logEvent('networkidle_timeout_ignored', { url: URL }); // busy pages never idle
    });
    await page.screenshot({ path: `${PREFIX}.png`, fullPage: true });
    await page.pdf({ path: `${PREFIX}.pdf` }); // Chromium headless only
    logEvent('captured', { url: URL, png: `${PREFIX}.png`, pdf: `${PREFIX}.pdf` });
  } catch (err) {
    // Forensic snapshot at the failure point, then let retry() decide.
    await page.screenshot({ path: `${PREFIX}-error.png`, fullPage: true }).catch(() => {});
    logEvent('capture_failed', { url: page.url(), error: String(err.message || err).split('\n')[0] });
    throw err;
  } finally {
    await page.close();
  }
}

(async () => {
  // Binary auto-resolves via PLAYWRIGHT_BROWSERS_PATH. Fallback if it ever fails:
  //   chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' })
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });
  context.setDefaultTimeout(15000);
  try {
    await retry(() => captureOnce(context), { attempts: 3, label: 'screenshot' });
  } catch (err) {
    process.exitCode = 1; // fail loudly for cron/CI callers
  } finally {
    await context.close();
    await browser.close();
  }
})();
