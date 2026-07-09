#!/usr/bin/env python3
"""
Log in once, save the authenticated session, then reuse it.

Pattern for membership sites / paywalled monitoring:
  1. First run  -> authenticate through the real login form (pausing for a human
                   if the site asks for a 2FA/OTP code), save storage_state.
  2. Later runs -> load storage_state and skip login AND 2FA entirely
                   (until the session expires; then re-auth once and fail loudly).

storage_state captures cookies + localStorage + IndexedDB (rarely sessionStorage).

Credentials come from env vars — never hard-code them:
    export SITE_USER='me@example.com'
    export SITE_PASS='********'
    python examples/login.py

storage_state (auth.json) contains live cookies/tokens: treat it as a SECRET.
Add it (and playwright/.auth/) to .gitignore; never commit it.

Browsers are pre-installed at /opt/pw-browsers; do NOT run `playwright install`.
Python binding: `pip install playwright==1.56.0` (matches installed chromium-1194).
"""
import json
import logging
import os
import pathlib
import re
import sys
import time

from playwright.sync_api import expect, sync_playwright

LOGIN_URL = "https://example.com/login"
HOME_URL = "https://example.com/account"
AUTH_FILE = pathlib.Path("auth.json")  # SECRET — gitignored
ARTIFACT_DIR = pathlib.Path("artifacts")

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("login")


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


def handle_otp_if_present(page):
    """Pause-for-human 2FA: if an OTP step appears, ask the operator on stdin.

    Never bypass or defeat 2FA. In unattended runs (cron) we fail loudly with
    instructions instead of hanging forever waiting for a code nobody will type.
    """
    otp_field = page.get_by_label(
        re.compile(r"(verification|one.?time|2fa|otp).*code", re.I))
    try:
        otp_field.wait_for(state="visible", timeout=5000)
    except Exception:
        return  # no 2FA step this time
    if not sys.stdin.isatty():
        dump_artifacts(page, "otp-prompt")
        raise RuntimeError(
            "2FA code required but no human attached — run interactively once "
            "to seed auth.json, then unattended runs reuse the session.")
    code = input("Enter the one-time code sent to your device: ").strip()
    otp_field.fill(code)
    page.get_by_role("button", name=re.compile(r"verify|confirm", re.I)).click()
    log_event("otp_submitted")


def login_and_save(context):
    """Drive the real login form and persist the session."""
    page = context.new_page()
    try:
        page.goto(LOGIN_URL, wait_until="domcontentloaded")

        # Robust, user-facing locators — survive CSS/markup changes.
        page.get_by_label("Email").fill(os.environ["SITE_USER"])
        page.get_by_label("Password").fill(os.environ["SITE_PASS"])
        page.get_by_role("button", name="Sign in").click()

        handle_otp_if_present(page)

        # Confirm login succeeded by waiting for a known post-login element,
        # not a fixed sleep. Generous timeout: a human may be typing an OTP.
        # If this times out: bad creds, unexpected challenge, or layout change.
        expect(page.get_by_role("link", name="Log out")
               ).to_be_visible(timeout=120_000)

        context.storage_state(path=str(AUTH_FILE))  # cookies + localStorage + IndexedDB
        log_event("session_saved", path=str(AUTH_FILE))
    except Exception:
        dump_artifacts(page, "login-fail")
        raise
    finally:
        page.close()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # binary auto-resolved via PLAYWRIGHT_BROWSERS_PATH
        try:
            # Reuse a saved session if we have one; otherwise log in fresh.
            if AUTH_FILE.exists():
                context = browser.new_context(storage_state=str(AUTH_FILE))
                log_event("session_reused", path=str(AUTH_FILE))
            else:
                context = browser.new_context()
                login_and_save(context)

            context.set_default_timeout(15000)
            page = context.new_page()
            page.goto(HOME_URL, wait_until="domcontentloaded")

            # Detect a stale/expired session and re-authenticate ONCE.
            if not page.get_by_role("link", name="Log out").is_visible():
                log_event("session_stale", action="reauthenticating_once")
                page.close()
                AUTH_FILE.unlink(missing_ok=True)
                login_and_save(context)
                page = context.new_page()
                page.goto(HOME_URL, wait_until="domcontentloaded")
                # Still logged out after a fresh login -> stop, don't loop.
                expect(page.get_by_role("link", name="Log out")).to_be_visible()

            # --- authorized work goes here (post an update, read a paywalled price, etc.) ---
            name = page.get_by_role("heading").first.inner_text().strip()
            log_event("logged_in", heading=name)

            context.close()
        finally:
            browser.close()


if __name__ == "__main__":
    run()
