# Patterns — auth, form fill, membership posting, monitoring, e2e, Node

Task-oriented recipes that build on the core workflow in `SKILL.md`. All snippets run
headless and rely on `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` being set (it is).

## Authentication & session reuse

`storage_state` captures **cookies + localStorage + IndexedDB** (rarely sessionStorage).
Log in once, save it, and reuse it so later runs skip the login form entirely.

```python
# First run: authenticate, verify success, persist the session.
context = browser.new_context()
page = context.new_page()
page.goto("https://example.com/login", wait_until="domcontentloaded")
page.get_by_label("Email").fill(os.environ["SITE_USER"])
page.get_by_label("Password").fill(os.environ["SITE_PASS"])
page.get_by_role("button", name="Sign in").click()
# Verify BEFORE saving — never save a logged-out state.
expect(page.get_by_role("link", name="Log out")).to_be_visible(timeout=15000)
context.storage_state(path="auth.json")          # SECRET — .gitignore, never commit

# Later runs: start already authenticated.
context = browser.new_context(storage_state="auth.json")
```

Security & maintenance:
- Keep `auth.json` out of version control (add `auth.json`, `playwright/.auth/` to `.gitignore`).
- Sessions expire — refresh periodically; detect a stale session by the absence of a
  known post-login element and re-authenticate once, then fail loudly.
- Use separate state files per role (`admin.json`, `user.json`) when you need more than one identity.

## Form fill & submit

```python
page.get_by_label("Full name").fill("Ada Lovelace")
page.get_by_label("Country").select_option("US")          # <select>
page.get_by_role("radio", name="Standard shipping").check()
page.get_by_label("I agree").check()                       # checkbox
page.get_by_label("Attachment").set_input_files("invoice.pdf")
page.get_by_role("button", name="Submit").click()
# Assert the outcome, don't sleep-and-hope.
expect(page.get_by_text("Thanks — your order is confirmed")).to_be_visible()
```

## Auto-post on a membership / community site

Reuse the saved session, fill the post form, submit, and confirm the post rendered.

```python
context = browser.new_context(storage_state="auth.json")   # already logged in
page = context.new_page()
page.goto("https://example.com/new-post", wait_until="domcontentloaded")

# If the session died, re-auth once (see Authentication above), else stop.
if not page.get_by_role("button", name="Publish").is_visible():
    raise RuntimeError("session expired — re-authenticate")

page.get_by_label("Title").fill("Weekly update")
page.get_by_role("textbox", name="Body").fill(os.environ["POST_BODY"])
page.get_by_role("button", name="Publish").click()
expect(page.get_by_role("heading", name="Weekly update")).to_be_visible()
```

Only post to communities where you are a member and posting is permitted — do not spam.

## Scheduled price / stock monitoring

The reliable shape: read current values → compare against a saved baseline → act only on
changes → persist the new baseline. Keep it idempotent so re-running is safe. Run it from
`cron`, a systemd timer, or any scheduler; the script itself stays stateless except for the
baseline JSON. Full runnable version in `examples/monitor.py`.

```python
baseline = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}
current = scrape_prices(page, URLS)                 # {url: price}
changes = {u: (baseline.get(u), current[u])
           for u in current if baseline.get(u) != current[u]}
if changes:
    report(changes)                                 # email/Slack/print — up to you
BASELINE.write_text(json.dumps(current, indent=2))  # new baseline for next run
```

Cron example (every day at 08:00), pointing Playwright at the pre-installed browsers:

```
0 8 * * *  cd /path/to/project && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python examples/monitor.py >> monitor.log 2>&1
```

## E2E flow

Drive the user journey and assert on user-visible outcomes with web-first assertions
(they auto-retry until a timeout), not on implementation details.

```python
page.goto("https://example.com", wait_until="domcontentloaded")
page.get_by_role("link", name="Pricing").click()
page.get_by_role("button", name="Start free trial").click()
page.wait_for_url("**/signup")
expect(page.get_by_role("heading", name="Create your account")).to_be_visible()
```

## Node.js equivalent

The Node binding (`playwright@1.56.1`) is global; point Node at it and run headless.

```bash
NODE_PATH=$(npm root -g) node examples/screenshot.js
```

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true }); // or { executablePath: '/opt/pw-browsers/chromium' }
  const page = await browser.newPage();
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'More information' }).click();
  await page.screenshot({ path: 'shot.png', fullPage: true });
  await browser.close();
})();
```
