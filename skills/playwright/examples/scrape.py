#!/usr/bin/env python3
"""
Collect product name + price from a listing page and print structured JSON.

Demonstrates the reliable workflow:
  launch -> realistic context -> navigate & wait on a signal ->
  robust role/text locators -> normalize -> emit JSON
plus the robustness kit shared by all examples:
  * retry()        — bounded attempts, jittered exponential backoff,
                     fresh page per attempt (a poisoned page never gets reused)
  * log_event()    — structured JSON-lines logging (grep/jq friendly)
  * dump_artifacts() — screenshot + HTML + URL captured at the failure point

Run: python examples/scrape.py
Browsers are pre-installed at /opt/pw-browsers; do NOT run `playwright install`.
Python binding: `pip install playwright==1.56.0` (matches installed chromium-1194;
other versions need executable_path="/opt/pw-browsers/chromium").
"""
import json
import logging
import pathlib
import random
import re
import time

from playwright.sync_api import Error as PWError
from playwright.sync_api import TimeoutError as PWTimeoutError
from playwright.sync_api import expect, sync_playwright

URL = "https://example.com/products"
ARTIFACT_DIR = pathlib.Path("artifacts")

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("scrape")


def log_event(event: str, **fields):
    """Structured JSON-lines log record: one event per line."""
    log.info(json.dumps({"ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
                         "event": event, **fields},
                        ensure_ascii=False, default=str))


def dump_artifacts(page, tag: str):
    """Forensic snapshot at the failure point: screenshot + DOM + URL."""
    ARTIFACT_DIR.mkdir(exist_ok=True)
    try:
        page.screenshot(path=str(ARTIFACT_DIR / f"{tag}.png"), full_page=True)
        (ARTIFACT_DIR / f"{tag}.html").write_text(page.content())
        log_event("artifacts_saved", tag=tag, url=page.url)
    except Exception as exc:  # never let diagnostics mask the real error
        log_event("artifact_capture_failed", tag=tag, error=str(exc))


def retry(fn, attempts=3, label="task"):
    """Run fn() with bounded, jittered exponential backoff on Playwright errors.

    Retries transient failures (timeouts, navigation errors). Anything else —
    assertion errors, parsing bugs — is a real failure and raises immediately.
    """
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except (PWTimeoutError, PWError) as exc:
            if attempt == attempts:
                log_event("giving_up", label=label, attempts=attempts)
                raise
            delay = random.uniform(0, min(30.0, 2.0 ** attempt))  # full jitter
            log_event("retrying", label=label, attempt=attempt,
                      error=str(exc).splitlines()[0], sleep_s=round(delay, 1))
            time.sleep(delay)


def parse_price(text: str):
    """Extract a float from strings like '$1,299.00' or '€ 89'."""
    m = re.search(r"[\d.]+", text.replace(",", ""))
    return float(m.group()) if m else None


def scrape_listing(context):
    """One full attempt on a fresh page. Raises on failure (retry() re-runs it)."""
    page = context.new_page()
    try:
        page.goto(URL, wait_until="domcontentloaded")

        # Scope to product cards by role/structure, not fragile CSS classes,
        # and wait on the content itself (not networkidle) as the ready signal.
        cards = page.get_by_role("listitem").filter(has=page.get_by_role("heading"))
        expect(cards.first).to_be_visible(timeout=15000)

        results = []
        for card in cards.all():
            name = card.get_by_role("heading").inner_text().strip()
            price_text = card.get_by_text(re.compile(r"[$€£]\s?\d")).first.inner_text()
            results.append({"name": name, "price": parse_price(price_text)})
        log_event("extracted", url=URL, items=len(results))
        return results
    except Exception:
        dump_artifacts(page, "scrape-fail")
        raise
    finally:
        page.close()


def scrape():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # auto-resolved via PLAYWRIGHT_BROWSERS_PATH
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        context.set_default_timeout(15000)
        try:
            results = retry(lambda: scrape_listing(context), attempts=3, label="scrape")
            print(json.dumps(results, ensure_ascii=False, indent=2))
            return results
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    scrape()
