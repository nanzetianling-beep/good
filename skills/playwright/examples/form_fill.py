#!/usr/bin/env python3
"""
Multi-step form fill with validation-error handling.

Drives a 3-step signup/checkout-style wizard:
  step 1 (account) -> step 2 (address) -> step 3 (review) -> confirmation

The part most scripts get wrong: after every "Next"/"Submit" the page either
advances OR shows validation errors. This script races both outcomes, collects
the error messages (role=alert + aria-invalid fields), applies one round of
data fix-ups, retries once, and otherwise fails loudly with artifacts —
it never asserts success blindly and never loops forever on a rejected form.

Run: python examples/form_fill.py
Browsers are pre-installed at /opt/pw-browsers; do NOT run `playwright install`.
Python binding: `pip install playwright==1.56.0` (matches installed chromium-1194).
"""
import json
import logging
import pathlib
import time

from playwright.sync_api import expect, sync_playwright

FORM_URL = "https://example.com/signup"
ARTIFACT_DIR = pathlib.Path("artifacts")

# Field data per step: {accessible label: value}. Values come from your task;
# secrets (passwords etc.) should come from env vars, never literals.
STEP1 = {"Full name": "Ada Lovelace", "Email": "ada@example.com"}
STEP2 = {"Street address": "12 Analytical Way", "City": "London",
         "Postal code": "N1 9GU"}

# One round of corrections to try if the site rejects a value
# (e.g. it wants a stricter format). Keyed by a substring of the error text.
FIXUPS = {
    "postal": ("Postal code", "N19GU"),          # "invalid postal code" -> no space
    "phone": ("Phone", "+44 20 7946 0958"),      # demands international format
}

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("form_fill")


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


def fill_fields(page, fields: dict):
    for label, value in fields.items():
        page.get_by_label(label).fill(value)


def collect_validation_errors(page):
    """Gather visible error messages: role=alert texts + aria-invalid fields."""
    errors = [t.strip() for t in page.get_by_role("alert").all_inner_texts()
              if t.strip()]
    for bad in page.locator("[aria-invalid='true']").all():
        ident = (bad.get_attribute("name") or bad.get_attribute("id")
                 or bad.get_attribute("placeholder") or "?")
        errors.append(f"invalid field: {ident}")
    return errors


def advance_step(page, button_name: str, next_step_marker, step_tag: str):
    """Click Next/Submit, then wait for EITHER the next step OR an error.

    next_step_marker: a locator unique to the following step (so a silently
    rejected form can't fool us into asserting against the wrong step).
    Returns [] on success, list of error strings on rejection.
    """
    page.get_by_role("button", name=button_name).click()
    # Race: whichever appears first — the next step's marker or an alert.
    try:
        expect(next_step_marker.or_(page.get_by_role("alert").first)
               ).to_be_visible(timeout=10_000)
    except Exception:
        dump_artifacts(page, f"{step_tag}-stuck")
        raise  # neither advanced nor errored: layout change / hang — real bug
    if next_step_marker.is_visible():
        log_event("step_advanced", step=step_tag)
        return []
    errors = collect_validation_errors(page)
    log_event("validation_errors", step=step_tag, errors=errors)
    return errors


def apply_fixups(page, errors):
    """One corrective pass: fix fields the site complained about. Returns True
    if anything was changed (i.e. a retry is worthwhile)."""
    changed = False
    for err in errors:
        for needle, (label, better_value) in FIXUPS.items():
            if needle in err.lower():
                log_event("fixup_applied", field=label, error=err)
                page.get_by_label(label).fill(better_value)
                changed = True
    return changed


def submit_step(page, fields, button_name, next_step_marker, step_tag):
    """Fill -> advance; on validation errors, fix once and retry once."""
    fill_fields(page, fields)
    errors = advance_step(page, button_name, next_step_marker, step_tag)
    if errors and apply_fixups(page, errors):
        errors = advance_step(page, button_name, next_step_marker,
                              f"{step_tag}-retry")
    if errors:
        dump_artifacts(page, f"{step_tag}-rejected")
        raise ValueError(f"{step_tag} rejected after fix-ups: {errors}")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # auto-resolved via PLAYWRIGHT_BROWSERS_PATH
        context = browser.new_context(viewport={"width": 1280, "height": 900},
                                      locale="en-US")
        context.set_default_timeout(15000)
        page = context.new_page()
        try:
            page.goto(FORM_URL, wait_until="domcontentloaded")

            # Step 1: account details -> step 2 is marked by its heading.
            submit_step(page, STEP1, "Next",
                        page.get_by_role("heading", name="Shipping address"),
                        "step1-account")

            # Step 2: address -> step 3 marked by the review heading.
            submit_step(page, STEP2, "Next",
                        page.get_by_role("heading", name="Review your details"),
                        "step2-address")

            # Step 3: review & final submit. Check terms, then confirm.
            page.get_by_label("I agree to the terms").check()
            submit_step(page, {}, "Submit",
                        page.get_by_text("Thanks — your registration is confirmed"),
                        "step3-review")

            log_event("form_complete", url=page.url)
        except Exception:
            dump_artifacts(page, "form-fail")
            raise
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    run()
