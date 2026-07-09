# Patterns — task-oriented recipes

Recipes that build on the core workflow in `SKILL.md`. All snippets are Python sync API,
run headless, and rely on `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` being set (it is).
Node equivalents differ only in casing (`getByRole`, `waitForLoadState`) and `await`.

Contents:
[Auth & session reuse](#authentication--session-reuse) ·
[2FA / OTP](#2fa--otp-pause-for-human) ·
[Form fill](#form-fill--submit-with-validation-errors) ·
[Membership posting](#auto-post-on-a-membership--community-site) ·
[Pagination](#pagination) ·
[Infinite scroll](#infinite-scroll) ·
[Table → CSV](#table-extraction-to-csv) ·
[Downloads](#file-downloads) ·
[Uploads](#file-uploads) ·
[iframes](#iframes) ·
[Dialogs & popups](#dialogs--popups-new-tabs) ·
[Network waiting](#waiting-network-idle-vs-a-specific-response) ·
[Rate limiting](#rate-limiting-with-jittered-delays) ·
[Monitoring](#scheduled-price--stock-monitoring) ·
[E2E](#e2e-flow) ·
[Node](#nodejs-equivalent)

## Authentication & session reuse

`storage_state` captures **cookies + localStorage + IndexedDB** (rarely sessionStorage).
Log in once, save it, and reuse it so later runs skip the login form entirely — this also
avoids re-triggering 2FA and looks far less bot-like than logging in on every run.

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
- Sessions expire — detect a stale session by the absence of a known post-login element,
  delete the state file, re-authenticate **once**, then fail loudly (see `examples/login.py`).
- Use separate state files per role (`admin.json`, `user.json`) for multiple identities,
  and one context per identity — cookies bleed across pages of the same context.

## 2FA / OTP: pause-for-human

Never try to bypass or defeat 2FA. For accounts you are authorized to automate, the
robust pattern is **pause-for-human**: the script detects the OTP step, asks the human
operator for the code on stdin (the sync API keeps the browser alive while blocked on
`input()`), submits it, then saves `storage_state` so subsequent runs skip 2FA entirely.

```python
import re, sys

page.get_by_role("button", name="Sign in").click()

otp_field = page.get_by_label(re.compile(r"(verification|one.?time|2fa|otp).*code", re.I))
try:
    otp_field.wait_for(state="visible", timeout=5000)   # is there an OTP step at all?
except Exception:
    pass                                                # no 2FA this time
else:
    if not sys.stdin.isatty():
        page.screenshot(path="otp-prompt.png")
        raise RuntimeError("2FA code required but no human attached — "
                           "run interactively once to seed auth.json")
    code = input("Enter the one-time code sent to your device: ").strip()
    otp_field.fill(code)
    page.get_by_role("button", name=re.compile(r"verify|confirm", re.I)).click()

# Generous timeout: the human may be slow; the site may resend codes.
expect(page.get_by_role("link", name="Log out")).to_be_visible(timeout=120_000)
context.storage_state(path="auth.json")   # future runs skip both password AND 2FA
```

Notes:
- In unattended runs (cron), **fail loudly with instructions** instead of hanging forever —
  that's the `isatty()` check above.
- If you own the account and hold the TOTP shared secret, generating codes with `pyotp`
  (`pyotp.TOTP(secret).now()`) is a legitimate alternative to stdin. Keep the secret in an
  env var / secrets manager, never in the script.
- `page.pause()` opens the Playwright Inspector and needs a headed browser + display —
  not available in this headless environment; use the stdin pattern instead.

## Form fill & submit (with validation errors)

Full multi-step runnable version: `examples/form_fill.py`. Core moves:

```python
page.get_by_label("Full name").fill("Ada Lovelace")
page.get_by_label("Country").select_option("US")          # <select> by value; or label="United States"
page.get_by_role("radio", name="Standard shipping").check()
page.get_by_label("I agree").check()                       # checkbox
page.get_by_role("button", name="Submit").click()
```

After submitting, **race the two outcomes** — success signal vs. validation errors — rather
than blindly asserting success:

```python
def submit_and_check(page, submit_name, success_locator):
    page.get_by_role("button", name=submit_name).click()
    try:
        expect(success_locator.or_(page.get_by_role("alert").first)
               ).to_be_visible(timeout=10_000)
    except Exception:
        page.screenshot(path="form-stuck.png", full_page=True)
        raise
    errors = [t.strip() for t in page.get_by_role("alert").all_inner_texts() if t.strip()]
    # Inline field errors often use aria-invalid instead of role=alert:
    for bad in page.locator("[aria-invalid='true']").all():
        errors.append(f"invalid field: {bad.get_attribute('name') or bad.get_attribute('id')}")
    if errors:
        raise ValueError(f"form rejected: {errors}")   # caller can fix data and retry once
```

Tips:
- `fill()` replaces the whole value; use `press_sequentially()` only for inputs with
  per-keystroke JS (autocomplete widgets, masked inputs).
- Date/masked inputs sometimes reject `fill()` — try `fill("2026-07-09")` on
  `<input type=date>` first (it takes ISO format), fall back to `press_sequentially`.
- Multi-step wizards: assert a step-specific element after each "Next" so a silent
  validation failure can't advance you into asserting on the wrong step.

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

## Pagination

Three shapes, all bounded (never `while True` without a cap):

```python
def extract_page_items(page):
    cards = page.get_by_role("listitem").filter(has=page.get_by_role("heading"))
    expect(cards.first).to_be_visible()
    return [c.inner_text().strip() for c in cards.all()]

# (a) "Next" link/button
results, MAX_PAGES = [], 50
for page_no in range(MAX_PAGES):
    results += extract_page_items(page)
    next_btn = page.get_by_role("link", name="Next")
    if next_btn.count() == 0 or not next_btn.first.is_enabled():
        break
    first_before = page.get_by_role("listitem").first.inner_text()
    next_btn.first.click()
    # Wait for content to actually change, not just for the click to land.
    expect(page.get_by_role("listitem").first).not_to_have_text(first_before)
    polite_pause()                                     # see Rate limiting below

# (b) URL-parameter pagination — simplest and most reliable when available
for page_no in range(1, MAX_PAGES + 1):
    page.goto(f"https://example.com/products?page={page_no}",
              wait_until="domcontentloaded")
    items = extract_page_items(page)
    if not items:                                      # ran off the end
        break
    results += items
    polite_pause()

# (c) "Load more" button — items accumulate on one page; dedupe not needed
items = page.get_by_role("listitem")
for _ in range(MAX_PAGES):
    more = page.get_by_role("button", name=re.compile(r"load more", re.I))
    if more.count() == 0 or not more.first.is_visible():
        break
    before = items.count()
    more.first.click()
    expect(items).not_to_have_count(before, timeout=10_000)  # grew (or button vanished)
    polite_pause()
results = [i.inner_text().strip() for i in items.all()]
```

Variant (a) gotcha: many SPAs re-render in place, so `wait_for_url` won't fire — that's why
the snippet waits on **content change** instead. Dedupe by a stable key (URL, SKU) if pages
can overlap.

## Infinite scroll

Scroll, wait for growth, stop when the count stops growing or a cap is hit:

```python
def load_all_by_scrolling(page, item_locator, max_rounds=30, settle_ms=800):
    prev = -1
    for _ in range(max_rounds):
        count = item_locator.count()
        if count == prev:
            break                       # no growth since last round — done (or stuck)
        prev = count
        page.mouse.wheel(0, 4000)       # triggers scroll-driven lazy loading
        page.wait_for_timeout(settle_ms)
    return item_locator.count()

n = load_all_by_scrolling(page, page.get_by_role("listitem"))
```

Notes:
- `page.mouse.wheel` fires real wheel events, which is what intersection-observer-based
  loaders listen for. `locator.last.scroll_into_view_if_needed()` also works and is more
  precise when items live inside a scrollable sub-container (scroll the container, not the window).
- **Virtualized lists** (only ~30 DOM nodes ever exist; rows recycle as you scroll) defeat
  "collect at the end": extract incrementally inside the loop and dedupe by key, or better,
  read the JSON API the list is fed from via `page.expect_response` (below).
- Extremely long feeds eat memory — cap rounds and consider `page.route` to abort
  images/fonts: `context.route("**/*.{png,jpg,jpeg,webp,woff2}", lambda r: r.abort())`.

## Table extraction to CSV

```python
import csv

def table_to_rows(table):
    """table: Locator for a single <table>. Returns (headers, rows)."""
    headers = [h.strip() for h in table.locator("thead th").all_inner_texts()]
    rows = []
    for tr in table.locator("tbody tr").all():
        rows.append([c.strip() for c in tr.locator("td, th").all_inner_texts()])
    return headers, rows

table = page.get_by_role("table").first        # or page.locator("table#orders")
expect(table.locator("tbody tr").first).to_be_visible()
headers, rows = table_to_rows(table)
with open("out.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    if headers:
        w.writerow(headers)
    w.writerows(rows)
```

- For big tables the per-cell round-trips get slow; do it in one `evaluate`:
  ```python
  rows = table.evaluate("""t => [...t.querySelectorAll('tbody tr')].map(
      tr => [...tr.querySelectorAll('td,th')].map(c => c.innerText.trim()))""")
  ```
- Tables without `<thead>`: take the first row as headers.
- Paginated tables: combine with the Pagination recipe; write incrementally (open the CSV
  once, `writerows` per page) so a mid-run failure keeps partial data.
- If the table is fed by an XHR returning JSON, skip the DOM entirely and capture the
  response (see Network waiting) — faster and immune to markup changes.

## File downloads

Downloads are events, not navigations. Arm the wait **before** triggering:

```python
with page.expect_download() as dl_info:
    page.get_by_role("link", name="Export CSV").click()
download = dl_info.value
failure = download.failure()                     # blocks until finished; None on success
if failure:
    raise RuntimeError(f"download failed: {failure}")
path = f"downloads/{download.suggested_filename}"
download.save_as(path)                           # copy out of the temp dir before close
```

- Downloads land in a temp dir that is wiped when the context closes — always `save_as`.
- Slow exports: `page.expect_download(timeout=120_000)`.
- Direct file URLs that render inline (PDF) or return non-HTML: fetching with the request
  API reuses the context's cookies and skips rendering:
  ```python
  resp = page.request.get("https://example.com/report.pdf")
  pathlib.Path("report.pdf").write_bytes(resp.body())
  ```

## File uploads

```python
# Visible <input type=file> (even if styled/hidden, if it's in the DOM this works):
page.get_by_label("Attachment").set_input_files("invoice.pdf")
page.get_by_label("Photos").set_input_files(["a.png", "b.png"])   # multiple
page.get_by_label("Attachment").set_input_files([])               # clear selection

# In-memory payload — no file on disk needed:
page.get_by_label("Attachment").set_input_files(
    files=[{"name": "data.csv", "mimeType": "text/csv", "buffer": b"a,b\n1,2\n"}])

# Custom widget that opens the OS file picker (no reachable <input>):
with page.expect_file_chooser() as fc_info:
    page.get_by_role("button", name="Upload").click()
fc_info.value.set_files("invoice.pdf")
```

After uploading, assert the app-level result (thumbnail, filename chip, success toast) —
`set_input_files` succeeding only means the input got the file, not that the app accepted it.

## iframes

Regular locators cannot cross an iframe boundary — get a `FrameLocator` first:

```python
frame = page.frame_locator("iframe[title='payment']")     # pick by stable attribute
frame.get_by_label("Card number").fill("4242 4242 4242 4242")

# Nested frames chain:
page.frame_locator("#outer").frame_locator("#inner").get_by_role("button", name="OK").click()

# From an existing iframe locator (v1.43+):
page.locator("iframe.checkout").content_frame.get_by_label("CVC").fill("123")
```

- Symptom of a missed iframe: your locator times out while the element is clearly on screen.
  Diagnose with `page.locator("iframe").count()` and each frame's `src`/`title`
  (`[f.url for f in page.frames]`).
- Frame content loads independently of the page — `expect(...)` on an element inside the
  frame is the correct wait; there is no per-frame `wait_for_load_state` on FrameLocator.
- Open shadow DOM needs none of this: role/text/CSS locators pierce it automatically
  (closed shadow roots are not reachable).

## Dialogs & popups (new tabs)

**JS dialogs** (`alert` / `confirm` / `prompt` / `beforeunload`): with no listener,
Playwright auto-dismisses them so runs don't hang. Add a handler only when you need to
accept — and then you **must** call `accept()`/`dismiss()`, or the page freezes:

```python
page.once("dialog", lambda d: d.accept())          # arm BEFORE the triggering action
page.get_by_role("button", name="Delete").click()  # confirm() gets accepted

page.once("dialog", lambda d: d.accept("blue"))    # prompt() with an answer
# beforeunload needs an explicit opt-in:
page.close(run_before_unload=True)
```

Prefer `once` over `on` so a leftover handler can't swallow a later, unrelated dialog.

**Popups / new tabs** (`target=_blank`, `window.open`): a popup is a new `Page` in the
same context — arm `expect_popup` before the click, then treat it like any page:

```python
with page.expect_popup() as pop_info:
    page.get_by_role("link", name="Open report").click()
popup = pop_info.value
popup.wait_for_load_state("domcontentloaded")
expect(popup.get_by_role("heading", name="Report")).to_be_visible()
popup.close()
```

**Cookie-consent banners** are neither of these — they are normal DOM. Dismiss them early
(`page.get_by_role("button", name=re.compile("accept|agree", re.I)).click()` guarded by
`.count()`), because their overlay intercepts clicks meant for elements underneath.

## Waiting: network idle vs. a specific response

`wait_for_load_state("networkidle")` = "no network requests for 500 ms". It is a blunt
instrument: **flaky on sites with polling/analytics/long-polling** (never idle) and slow on
everything else. Playwright's own docs discourage it. Use it only as a first rough wait on
unknown pages. Prefer, in order:

1. **A user-visible signal** — `expect(locator).to_be_visible()` on the content you need.
2. **The specific response that feeds the UI** — arm before the trigger:
   ```python
   with page.expect_response(
           lambda r: "/api/products" in r.url and r.status == 200) as ri:
       page.get_by_role("button", name="Search").click()
   data = ri.value.json()      # often you can use this JSON directly and skip DOM scraping
   ```
   For responses triggered by `goto` itself, the same pattern with `page.goto(url)` inside
   the `with` block works.
3. **URL change** after login/redirect: `page.wait_for_url("**/dashboard")`.

Passive capture (log every matching response while you interact):

```python
captured = []
page.on("response",
        lambda r: captured.append(r.url) if "/api/" in r.url else None)
```

Rule of thumb: for scraping, if a clean JSON endpoint feeds the page, capture it — it's
faster, stabler, and survives redesigns. (Only for sites you're authorized to access.)

## Rate limiting with jittered delays

Fixed delays create a metronome fingerprint and synchronized load spikes. Jitter them, and
back off exponentially (with jitter) on failures:

```python
import random, time

def polite_pause(base=1.0, jitter=1.0):
    """Sleep base..base+jitter seconds. Call between page fetches."""
    time.sleep(base + random.uniform(0, jitter))

def backoff_delay(attempt, cap=60.0):
    """'Full jitter' exponential backoff: 0..min(cap, 2^attempt)."""
    return random.uniform(0, min(cap, 2 ** attempt))
```

- Honor HTTP 429: read `Retry-After` from the response headers when you captured one, and
  wait at least that long; repeated 429s mean stop, not retry harder.
- Keep concurrency at 1 per site unless you know the site tolerates more.
- Between actions **within** a page, no artificial delay is needed — locators auto-wait.
  The polite pause belongs between page/site fetches.
- A runnable retry helper (bounded attempts, jittered backoff, retryable-vs-fatal split)
  is in `examples/scrape.py` (`retry()`), reused across the example scripts.

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
