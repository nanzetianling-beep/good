# Layout Patterns Reference

Eight proven page-layout patterns with structure sketches, minimal skeletons, when to use
each, and the failure mode that makes each one look generic. These are *starting shapes* —
the token system and content give them identity. Every skeleton assumes the `.container`
and spacing/type tokens from design-principles.md.

Pick per section, then check the page's total rhythm: reading down the page, section
shapes should alternate (wide/narrow, light/dark, image/text) rather than repeat.

## 1. Split hero (copy + evidence)

```
+----------------------------------------------+
|  nav                                          |
+----------------------+-----------------------+
|  kicker              |                       |
|  HEADLINE (display)  |   product screenshot  |
|  lead paragraph      |   / photo / diagram   |
|  [primary] [ghost]   |                       |
+----------------------+-----------------------+
```

```html
<section class="hero container">
  <div class="hero-copy">
    <p class="kicker">…</p>
    <h1>…</h1>
    <p class="lead">…</p>
    <div class="actions"><a class="btn-primary" href="#">…</a><a class="btn-ghost" href="#">…</a></div>
  </div>
  <div class="hero-media"><img src="…" alt="…"></div>
</section>
```

```css
.hero { display: grid; gap: var(--space-8); align-items: center; }
@media (min-width: 64rem) {
  .hero { grid-template-columns: 5fr 6fr; } /* unequal on purpose */
}
```

**Use when** there is real visual evidence (a product UI, a photograph) that answers
"what is this?" faster than words. **Skip when** the product isn't visual — a fake
dashboard screenshot is worse than no image.
**Generic failure**: 50/50 columns, floating-blob background, screenshot in a
browser-chrome mockup. Make columns unequal (5/6, 4/7) and let the media bleed to the
viewport edge on one side.

## 2. Full-bleed immersive hero

```
+----------------------------------------------+
| ███ full-viewport photo/video ███████████████ |
| ███ (scrim gradient at text zone) ███████████ |
| ███  HEADLINE, off-center ███████████████████ |
| ███  one line + one CTA ███████████████████ ↓ |
+----------------------------------------------+
```

```html
<section class="hero-bleed">
  <img class="hero-bg" src="…" alt="">   <!-- decorative: empty alt -->
  <div class="hero-content container">
    <h1>…</h1><p>…</p><a class="btn-primary" href="#">…</a>
  </div>
</section>
```

```css
.hero-bleed { position: relative; min-height: 85svh; display: grid; align-items: end; }
.hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-content { position: relative; padding-block: var(--space-16);
  /* scrim lives on a pseudo-element or a gradient behind the text zone */ }
```

**Use when** one strong image *is* the argument: place, food, craft, travel, physical
product. Requires an actually good image. **Skip** for abstract SaaS.
**Generic failure**: dead-centered text over a uniform dark scrim. Anchor text to a corner
or the bottom edge; shape the scrim (gradient from one edge) instead of dimming everything.

## 3. Editorial offset hero (type-led)

```
+----------------------------------------------+
|  nav                                          |
|                                               |
|      OVERSIZED HEADLINE THAT                  |
|  WRAPS ACROSS THE GRID, off-center            |
|                       -- 45ch lead, pushed    |
|                          right, small         |
|  meta / index / date                     CTA  |
+----------------------------------------------+
```

```css
.hero-ed { display: grid; grid-template-columns: repeat(12, 1fr); row-gap: var(--space-8); }
.hero-ed h1   { grid-column: 1 / 11; font-size: clamp(2.75rem, 1.5rem + 5vw, 5.5rem); line-height: 1.02; }
.hero-ed .lead { grid-column: 6 / 12; max-width: 45ch; }
.hero-ed .meta { grid-column: 1 / 5; align-self: end; }
```

**Use when** the identity lives in typography and voice — studios, publications, agencies,
portfolios, anything with strong words and no product shot.
**Generic failure**: it quietly re-centers itself. The asymmetry is the point: headline and
lead must start on *different* grid lines, and the whitespace must be visibly uneven.

## 4. Bento / mosaic feature grid

```
+---------------------+----------+
|                     |    B     |
|         A           +----------+
|   (hero feature,    |    C     |
|    2x2, has media)  +----------+
+----------+----------+          |
|    D     |    E     |    C     |
+----------+----------+----------+
```

```html
<section class="bento container">
  <article class="cell cell-a">…</article>
  <article class="cell">…</article>
  <article class="cell cell-tall">…</article>
  <article class="cell">…</article>
  <article class="cell">…</article>
</section>
```

```css
.bento { display: grid; gap: var(--space-4); }
@media (min-width: 48rem) {
  .bento { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 11rem; }
  .cell-a    { grid-column: span 2; grid-row: span 2; }
  .cell-tall { grid-row: span 2; }
}
```

**Use when** features genuinely differ in importance — the size ranking *is* the
information. Give the hero cell real media; keep small cells to a title + one line.
**Generic failure**: equal cells with icon-in-rounded-square anatomy — that's just the
three-card row wearing a costume. If you can't rank the features, use pattern 5 instead.

## 5. Alternating feature rows (zigzag, done right)

