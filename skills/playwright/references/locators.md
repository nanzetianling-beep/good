# Robust Locators — priority ladder & patterns

Locators are Playwright's core abstraction: they auto-wait and auto-retry, running
actionability checks (visible, stable, enabled, receives events) before every action.
That means **you almost never need manual waits before `.click()`/`.fill()`**.

## Priority ladder (prefer top, avoid bottom)

Choose the first that fits — higher entries survive redesigns because they match how a
user (and assistive tech) perceives the page, not implementation details.

1. `get_by_role(role, name=...)` — by ARIA role + accessible name. Most resilient.
   `page.get_by_role("button", name="Submit")`, `get_by_role("link", name="Docs")`,
   `get_by_role("textbox", name="Email")`, `get_by_role("heading", name="Cart")`.
2. `get_by_label("Password")` — form fields tied to a `<label>`. Ideal for inputs.
3. `get_by_placeholder("Search…")` — inputs without a label.
4. `get_by_text("Sign in")` — visible text; pass `exact=True` or a regex to disambiguate.
5. `get_by_alt_text(...)` / `get_by_title(...)` — images and title tooltips.
6. `get_by_test_id("checkout")` — stable `data-testid` hooks (configure the attribute if the site uses a different name).
7. **CSS / XPath (last resort)** — `page.locator("css=.price")`, `page.locator("xpath=…")`.
   Fragile: class renames and DOM refactors break them. Scope tightly; never chain long
   brittle paths.

## Narrowing & combining

```python
# Filter a collection by contained content
row = page.get_by_role("row").filter(has_text="Invoice #42")
card = page.get_by_role("listitem").filter(has=page.get_by_role("heading"))

# Pick one of many
page.get_by_role("button", name="Delete").first
page.get_by_role("listitem").nth(2)

# Chain to scope within a region (avoids matching the whole page)
page.get_by_role("navigation").get_by_role("link", name="Pricing")

# Logical combinators
page.get_by_role("button", name="Save").and_(page.get_by_title("Save changes"))
page.get_by_role("button", name="New").or_(page.get_by_role("button", name="Create"))
```

## Waiting the right way

```python
from playwright.sync_api import expect

# Web-first assertions retry until timeout — use these instead of boolean checks.
expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
expect(page.get_by_test_id("cart-count")).to_have_text("3")

# Page-level load signals
page.goto(url, wait_until="domcontentloaded")   # DOM ready
page.wait_for_load_state("networkidle")          # XHR-heavy SPAs settle
page.wait_for_url("**/dashboard")                # after a redirect/login

# Wait for a specific network response (e.g., an API that feeds the table)
with page.expect_response(lambda r: "/api/products" in r.url and r.ok) as resp:
    page.get_by_role("button", name="Load more").click()
```

`expect(...)` assertions retry until a timeout (default 5s; raise per-call with
`to_be_visible(timeout=15000)` or globally via `page.set_default_timeout(...)`).
Avoid `page.wait_for_timeout(...)` as a primary wait — use it only for deliberate,
polite rate-limiting between scrape steps.

## Frames & shadow DOM

```python
# iframes: get a frame locator, then locate inside it
frame = page.frame_locator("iframe[title='payment']")
frame.get_by_label("Card number").fill("4242 4242 4242 4242")

# Open shadow DOM is pierced automatically by role/text/CSS locators — no special API needed.
```

## Actions cheat-sheet

```python
loc.click(); loc.fill("text"); loc.press("Enter"); loc.check(); loc.select_option("US")
loc.set_input_files("path.pdf"); loc.hover(); loc.scroll_into_view_if_needed()
loc.inner_text(); loc.text_content(); loc.get_attribute("href"); loc.all()
loc.screenshot(path="el.png")
```

## Anti-patterns

- Long CSS/XPath chains tied to layout (`div > div:nth-child(3) > span.a.b`).
- `time.sleep()` to "let the page load" — flaky and slow; wait on a signal instead.
- Selecting by auto-generated/hashed class names (`.css-1x2y3z`).
- Asserting on a boolean (`if loc.is_visible()`) when you mean "wait until visible"
  (`expect(loc).to_be_visible()`).
