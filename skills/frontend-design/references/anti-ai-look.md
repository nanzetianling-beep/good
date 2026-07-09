# Anti-"AI Look" Reference

Why generated pages look generated, the specific tells, and how to fix each one.

## Why it happens

During sampling a model predicts the highest-probability tokens. Safe design choices that
work for any brief and offend no one dominate web training data, so with no direction the
output drifts to that statistical center ("distributional convergence"). The fix is
direction: make deliberate choices grounded in one specific subject, and take one real,
justifiable aesthetic risk.

## The tells (and the fix for each)

### Type & color tells

| Tell | Why it reads as AI | Fix |
| --- | --- | --- |
| **Inter / Roboto / Arial / system-ui / Space Grotesk** as the primary face | The default of defaults | Choose a characterful display face from the subject's world; pair with a distinct body face |
| **Purple/violet as the default brand color** on white (`#7C3AED`-adjacent), no reason given | The statistically safest "tech" hue; signals no palette decision was made | Derive the palette from the subject's materials and world; if it lands on purple, be able to say why |
| **Purple → blue hero gradient** | The single most common generated hero | If a gradient at all, make it subtle, subject-derived, and confined to one surface |
| **Gradient-text headline** (`background-clip: text`) | Decoration substituting for a type decision | Set the headline in solid ink with a face that carries character; color at most one word, deliberately |
| **Pure-grey neutrals next to a colored brand** (`#f9fafb`, `#6b7280`…) | Framework palette on autopilot | Tint the neutral ramp toward the brand hue (see design-principles.md ramp recipe) |
| **Every corner at one border-radius** (usually 8px or 12px, on buttons, cards, images, inputs alike) | Signals a component library on autopilot | Define a radius *language*: e.g. sharp containers + pill actions, or 2–3 role-based radii (`--radius-ctl`, `--radius-card`); or commit to 0 everywhere as an editorial stance |

### Layout & structure tells

| Tell | Why it reads as AI | Fix |
| --- | --- | --- |
| **Three equal feature cards** in a row | Template layout; implies all three points matter equally (they never do) | Rank the features; give the top one 2× the space or a different treatment; or use a bento with unequal cells (see layout-patterns.md) |
| **Icon-in-tinted-rounded-square** above every feature title | The default card anatomy of every UI kit | Cut the icons entirely, or replace with real product imagery, numerals set in the display face, or custom marks from the subject's world |
| **Every section = centered eyebrow + H2 + subparagraph**, repeated down the page | One stamped header pattern; no rhythm | Vary section anatomy: left-aligned headers, side-by-side header/content, a section that opens with an image or a figure instead |
| **Hero = big number + tiny label + gradient accent** | The "template answer" | Only use if the stat truly is the point; otherwise lead with the most characteristic thing |
| **Announcement pill above the headline** ("✨ Now with AI") | Cargo-culted from SaaS landing pages | Delete it unless there is a real, dated announcement worth clicking |
| **Numbered 01 / 02 / 03 markers** everywhere | Decoration masquerading as structure | Use numbering only when content is genuinely sequential |
| **Identical alternating image/text zigzag rows** | The "we had four features" template | Keep alternation but vary weight: change row heights, visual sizes, or background per row so each feels authored |
| **Four-column footer of placeholder links** (Product / Company / Resources / Legal, half dead) | Footer copied from a template, not designed | Size the footer to the real site; a one-page site earns a single-row colophon, not a sitemap |
| **Fabricated social proof** ("Trusted by 10,000+ teams", five grey logos, 99.9% uptime) | Invented numbers pattern-matched from real sites | Use only real, checkable claims; if there are none, cut the section — specificity elsewhere carries trust |
| **Centered everything, uniform padding, no focal point** | No hierarchy | Establish one clear focal point; vary spacing and emphasis |

### Texture & effect tells

| Tell | Why it reads as AI | Fix |
| --- | --- | --- |
| **Emoji as feature icons** | Filler, no craft; renders differently per OS | Use a real icon set or custom marks consistent with the type |
| **Glassmorphism / `backdrop-filter: blur()` cards** everywhere | 2021 Dribbble default; usually hurts contrast | Reserve blur for one overlay surface that genuinely floats over imagery (e.g. a nav over a photo hero) |
| **Floating blurred color blobs** in the background | Generic "modern tech" texture, unrelated to content | Replace with texture from the subject's world (a chart, a map, a material, real product UI) or plain confident ground |
| **`hover: scale(1.05)` + shadow jump on every card** | One interaction stamped on everything, whether or not it's clickable | Hover states only on interactive elements; one consistent, subtle treatment (e.g. elevation +1, 150ms) |
| **Scattered fade-in-on-scroll on everything** | Excess motion is itself a tell | One orchestrated moment; cut the rest |
| **Star ratings + initial-letter avatar testimonial cards** | Fabricated-looking praise in a template shell | Real quotes with full attribution, or nothing; one strong quote set large beats three fake cards |
| **Lorem ipsum or vague marketing copy** ("Empower your workflow", "Unlock seamless synergy") | Templated words match templated design | Write specific copy from the end user's side, active voice, concrete nouns from the subject's domain |

## Three cliché palettes to avoid *as defaults*

Each is legitimate when the brief genuinely calls for it — the point is not to land on one
by accident when an axis is left free.

1. **Warm cream + serif + terracotta** — cream background near `#F4F1EA`, high-contrast
   serif display, terracotta accent. The default "artisanal / editorial" look.
2. **Dark + acid accent** — near-black background with a single bright acid-green or
   vermilion accent. The default "modern SaaS / dev tool" look.
3. **Broadsheet** — hairline rules, zero border-radius, dense newspaper columns. The
   default "sophisticated minimal" look.

Before committing a palette, ask: "Would this fit three unrelated briefs equally well?"
If yes, it's a default. Push at least one dimension (ground color, accent, type, or
structure) toward something only this subject would justify.

## A quick self-audit before shipping

Run all six; each has a pass condition.

1. **Swap test** — could this exact page front three different companies unchanged?
   Pass: no; at least the hero, palette, and one structural device only fit this subject.
2. **Signature check** — name the one signature element in a sentence. Pass: you can,
   and it appears exactly once.
3. **Palette provenance** — does each color trace to the brief, or to the cliché table
   above? Pass: you can state the source of ground, ink, and accent.
4. **Tell scan** — walk the three tables above against a screenshot. Pass: zero
   unjustified hits (a tell used *knowingly*, for a reason you can state, is fine).
5. **Motion audit** — list every animated element. Pass: one orchestrated moment plus
   at most subtle state transitions; nothing animates "because it can".
6. **Subtraction pass** — remove the single least necessary element. Pass: the page
   holds without it (ship the removal); if it collapses, the element was load-bearing —
   put it back and cut the next candidate.