```
+---------------------+------------------------+
|  media (large)      |  heading + para + link |
+---------------------+------------------------+
|         +-----------+-----------+             (band: tinted bg,
|         | heading   |  media    |              different height)
|         +-----------+-----------+
+------------------------------------------------+
|  full-width media, caption below                (third row breaks
+------------------------------------------------+ the pattern)
```

**Use when** 3–5 features each need a sentence or two of explanation plus a visual —
the workhorse of product marketing.
**Generic failure**: every row identical except mirrored. Vary something real per row:
row height, media size, background band, or let the last row go full-width. Rule of thumb:
by row three, break your own pattern once.

```css
.feature-row { display: grid; gap: var(--space-8); align-items: center; }
@media (min-width: 48rem) {
  .feature-row { grid-template-columns: 7fr 5fr; }
  .feature-row.flip { grid-template-columns: 5fr 7fr; }
  .feature-row.flip .row-media { order: 2; }
}
```

## 6. Single-column narrative

```
|        ~65ch centered column        |
|  H2                                 |
|  paragraph                          |
|  paragraph                          |
|  [ full-width figure breaks out ]   |
|  paragraph                          |
|  pull-quote (larger, indented)      |
```

```css
.narrative > * { max-width: 65ch; margin-inline: auto; }
.narrative .breakout { max-width: min(88rem, 100%); }  /* figures escape the column */
```

**Use when** the story is sequential and the reader should actually read: manifestos,
case studies, changelogs, long-form product stories, docs-like marketing.
**Generic failure**: wall of same-sized paragraphs. Vary the column's rhythm — breakout
figures, pull-quotes, an occasional two-column aside — every 3–4 paragraphs.

## 7. Pricing table

```
+-----------+=============+-----------+
|  Starter  ‖  Pro ← lift ‖  Scale    |
|  $12/mo   ‖  $29/mo     ‖  custom   |
|  for whom ‖  for whom   ‖  for whom |
|  ✓ a      ‖  ✓ all of   ‖  ✓ all of |
|  ✓ b      ‖    Starter+ ‖    Pro +  |
|  [ghost]  ‖  [PRIMARY]  ‖  [ghost]  |
+-----------+=============+-----------+
```

```html
<section class="pricing container">
  <article class="tier">…</article>
  <article class="tier tier-featured">…</article>
  <article class="tier">…</article>
</section>
```

```css
.pricing { display: grid; gap: var(--space-6); align-items: start; }
@media (min-width: 64rem) { .pricing { grid-template-columns: repeat(3, 1fr); } }
.tier-featured { box-shadow: var(--shadow-3); border: 1px solid var(--brand-600);
  /* larger price type + primary button do the real emphasis */ }
```

Rules: 2–4 tiers, never 5+; exactly one featured tier (the one most buyers should pick),
emphasized by shadow/scale/button intent — not by a "MOST POPULAR" screamer alone; each
tier states *who it's for* in one line; feature lists are diffed ("everything in Starter,
plus…"), not repeated; price type is the largest thing in the card.
**Generic failure**: three visually equal cards where only a tiny badge differs, and
15-row checkmark lists nobody reads.

## 8. Top navigation & footer

Navigation:

```
logo      Product  Pricing  Docs          [Sign in] [CTA]
```

```html
<header class="site-nav">
  <a class="brand" href="/">…</a>
  <nav aria-label="Primary"><ul><li><a href="…">…</a></li>…</ul></nav>
  <div class="nav-actions"><a href="…">Sign in</a><a class="btn-primary" href="…">…</a></div>
</header>
```

- Slim (56–72px), 4–6 links maximum; one primary CTA at the right end, styled as the
  page's primary button; everything else quiet.
- Sticky only if the page is long *and* the nav earns it; if sticky, shrink on scroll and
  add `--shadow-3` once content passes underneath.
- Mobile: `<details>`/disclosure or a button toggling a plain vertical list —
  a full-screen animated takeover for four links is a tell.
- Landing pages with one CTA can drop the link list entirely: logo left, CTA right.

Footer — match its weight to the site:

```
Colophon (one-page sites):          Fat footer (multi-section sites):
+--------------------------------+  +--------+--------+--------+------+
| logo · one-line claim          |  | brand  | Product| Company| Legal|
| nav repeat · contact · legal   |  | blurb  | 4 links| 3 links| 2    |
+--------------------------------+  +--------+--------+--------+------+
                                    | bottom row: © · social · locale |
                                    +---------------------------------+
```

**Generic failure**: the four-column fat footer on a one-page site, padded with dead
links. A footer is also free identity space — a final word set in the display face, the
palette inverted, a motif reprise — cheaper to make memorable than any section above it.

## Choosing quickly

| Situation | Reach for |
| --- | --- |
| Product with strong UI to show | 1 (split hero) + 5 (alternating rows) |
| Physical place / product / food | 2 (full-bleed) + 6 (narrative) |
| Studio, agency, publication | 3 (editorial offset) + 6 |
| Feature-rich tool, ranked features | 4 (bento) |
| Anything with tiers to sell | 7 (pricing) |
| Every page | 8 (nav + footer sized honestly) |
