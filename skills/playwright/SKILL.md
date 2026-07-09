---
name: playwright
description: Natural-language-driven browser-automation engine built on Playwright. Use it to scrape data from websites, log into sites needing an ID/password, fill and submit forms, auto-post on membership sites, monitor competitor prices on a schedule, run end-to-end (e2e) flows, and capture screenshots or PDFs. Trigger whenever a task means "control a real browser", "scrape a page", "log in and do X", "fill this form", "watch a site for price/stock changes", "run an e2e check", or "screenshot a URL".
---

# Playwright

A natural-language-driven browser engine built on [Playwright](https://playwright.dev). Given an instruction like "log into example.com and post today's update" or "check the price of these 5 SKUs every morning", translate it into a small, robust Playwright script that navigates, waits, locates elements the way a human would, extracts data, and reports results.

## When to use

- **Scraping / data collection** — pull structured data (prices, listings, tables) from one or many pages, including JS-rendered content.
- **Authenticated automation** — sites requiring ID/password (and 2FA): log in once, save the session, then post/read/update (membership posting, paywalled reads).
- **Monitoring** — periodic competitor price checks, stock/availability watches, content-change alerts. See `examples/monitor.py`.
- **E2E / form flows** — fill multi-step forms, handle validation errors, click through wizards, assert on the result with web-first assertions.
- **Capture** — screenshots and PDFs of pages or specific elements.

Prefer this skill over raw `requests`/`curl` whenever the page renders content with JavaScript, sits behind a login, or needs interaction (clicks, typing, scrolling).

## Environment (read first)

Chromium and Playwright are **pre-installed**. Do **NOT** run `playwright install` or `npx playwright install` — the browser binaries already exist and there is no display server (always run **headless**).

- Browser binaries live under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` (`chromium-1194`, `chromium_headless_shell-1194`, `ffmpeg-1011`). Revision 1194 matches Playwright **1.56.x**.
- `/opt/pw-browsers/chromium` is a **stable symlink to the Chromium executable** — use it directly as the `executable_path` / `executablePath` fallback if auto-resolution ever fails:
  ```bash
  ls -l /opt/pw-browsers/chromium   # -> .../chromium-1194/chrome-linux/chrome
  ```
- **Python binding** is NOT installed by default. Install only the package, never the browsers — and **pin the version to match the browsers**: `pip install playwright==1.56.0`. Then `p.chromium.launch(headless=True)` auto-resolves the binary. (A newer unpinned version expects a different browser revision and launch fails with "Executable doesn't exist"; either pin, or pass `executable_path="/opt/pw-browsers/chromium"` — see `references/troubleshooting.md`.)
- **Node binding** IS installed globally (`playwright@1.56.1`). A script in an arbitrary directory won't resolve `require('playwright')` unless you point Node at the global modules:
  ```bash
  NODE_PATH=$(npm root -g) node examples/screenshot.js
  ```
  Same fallback: `chromium.launch({ headless: true })`, or `{ executablePath: '/opt/pw-browsers/chromium' }`.
- Outbound HTTPS goes through an agent proxy (Chromium picks it up from `HTTPS_PROXY` automatically; CA bundle at `/root/.ccr/ca-bundle.crt` is already trusted by the browser store). `net::ERR_TUNNEL_CONNECTION_FAILED` usually means the destination host is denied by egress policy — see `references/troubleshooting.md`.

Quick check before running: `python -c "import playwright"` / `NODE_PATH=$(npm root -g) node -e "require('playwright')"`.

## Reliable automation workflow

1. **Launch & context.** One `browser`, one `context` per identity/session. Set a realistic `user_agent`, `viewport`, and `locale`. Use a fresh context for isolation; reuse a saved `storage_state` to skip login.
2. **Navigate & wait for state.** `page.goto(url, wait_until="domcontentloaded")`, then wait on a concrete signal — a locator becoming visible (`expect(locator).to_be_visible()`) or the specific API response that feeds the UI (`page.expect_response`). `wait_for_load_state("networkidle")` is a blunt fallback: flaky on pages with polling/analytics. Never rely on a fixed `sleep()` as your primary wait. See `references/patterns.md` → "Waiting".
3. **Locate robustly (this is what makes scripts survive redesigns).** Prefer user-facing locators over CSS/XPath:
   - `get_by_role("button", name="Sign in")` — most resilient; mirrors the accessibility tree.
   - `get_by_label("Password")`, `get_by_placeholder(...)`, `get_by_text(...)`, `get_by_test_id(...)`.
   - Fall back to CSS/XPath only when nothing else works, and scope it tightly.
   - Locators auto-wait and auto-retry (actionability checks: visible, stable, enabled, receives events) — do not add manual waits before `.click()`/`.fill()`.
   - See `references/locators.md` for the full priority ladder and patterns (nth, filtering, chaining, frames, shadow DOM).
4. **Handle auth & cookies.** Log in through the form once, then `context.storage_state(path="auth.json")`. Reuse via `browser.new_context(storage_state="auth.json")` — this also skips 2FA on later runs. For sites with 2FA/OTP, use the pause-for-human pattern (`references/patterns.md`), never bypass it. Keep credentials in env vars, never hard-coded; treat `auth.json` as a **secret** and never commit it. See `examples/login.py`.
5. **Extract data.** Read via `locator.inner_text()`, `locator.get_attribute()`, `locator.all()`, or one-shot `evaluate_all`. Normalize (strip whitespace, parse numbers/currency) and emit structured output (JSON/CSV). For paginated/infinite-scroll/tabular sources, use the recipes in `references/patterns.md`.
6. **Capture when useful.** `page.screenshot(path=..., full_page=True)` or `locator.screenshot(...)`; `page.pdf(...)` (Chromium headless only). Great for monitoring diffs and debugging failures.
7. **Clean up.** Always `context.close()` / `browser.close()` in a `finally` (or use `with sync_playwright()`), even on error, to avoid leaked processes.

## Common tasks → recipe

| Goal | Approach | Where |
| --- | --- | --- |
| Scrape a listing / prices | fresh context → role/text locators → normalize → JSON; retry + logging kit | `examples/scrape.py` |
| Scrape many pages (Next / ?page=N / Load more) | bounded loop → wait on content change → dedupe by key | `references/patterns.md` → Pagination |
| Infinite-scroll feed | `mouse.wheel` loop until item count stops growing; capped rounds | `references/patterns.md` → Infinite scroll |
| HTML table → CSV | headers from `thead th`, rows via `all_inner_texts` or one-shot `evaluate` | `references/patterns.md` → Table extraction |
| Download a file (export button) | `page.expect_download()` armed before click → `save_as` | `references/patterns.md` → Downloads |
| Upload a file | `set_input_files(...)`; custom widgets via `expect_file_chooser` | `references/patterns.md` → Uploads |
| Element inside an iframe | `page.frame_locator(...)` then locate within | `references/patterns.md` → iframes |
| JS alert/confirm; link opens new tab | `page.once("dialog", ...)`; `page.expect_popup()` | `references/patterns.md` → Dialogs & popups |
| Wait for the API response feeding the UI | `page.expect_response(predicate)` armed before the trigger; use `.json()` directly | `references/patterns.md` → Waiting |
| Log in with ID/password | fill form → assert post-login element → save `storage_state` | `examples/login.py` |
| Login site asks for 2FA/OTP | pause-for-human: prompt operator on stdin, then save session | `references/patterns.md` → 2FA / OTP |
| Multi-step form with validation errors | race success-vs-alert after each step; one fix-up round, then fail loudly | `examples/form_fill.py` |
| Auto-post on a membership site | load saved `storage_state` → fill + submit → assert post rendered | `references/patterns.md` → Membership |
| Scheduled price monitoring | reuse session → read prices → diff vs baseline → report changes; cron | `examples/monitor.py` |
| Polite crawling / avoiding rate limits | jittered delays, full-jitter backoff, honor 429/`Retry-After` | `references/patterns.md` → Rate limiting |
| E2E flow | drive the steps → `expect(...)` web-first assertions on the outcome | `references/patterns.md` → E2E |
| Screenshot / PDF of a URL | `page.screenshot(full_page=True)` / `page.pdf(...)`, retries built in | `examples/screenshot.js` |
| **Anything failing** (timeouts, strict mode, detached, blocked, proxy/TLS) | diagnosis flows and fixes | `references/troubleshooting.md` |

## Scraping etiquette & anti-bot cautions

- **Respect the site.** Check `robots.txt` and Terms of Service. Only automate sites you own or are authorized to access.
- **Rate-limit with jitter.** Polite randomized delays between page fetches, concurrency 1 per site, honor `Retry-After` on 429 (`references/patterns.md` → Rate limiting).
- **Look human, don't cloak maliciously.** A real `user_agent`/viewport and `storage_state` reuse are fine; do not attempt to defeat CAPTCHAs, WAFs, or bot-detection to access data you aren't permitted to. Symptoms and the legitimate-mitigations list: `references/troubleshooting.md` → Bot detection.
- **Cache & be idempotent.** For monitoring, store previous results and only act on changes; avoid re-fetching unchanged pages.
- **Expect brittleness.** Sites change markup; role/text locators reduce breakage, but add checks that fail loudly with a screenshot + HTML dump when the page shape changes.

## Error handling & retries

- Wrap each unit of work; on failure capture screenshot + `page.content()` + URL before re-raising (`dump_artifacts()` in every example script).
- Retry transient failures with **bounded** attempts and full-jitter exponential backoff, using a **fresh page per attempt** — see `retry()` in `examples/scrape.py`. Never retry policy denials (403/407) or validation rejections.
- Set sane timeouts: `context.set_default_timeout(15000)`; bump only for known-slow pages, and only after ruling out the real causes (`references/troubleshooting.md` → TimeoutError).
- Distinguish "element not found yet" (wait on the right signal) from "logged out / blocked / layout changed" (stop and report). Detect logout by checking a known post-login element; re-authenticate once, then fail.
- Prefer web-first assertions (`expect(...).to_be_visible()`) which retry until timeout, over one-shot boolean checks.
- Emit structured logs (JSON lines — `log_event()` in the examples) so scheduled runs are greppable.

## Worked example (scrape, abridged)

```python
from playwright.sync_api import sync_playwright, expect
import json, re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)   # auto-resolved via PLAYWRIGHT_BROWSERS_PATH
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="en-US")
    context.set_default_timeout(15000)
    page = context.new_page()
    try:
        page.goto("https://example.com/products", wait_until="domcontentloaded")
        cards = page.get_by_role("listitem").filter(has=page.get_by_role("heading"))
        expect(cards.first).to_be_visible()      # the content itself is the ready signal
        results = [{"name": c.get_by_role("heading").inner_text().strip(),
                    "price": c.get_by_text(re.compile(r"[$€£]\s?\d")).first.inner_text()}
                   for c in cards.all()]
        print(json.dumps(results, ensure_ascii=False, indent=2))
    except Exception:
        page.screenshot(path="error.png", full_page=True)   # forensic snapshot
        raise
    finally:
        context.close(); browser.close()
