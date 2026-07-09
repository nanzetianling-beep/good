#!/usr/bin/env python3
"""
Scheduled price / stock monitoring.

Reads the current price for a list of product URLs, compares against a saved
baseline, reports only what CHANGED, then persists the new baseline. Idempotent:
re-running without changes does nothing and reports nothing.

Robustness kit: per-SKU bounded retries with jittered backoff, jittered polite
delays between sites (no metronome fingerprint), structured JSON-lines logging,
screenshot + HTML artifacts on failure, last-known-value fallback so one bad
page never poisons the whole baseline.

Run it from cron / a systemd timer, e.g. daily at 08:00:
    0 8 * * *  cd /path/to/project && \
      PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python examples/monitor.py >> monitor.log 2>&1

For paywalled prices, log in first with examples/login.py and load its
storage_state here via browser.new_context(storage_state="auth.json").

Browsers are pre-installed at /opt/pw-browsers; do NOT run `playwright install`.
Python binding: `pip install playwright==1.56.0` (matches installed chromium-1194).
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

# Watch list: give each SKU a stable key and its product URL.
WATCH = {
    "widget-a": "https://example.com/products/widget-a",
    "widget-b": "https://example.com/products/widget-b",
}
BASELINE = pathlib.Path("prices.json")  # previous run's prices; safe to commit (no secrets)
ARTIFACT_DIR = pathlib.Path("artifacts")

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("monitor")


def log_event(event: str, **fields):
    log.info(json.dumps({"ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
                         "event": event, **fields},
                        ensure_ascii=False, default=str))


def dump_artifacts(page, tag: str):
    ARTIFACT_DIR.mkdir(exist_ok=True)
    try:
        page.screenshot(path=str(ARTIFACT_DIR / f"{tag}.png"), full_page=True)
        (ARTIFACT_DIR / f"{tag}.html").write_text(page.content())
        log_event("artifacts_saved", tag=tag, url=page.url)
    except Exception as exc:
        log_event("artifact_capture_failed", tag=tag, error=str(exc))


def retry(fn, attempts=3, label="task"):
    """Bounded attempts, full-jitter exponential backoff, transient errors only."""
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except (PWTimeoutError, PWError) as exc:
            if attempt == attempts:
                raise
            delay = random.uniform(0, min(30.0, 2.0 ** attempt))
            log_event("retrying", label=label, attempt=attempt,
                      error=str(exc).splitlines()[0], sleep_s=round(delay, 1))
            time.sleep(delay)


def polite_pause(base=1.0, jitter=1.5):
    """Jittered delay between page fetches — polite and non-fingerprintable."""
    time.sleep(base + random.uniform(0, jitter))


def parse_price(text: str):
    """Extract a float from strings like '$1,299.00' or '€ 89'."""
    m = re.search(r"[\d.]+", text.replace(",", ""))
    return float(m.group()) if m else None


def read_price(page, url: str):
    page.goto(url, wait_until="domcontentloaded")
    # Prefer a semantic hook; fall back to the first currency-looking text.
    # expect() below is the real wait — no networkidle needed.
    price_el = page.get_by_test_id("price")
    if not price_el.count():
        price_el = page.get_by_text(re.compile(r"[$€£]\s?\d")).first
    expect(price_el).to_be_visible()
    return parse_price(price_el.inner_text())


def report(changes: dict):
    """Replace with email/Slack/webhook as needed. Here: structured log lines."""
    for key, (old, new) in changes.items():
        log_event("price_change", sku=key, old=old, new=new)


def run():
    baseline = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}
    current = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # auto-resolved via PLAYWRIGHT_BROWSERS_PATH
        context = browser.new_context(
            viewport={"width": 1280, "height": 900}, locale="en-US"
        )
        context.set_default_timeout(15000)
        page = context.new_page()
        try:
            for key, url in WATCH.items():
                try:
                    current[key] = retry(lambda u=url: read_price(page, u),
                                         attempts=3, label=key)
                except Exception as exc:
                    dump_artifacts(page, f"monitor-{key}")
                    log_event("read_failed", sku=key, url=url,
                              error=str(exc).splitlines()[0])
                    current[key] = baseline.get(key)  # keep last known on failure
                    # A dead page can poison later reads — recycle it.
                    page.close()
                    page = context.new_page()
                polite_pause()
        finally:
            context.close()
            browser.close()

    changes = {
        k: (baseline.get(k), current[k])
        for k in current
        if current[k] is not None and baseline.get(k) != current[k]
    }
    if changes:
        report(changes)
    else:
        log_event("no_changes", skus=len(current))

    BASELINE.write_text(json.dumps(current, ensure_ascii=False, indent=2))
    return changes


if __name__ == "__main__":
    run()
