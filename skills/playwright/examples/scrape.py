#!/usr/bin/env python3
"""
Collect product name + price from a listing page and print structured JSON.

Demonstrates the reliable workflow:
  launch -> realistic context -> navigate & wait on a signal ->
  robust role/text locators -> normalize -> emit JSON -> screenshot on failure.

Run: python examples/scrape.py
Browsers are pre-installed; do NOT run `playwright install`.
"""
import json
import re
from playwright.sync_api import sync_playwright, expect

URL = "https://example.com/products"


def parse_price(text: str):
    """Extract a float from strings like '$1,299.00' or '€ 89'."""
    m = re.search(r"[\d.]+", text.replace(",", ""))
    return float(m.group()) if m else None


def scrape():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # binaries auto-resolved via PLAYWRIGHT_BROWSERS_PATH
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        context.set_default_timeout(15000)
        page = context.new_page()
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle")  # let JS-rendered listings settle

            # Scope to product cards by role/structure, not fragile CSS classes.
            cards = page.get_by_role("listitem").filter(has=page.get_by_role("heading"))
            expect(cards.first).to_be_visible()

            results = []
            for card in cards.all():
                name = card.get_by_role("heading").inner_text().strip()
                price_text = card.get_by_text(re.compile(r"[$€£]\s?\d")).first.inner_text()
                results.append({"name": name, "price": parse_price(price_text)})

            print(json.dumps(results, ensure_ascii=False, indent=2))
            return results
        except Exception:
            page.screenshot(path="error.png", full_page=True)  # forensic snapshot for debugging
            raise
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    scrape()
