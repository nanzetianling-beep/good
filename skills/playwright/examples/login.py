#!/usr/bin/env python3
"""
Log in once, save the authenticated session, then reuse it.

Pattern for membership sites / paywalled monitoring:
  1. First run  -> authenticate through the real login form, save storage_state.
  2. Later runs -> load storage_state and skip login entirely (until it expires).

storage_state captures cookies + localStorage + IndexedDB (rarely sessionStorage).

Credentials come from env vars — never hard-code them:
    export SITE_USER='me@example.com'
    export SITE_PASS='********'
    python examples/login.py

storage_state (auth.json) contains live cookies/tokens: treat it as a SECRET.
Add it (and playwright/.auth/) to .gitignore; never commit it.

Browsers are pre-installed; do NOT run `playwright install`.
"""
import os
import pathlib
from playwright.sync_api import sync_playwright, expect

LOGIN_URL = "https://example.com/login"
HOME_URL = "https://example.com/account"
AUTH_FILE = pathlib.Path("auth.json")  # SECRET — gitignored


def login_and_save(context):
    """Drive the real login form and persist the session."""
    page = context.new_page()
    page.goto(LOGIN_URL, wait_until="domcontentloaded")

    # Robust, user-facing locators — survive CSS/markup changes.
    page.get_by_label("Email").fill(os.environ["SITE_USER"])
    page.get_by_label("Password").fill(os.environ["SITE_PASS"])
    page.get_by_role("button", name="Sign in").click()

    # Confirm login succeeded by waiting for a known post-login element,
    # not a fixed sleep. If this times out, login failed (bad creds / CAPTCHA).
    expect(page.get_by_role("link", name="Log out")).to_be_visible(timeout=15000)

    context.storage_state(path=str(AUTH_FILE))  # cookies + localStorage + IndexedDB
    page.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # binary auto-resolved via PLAYWRIGHT_BROWSERS_PATH
        try:
            # Reuse a saved session if we have one; otherwise log in fresh.
            if AUTH_FILE.exists():
                context = browser.new_context(storage_state=str(AUTH_FILE))
            else:
                context = browser.new_context()
                login_and_save(context)

            context.set_default_timeout(15000)
            page = context.new_page()
            page.goto(HOME_URL, wait_until="domcontentloaded")

            # Detect a stale/expired session and re-authenticate once.
            if not page.get_by_role("link", name="Log out").is_visible():
                page.close()
                AUTH_FILE.unlink(missing_ok=True)
                login_and_save(context)
                page = context.new_page()
                page.goto(HOME_URL, wait_until="domcontentloaded")

            # --- authorized work goes here (post an update, read a paywalled price, etc.) ---
            name = page.get_by_role("heading").first.inner_text().strip()
            print(f"Logged in. Account page heading: {name!r}")

            context.close()
        finally:
            browser.close()


if __name__ == "__main__":
    run()
