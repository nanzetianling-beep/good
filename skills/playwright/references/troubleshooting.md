# Troubleshooting — common failures and fixes

Diagnosis-first reference. Every fix here was checked against this environment
(browsers at `/opt/pw-browsers`, headless-only, outbound HTTPS via the agent proxy).

Contents:
[Launch / module errors](#launch--module-errors-environment-specific) ·
[TimeoutError flow](#timeouterror-a-diagnosis-flow) ·
[Strict mode](#strict-mode-violation-locator-resolved-to-n-elements) ·
[Detached / not stable](#element-is-detached--not-stable--intercepts-pointer-events) ·
[Headless vs headed](#headless-vs-headed-differences) ·
[Bot detection](#bot-detection-symptoms-and-legitimate-mitigations) ·
[Proxy / TLS](#proxy--tls-in-this-environment) ·
[Crashes & leaks](#target-closed--browser-crashes--leaked-processes)

## Launch / module errors (environment-specific)

**`BrowserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-<N>/...`**
The installed pip package version expects a different browser revision than the
pre-installed one (`chromium-1194`, matching Playwright **1.56.x**). Do **NOT** run
`playwright install`. Fix either way (both verified here):
1. Pin the Python package to match the browsers: `pip install playwright==1.56.0`
   → `p.chromium.launch(headless=True)` then auto-resolves cleanly.
2. Or keep whatever version is installed and point at the stable symlink:
   `p.chromium.launch(headless=True, executable_path="/opt/pw-browsers/chromium")`
   (Node: `executablePath: '/opt/pw-browsers/chromium'`).

**Python: `ModuleNotFoundError: No module named 'playwright'`** — the Python binding is
not preinstalled: `pip install playwright==1.56.0` (package only, never the browsers).

**Node: `Cannot find module 'playwright'`** — the global install isn't on the resolution
path for scripts in arbitrary directories: `NODE_PATH=$(npm root -g) node script.js`.

**`Missing X server or $DISPLAY` / `Target page, context or browser has been closed` right
at launch with `headless=False`** — there is no display server here; always `headless=True`.

## TimeoutError: a diagnosis flow

`TimeoutError` means "the wait never got its signal" — the timeout value is almost never
the root cause. Before touching timeouts, capture evidence at the failure point:

```python
except Exception:
    page.screenshot(path="fail.png", full_page=True)
    pathlib.Path("fail.html").write_text(page.content())
    print("URL at failure:", page.url)
    raise
```

Then walk this list — ordered by how often each one is the culprit:

1. **Are you on the page you think you're on?** Check `page.url` and the screenshot.
   Redirects to login (`/login?next=...`), consent walls, geo/language splash pages, and
   challenge pages all produce "element not found" on a page that isn't the target.
2. **Does the locator match anything at all?** `print(locator.count())`. If 0:
   - Wrong accessible name — dump candidates:
     `print(page.get_by_role("button").all_inner_texts())`.
   - Text split across nested tags or with odd whitespace — use a regex:
     `get_by_text(re.compile(r"Sign\s*in", re.I))`.
   - Content still loading — wait on the response that feeds it
     (`page.expect_response`, see patterns.md) instead of raising the timeout.
3. **Is it inside an iframe?** Regular locators never cross frame boundaries.
   `page.locator("iframe").count()` / `[f.url for f in page.frames]`; if yes, use
   `page.frame_locator(...)` (see patterns.md → iframes).
4. **Is it matched but hidden?** `count() > 0` but not visible: collapsed menus/accordions
   (perform the opening interaction first), `display:none` templates, or an
   **overlay on top** — cookie banners and modals intercept everything; dismiss them first.
5. **Actionability stuck?** For clicks, Playwright's error call log says which check
   (visible / stable / receives events) never passed — read it, it names the culprit
   (e.g. `<div class="cookie-overlay"> intercepts pointer events`).
6. Only after 1–5: is the page genuinely slow? Then raise the timeout deliberately —
   `expect(loc).to_be_visible(timeout=30_000)` or `context.set_default_timeout(30_000)` —
   and add a comment saying why.

Also remember `wait_for_load_state("networkidle")` itself times out on pages with
polling/analytics traffic — that's a reason to drop it, not to raise its timeout.

## Strict mode violation: "locator resolved to N elements"

Actions and `expect()` require exactly one match; multiple matches raise
`strict mode violation: locator("...") resolved to N elements` (the message lists the
matches — read them, they tell you how to disambiguate). Fixes, best first:

1. **Scope to a region**: `page.get_by_role("navigation").get_by_role("link", name="Home")`.
2. **Filter by content**: `page.get_by_role("row").filter(has_text="Invoice #42")`.
3. **Tighten the name**: `get_by_role("button", name="Save", exact=True)` — without
   `exact`, "Save" also matches "Save as draft" (substring, case-insensitive).
4. **Positional, last resort**: `.first` / `.nth(i)` — fine for scraping homogeneous lists,
   a smell when clicking: if N buttons match, position may pick a different one after a
   redesign.

Note the collection APIs (`locator.count()`, `.all()`, `.all_inner_texts()`) are exempt —
strict mode applies to single-element actions/assertions only.

## Element is detached / not stable / intercepts pointer events

`element is not attached to the DOM` or endless `waiting for element to be visible, enabled
and stable` retries usually mean the app re-rendered mid-action:

- **Framework re-render** (React/Vue lists rebuilt after data arrives): don't interact
  during the churn — first wait for the settling signal, e.g.
  `expect(page.get_by_test_id("spinner")).to_be_hidden()` or the feeding response, then act.
- **`locator.all()` snapshots go stale**: `.all()` resolves elements *now*; if the DOM
  mutates while you iterate, later items throw. Re-query after anything that re-renders,
  or extract in one shot (`all_inner_texts()`, `evaluate_all`).
- **Animations** keep the "stable" check failing (element still moving). Wait for the
  transition to end, or disable animations for capture/scrape runs:
  ```python
  page.add_style_tag(content="*, *::before, *::after {"
      " animation: none !important; transition: none !important; }")
  ```
- **Something overlays the element** (`...intercepts pointer events`): dismiss the cookie
  banner/modal/sticky header, or `scroll_into_view_if_needed()` first. `click(force=True)`
  skips actionability checks entirely — use only when you've confirmed the overlay is
  cosmetic; forcing a click a user couldn't make hides real bugs and misclicks.

## Headless vs headed differences

There is no display server in this environment, so headless is the only mode — but sites
can behave differently than they would in a desktop browser. Known differences and fixes:

- **User agent** may advertise `HeadlessChrome`; some sites branch on it. Set a realistic
  UA on the context (see the bot-detection section for what's legitimate).
- **Default viewport is 1280×720**; responsive sites may render mobile/hamburger layouts
  at unexpected sizes, changing which elements exist. Pin it:
  `new_context(viewport={"width": 1280, "height": 900})`.
- **Locale / timezone default to the server's**, changing dates, currencies, decimal
  separators — and therefore your parsers. Pin `locale="en-US"`,
  `timezone_id="America/New_York"` on the context.
- **Fonts** available in the container differ from a desktop; screenshots may lay out
  slightly differently. For pixel-consistent captures, pin the viewport and disable
  animations (snippet above).
- **No window focus events**: pages that defer work until `focus`/`visibilitychange` may
  idle; interacting with the page (a benign `click` on `body`) usually kicks them.
- Playwright 1.5x+ headless Chromium uses the **new headless mode** (real Chrome
  browser code), so old-headless quirks (missing codecs, odd GL) mostly don't apply.

## Bot detection: symptoms and legitimate mitigations

Symptoms that you've tripped detection rather than hit a bug:
- HTTP 403/429 for the browser while `curl` from elsewhere works, or vice versa.
- Redirects to `/challenge`, CAPTCHA interstitials, "verify you are human".
- Empty or skeleton content only in automation; the same URL renders fine manually.
- Works for the first N requests, then blocks — a rate threshold.
- Login succeeds but every subsequent request bounces to login — session flagged.

**Legitimate mitigations** (make an authorized client look like the real client it is):
- Realistic context: real-browser `user_agent` (no `HeadlessChrome` token), sensible
  `viewport`, `locale`, `timezone_id`.
- **Reuse `storage_state`** instead of logging in every run — repeated fresh logins are a
  classic bot signal and may lock the account (see patterns.md → Authentication).
- Slow down: jittered delays between page fetches, concurrency 1, honor `Retry-After`
  on 429 (patterns.md → Rate limiting).
- Fetch less: cache results, use conditional flows (only re-scrape what changed), prefer
  an official API or data export if the site offers one.
- If you're blocked and you *are* authorized: contact the site owner for API access or
  an allowlist entry.

**Not legitimate — do not do**: CAPTCHA-solving services, stealth/fingerprint-spoofing
plugins, rotating residential proxies to evade blocks, or any circumvention of a control
the site operator has deliberately placed. Blocks on those signals mean stop and
re-establish authorization, not escalate. (See "Responsible & authorized use" in SKILL.md.)

## Proxy / TLS in this environment

Outbound HTTPS goes through a local agent proxy (`HTTPS_PROXY=http://127.0.0.1:39577`)
that re-terminates TLS; everything must trust the CA bundle at
`/root/.ccr/ca-bundle.crt`. Verified behavior for Playwright here:

- **Chromium picks up `HTTPS_PROXY` from the environment automatically** — no launch
  option needed. If a browser ignores it (or you must be explicit), pass
  `p.chromium.launch(proxy={"server": os.environ["HTTPS_PROXY"]})`.
- **`net::ERR_TUNNEL_CONNECTION_FAILED` on `goto` is usually an egress-policy denial,
  not a Playwright bug**: the proxy answered 403 to CONNECT for that host. Confirm with
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` — `recentRelayFailures` names the denied
  host. Report the blocked host; do **not** retry in a loop or route around the proxy.
- **Certificate errors** (`net::ERR_CERT_AUTHORITY_INVALID`): the browser NSS trust store
  is pre-configured to trust the proxy CA in this environment, so you shouldn't see this.
  If you do, consult `/root/.ccr/README.md` ("certificate verify failed" section). Never
  fix it with `ignore_https_errors=True` / `--ignore-certificate-errors`, and never unset
  `HTTPS_PROXY` — that's disabling TLS verification, which is prohibited here.
- **`page.request` / `APIRequestContext`** rides Playwright's Node-side fetch, which
  honors `HTTPS_PROXY` and `NODE_EXTRA_CA_CERTS` (already set) — no extra config.
- `pip install playwright` works out of the box (`pypi.org` is proxy-exempt via
  `NO_PROXY`; `REQUESTS_CA_BUNDLE` is pre-set).
- `localhost`/`127.0.0.1` targets bypass the proxy (`NO_PROXY`) — testing a locally
  served app needs nothing special.

## Target closed / browser crashes / leaked processes

- **`Target page, context or browser has been closed`** mid-script: something closed the
  object you're using — a `finally` that runs early, `with sync_playwright()` exited, or
  the tab crashed. If crash: watch for it explicitly
  (`page.on("crash", lambda p: ...)`) and reduce memory pressure (below).
- **Memory-heavy scrapes** (infinite scroll, hundreds of pages): recycle the page every
  N navigations (`page.close(); page = context.new_page()`), and block heavy assets:
  `context.route("**/*.{png,jpg,jpeg,webp,mp4,woff2}", lambda r: r.abort())`.
- **Leaked chromium processes** after failed runs slow everything down. Prevent with
  `finally: context.close(); browser.close()` (or the `with sync_playwright()` /
  `try/finally` shape used by every script in `examples/`). Check and clean:
  `pgrep -af chrome-linux | head` then kill leftovers.
- **Zombie state between retries**: retry the whole unit of work with a *fresh page* (and
  fresh context if auth state may be poisoned), not the failing action alone — see
  `retry()` in `examples/scrape.py`.