```

The full production version — with `retry()`, JSON-lines logging, and artifact dumps — is `examples/scrape.py`. For login-then-act see `examples/login.py`; multi-step forms `examples/form_fill.py`; scheduled monitoring `examples/monitor.py`; Node capture `examples/screenshot.js`.

## Responsible & authorized use

Only automate sites you own or have explicit permission to access. Honor `robots.txt`, rate limits, and Terms of Service. Do not use this skill to bypass authentication you aren't entitled to, harvest personal data unlawfully, defeat anti-abuse controls (CAPTCHAs, WAFs, bot-detection, 2FA), or overload servers. Store credentials in environment variables or a secrets manager; never commit `storage_state`/`auth.json` or passwords. When in doubt about permission, ask before running.

## References

- `references/locators.md` — locator priority ladder, filtering/chaining, waiting, frames, anti-patterns.
- `references/patterns.md` — recipes: auth & 2FA, forms, pagination/infinite scroll, tables→CSV, downloads/uploads, iframes, dialogs/popups, network waiting, rate limiting, monitoring, e2e, Node.
- `references/troubleshooting.md` — TimeoutError diagnosis flow, strict-mode violations, detached/unstable elements, headless-vs-headed, bot-detection symptoms, proxy/TLS in this environment, crashes/leaks.

## Sources

- [Playwright — Locators](https://playwright.dev/docs/locators)
- [Playwright — Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright — Auto-waiting / actionability](https://playwright.dev/docs/actionability)
- [Playwright (Python) — Authentication / storageState](https://playwright.dev/python/docs/auth)
- [Playwright (Python) — Downloads / Dialogs / Frames / Network](https://playwright.dev/python/docs/downloads)
- [microsoft/playwright-mcp — official MCP browser-automation server](https://github.com/microsoft/playwright-mcp)
