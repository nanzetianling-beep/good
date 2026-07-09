---
name: playwright
description: Natural-language-driven browser-automation engine built on Playwright. Use it to scrape data from websites, log into sites needing an ID/password, fill and submit forms, auto-post on membership sites, monitor competitor prices on a schedule, run end-to-end (e2e) flows, and capture screenshots or PDFs. Trigger whenever a task means "control a real browser", "scrape a page", "log in and do X", "fill this form", "watch a site for price/stock changes", "run an e2e check", or "screenshot a URL".
---

# Playwright

A natural-language-driven browser engine built on [Playwright](https://playwright.dev). Given an instruction like "log into example.com and post today's update" or "check the price of these 5 SKUs every morning", translate it into a small, robust Playwright script that navigates, waits, locates elements the way a human would, extracts data, and reports results.

## When to use

- **Scraping / data collection** — pull structured data (prices, listings, tables) from one or many pages, including JS-rendered content.
- **Authenticated automation** — sites requiring ID/password: log in once, save the session, then post/read/update (membership posting, paywalled reads).
- **Monitoring** — periodic competitor price checks, stock/availability watches, content-change alerts. See `examples/monitor.py`.
- **E2E / form flows** — fill multi-step forms, click through wizards, assert on the result with web-first assertions.
- **Capture** — screenshots and PDFs of pages or specific elements.

Prefer this skill over raw `requests`/`curl` whenever the page renders content with JavaScript, sits behind a login, or needs interaction (clicks, typing, scrolling).

## Environment (read first)

Chromium and Playwright are **pre-installed**. Do **NOT** run `playwright install` or `npx playwright install` — the browser binaries already exist and there is no display server (always run **headless**).

- Browser binaries live under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` (`chromium-1194`, `chromium_headless_shell-1194`, `ffmpeg-1011`).
- `/opt/pw-browsers/chromium` is a **stable symlink to the Chromium executable** — use it directly as the `executable_path` / `executablePath` fallback if auto-resolution ever fails:
  ```bash
  ls -l /opt/pw-browsers/chromium   # -> .../chromium-1194/chrome-linux/chrome
  ```
- **Python binding** is NOT installed by default. Install only the package, never the browsers: `pip install playwright`. With `PLAYWRIGHT_BROWSERS_PATH` set, `p.chromium.launch(headless=True)` resolves the binary automatically; fall back to `executable_path="/opt/pw-browsers/chromium"` only if launch fails.
- **Node binding** IS installed globally (`playwright@1.56.1`). A script in an arbitrary directory won't resolve `require('playwright')` unless you point Node at the global modules:
  ```bash
  NODE_PATH=$(npm root -g) node examples/screenshot.js
  ```
  Same fallback: `chromium.launch({ headless: true })`, or `{ executablePath: '/opt/pw-browsers/chromium' }`.

Quick check before running: `python -c "import playwright"` / `NODE_PATH=$(npm root -g) node -e "require('playwright')"`.

## Reliable automation workflow

1. **Launch & context.** One `browser`, one `context` per identity/session. Set a realistic `user_agent`, `viewport`, and `locale`. Use a fresh context for isolation; reuse a saved `storage_state` to skip login.
2. **Navigate & wait for state.** `page.goto(url, wait_until="domcontentloaded")`, then wait on a concrete signal — a locator becoming visible (`expect(locator).to_be_visible()`) or `page.wait_for_load_state("networkidle")` for XHR-heavy pages. Never rely on a fixed `sleep()` as your primary wait.
3. **Locate robustly (this is what makes scripts survive redesigns).** Prefer user-facing locators over CSS/XPath:
   - `get_by_role("button", name="Sign in")` — most resilient; mirrors the accessibility tree.
   - `get_by_label("Password")`, `get_by_placeholder(...)`, `get_by_text(...)`, `get_by_test_id(...)`.
   - Fall back to CSS/XPath only when nothing else works, and scope it tightly.
   - Locators auto-wait and auto-retry (actionability checks: visible, stable, enabled, receives events) — do not add manual waits before `.click()`/`.fill()`.
   - See `references/locators.md` for the full priority ladder and patterns (nth, filtering, chaining, frames, shadow DOM).
4. **Handle auth & cookies.** Log in through the form once, then `context.storage_state(path="auth.json")`. Reuse via `browser.new_context(storage_state="auth.json")`. `storage_state` captures cookies + localStorage + IndexedDB (rarely sessionStorage). Keep credentials in env vars, never hard-coded; treat `auth.json` as a **secret** and never commit it. See `examples/login.py` and `references/patterns.md`.
5. **Extract data.** Read via `locator.inner_text()`, `locator.get_attribute()`, `locator.all()`, or `page.eval_on_selector_all(...)`. Normalize (strip whitespace, parse numbers/currency) and emit structured output (JSON/CSV).
6. **Capture when useful.** `page.screenshot(path=..., full_page=True)` or `locator.screenshot(...)`; `page.pdf(...)` (Chromium headless only). Great for monitoring diffs and debugging failures.
7. **Clean up.** Always `context.close()` / `browser.close()` in a `finally` (or use `with sync_playwright()`), even on error, to avoid leaked processes.

## Common tasks → recipe

| Goal | Approach | Example |
| --- | --- | --- |
| Scrape a listing / prices | fresh context → role/text locators → normalize → JSON | `examples/scrape.py` |
| Log in with ID/password | fill form → assert post-login element → save `storage_state` | `examples/login.py` |
| Auto-post on a membership site | load saved `storage_state` → fill + submit the post form → assert it appears | `references/patterns.md` |
| Scheduled price monitoring | reuse session → read prices → diff against saved baseline → report changes; run from cron/scheduler | `examples/monitor.py` |
| E2E flow / form fill | drive the steps → `expect(...)` web-first assertions on the outcome | `references/patterns.md` |
| Screenshot / PDF of a URL | `page.screenshot(full_page=True)` / `page.pdf(...)` | `examples/screenshot.js` |

## Scraping etiquette & anti-bot cautions

- **Respect the site.** Check `robots.txt` and Terms of Service. Only automate sites you own or are authorized to access.
- **Rate-limit.** Add polite delays between requests (`page.wait_for_timeout(500-2000)`), randomize a little, and limit concurrency. Aggressive crawling gets you blocked and harms the site.
- **Look human, don't cloak maliciously.** A real `user_agent` and viewport are fine; do not attempt to defeat CAPTCHAs, WAFs, or bot-detection to access data you aren't permitted to.
- **Cache & be idempotent.** For monitoring, store previous results and only act on changes; avoid re-fetching unchanged pages.
- **Expect brittleness.** Sites change markup; role/text locators reduce breakage, but add checks that fail loudly with a screenshot when the page shape changes.

## Error handling & retries

- Wrap navigation and interactions; on failure, capture a screenshot + `page.content()` snapshot for diagnosis before re-raising.
- Retry transient failures (timeouts, 5xx, flaky network) with **bounded** exponential backoff — not infinite loops.
- Set sane timeouts: `context.set_default_timeout(15000)`; bump only for known-slow pages.
- Distinguish "element not found yet" (retry/wait) from "logged out / blocked / layout changed" (stop and report). Detect logout by checking for a known post-login element; if absent, re-authenticate once, then fail.
- Prefer web-first assertions (`expect(...).to_be_visible()`) which retry until timeout, over one-shot boolean checks.
- Sessions expire: refresh `storage_state` periodically, and keep separate files per user role (admin/user/guest) when you need more than one identity.

## Worked example (scrape)

```python
# examples/scrape.py — collect product name + price from a listing page
import json, re
from playwright.sync_api import sync_playwright, expect

URL = "https://example.com/products"

def parse_price(text: str):
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
            page.wait_for_load_state("networkidle")

            # Robust: scope to product cards by role/structure, not fragile CSS classes.
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
            page.screenshot(path="error.png", full_page=True)  # forensic snapshot
            raise
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    scrape()
```

Run: `python examples/scrape.py`. For the login-then-act pattern (membership posting, price checks behind a paywall) see `examples/login.py`; for scheduled monitoring see `examples/monitor.py`; for auth/form/e2e patterns see `references/patterns.md`.

## Responsible & authorized use

Only automate sites you own or have explicit permission to access. Honor `robots.txt`, rate limits, and Terms of Service. Do not use this skill to bypass authentication you aren't entitled to, harvest personal data unlawfully, defeat anti-abuse controls (CAPTCHAs, WAFs, bot-detection), or overload servers. Store credentials in environment variables or a secrets manager; never commit `storage_state`/`auth.json` or passwords. When in doubt about permission, ask before running.

## Sources

- [Playwright — Locators](https://playwright.dev/docs/locators)
- [Playwright — Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright — Auto-waiting / actionability](https://playwright.dev/docs/actionability)
- [Playwright (Python) — Authentication / storageState](https://playwright.dev/python/docs/auth)
- [microsoft/playwright-mcp — official MCP browser-automation server](https://github.com/microsoft/playwright-mcp)
