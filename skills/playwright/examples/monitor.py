#!/usr/bin/env python3
"""
Scheduled price / stock monitoring.

Reads the current price for a list of product URLs, compares against a saved
baseline, reports only what CHANGED, then persists the new baseline. Idempotent:
re-running without changes does nothing and reports nothing.

Run it from cron / a systemd timer, e.g. daily at 08:00:
    0 8 * * *  cd /path/to/project && \
      PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python examples/monitor.py >> monitor.log 2>&1

For paywalled prices, log in first with examples/login.py and load its
storage_state here via browser.new_context(storage_state="auth.json").

Browsers are pre-installed; do NOT run `playwright install`.
"""
import json
import pathlib
import re
from playwright.sync_api import sync_playwright, expect

# Watch list: give each SKU a stable key and its product URL.
WATCH = {
    "widget-a": "https://example.com/products/widget-a",
    "widget-b": "https://example.com/products/widget-b",
}
BASELINE = pathlib.Path("prices.json")  # previous run's prices; safe to commit (no secrets)


def parse_price(text: str):
    """Extract a float from strings like '$1,299.00' or '€ 89'."""
    m = re.search(r"[\d.]+", text.replace(",", ""))
    return float(m.group()) if m else None


def read_price(page, url: str):
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    # Prefer a semantic hook; fall back to the first currency-looking text.
    price_el = page.get_by_test_id("price")
    if not price_el.count():
        price_el = page.get_by_text(re.compile(r"[$€£]\s?\d")).first
    expect(price_el).to_be_visible()
    return parse_price(price_el.inner_text())


def report(changes: dict):
    """Replace with email/Slack/webhook as needed. Here: print a diff."""
    for key, (old, new) in changes.items():
        arrow = "→"
        print(f"[PRICE CHANGE] {key}: {old} {arrow} {new}")


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
                    current[key] = read_price(page, url)
                except Exception:
                    page.screenshot(path=f"error-{key}.png", full_page=True)
                    current[key] = baseline.get(key)  # keep last known on failure
                page.wait_for_timeout(1000)  # polite delay between requests
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
        print("No price changes.")

    BASELINE.write_text(json.dumps(current, ensure_ascii=False, indent=2))
    return changes


if __name__ == "__main__":
    run()
