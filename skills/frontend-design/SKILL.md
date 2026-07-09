---
name: frontend-design
disable-model-invocation: true
description: Guidance for designing distinctive, polished web UI/UX in HTML/CSS/JS that avoids the generic "AI-generated" look. Use when building or reworking a landing page, marketing or corporate site, web design mockup, hero section, pricing table, dashboard, or any UI prototype from scratch, and when you must learn an existing design system or brand and produce original components that follow its tokens and rules. Covers typography, color, spacing, layout, component states, depth, motion, and accessibility.
---

# Front-end Design

## Overview

Left unguided, generated web pages converge on a recognizable "AI look": Inter or Roboto,
a purple-to-blue gradient on white, three equal feature cards with emoji icons, uniformly
rounded corners, and timid fade-in motion. This happens because safe, universal choices
dominate web training data, so sampling drifts toward that high-probability center. This
skill counteracts that drift. It produces sites with a deliberate visual identity:
opinionated typography, a palette grounded in the subject, intentional layout, and motion
that serves a purpose — the kind of work a small studio would ship for a paying client.

## When to use

- Building a landing page, marketing site, corporate-site mockup, or product page.
- Designing a hero, pricing table, feature grid, dashboard, or any web component from scratch.
- Reworking a UI that "looks fine but generic" into something with a point of view.
- Learning an existing design system, brand, or component library and producing new UI that matches it.

Reference material lives in `references/`:
- `references/design-principles.md` — the numbers, scales, and ready-to-use CSS behind the checklist below.
- `references/anti-ai-look.md` — the specific "AI look" tells and the fix for each.
- `references/layout-patterns.md` — eight proven page-layout patterns (heroes, feature sections, pricing, nav, footer) with skeletons and when to use each.

## Core principles

**Ground every choice in the subject.** Before touching CSS, name the concrete subject,
its audience, and the page's single job. The subject's own world — its materials,
instruments, artifacts, and vocabulary — is where distinctive choices come from. A page
for a marine-research lab, a jazz label, and a tax-software company should look nothing
alike. If a decision would fit any of them equally well, it is a default, not a choice.

**Spend your boldness in one place.** Pick one signature element to carry the identity and
keep everything around it quiet and disciplined. Elegance is executing one chosen vision
well, not stacking effects.

**Systematize before you build.** Decide the type scale, color ramps, spacing scale, radii,
and shadows up front, then build components by picking from those tokens — never by
inventing one-off values mid-component. Constrained scales are what make output read as
one coherent system.

## Workflow: plan → critique → build → critique

Do not jump straight to code. Each step below has questions to answer, an artifact to
produce, and a validation gate. Write the artifacts out (in the response or a scratch
file) — a plan that exists only as intention doesn't get critiqued.

### 1. Plan a compact token system

**Answer these in writing first** (three sentences, no vagueness):

1. *Subject* — what exactly is this for? ("a coffee roaster" is weak; "a small-batch
   coastal roaster selling seasonal subscriptions" is workable.)
2. *Audience & job* — who lands here, and what one action should they take?
3. *Subject's world* — list 5+ concrete artifacts, materials, instruments, or vocabulary
   from that world. This list is the raw material for every choice below.

**Then produce the plan artifact** — six labelled decisions, each justified from the
answers above:

- **Direction**: name the aesthetic (e.g. editorial, brutalist, warm-minimal, technical,
  retro-futuristic, luxury) and justify it from the subject in one sentence.
- **Color**: 4–6 named values — a neutral ramp plus 1–2 primaries and 1–2 accents. Reason
  in HSL so related shades share hue; plan 5–10 shades per role for a real UI (ramp recipe
  in `references/design-principles.md`). State what each color is *for*.
- **Type**: display face + body face (+ mono if data is shown), each named, with one line
  on why it fits — not the families you reach for on every project.
- **Layout**: one sentence of prose per section, plus a quick ASCII wireframe. Pick each
  section's shape from `references/layout-patterns.md` or justify a custom one.
- **Signature**: the single element that embodies the brief (a custom hero interaction, a
  distinctive grid, a typographic treatment, an illustrative motif from the subject's world).
- **Motion**: the one orchestrated moment, in a sentence — or "none".

**Validation**: every decision must cite something from the subject's-world list. A
decision justified only by "clean" or "modern" is a default — redo it.

### 2. Critique the plan

Run four checks against the written plan; revise until all pass, stating what changed and why:

1. **Swap test** — would this plan fit three unrelated briefs equally well? If yes, it's
   templated; sharpen the parts that could belong to anyone.
2. **Tell scan** — check every choice against the tables in `references/anti-ai-look.md`,
   including the three cliché palettes. A tell kept *knowingly*, for a stated reason, is fine.
3. **Signature count** — exactly one signature element. Zero means generic; two or more
   compete.
4. **Feasibility** — the signature must be buildable in HTML/CSS/JS you can actually
   write in this pass. An unbuildable signature becomes a placeholder, which is worse
   than a modest signature executed well.

### 3. Build

Build in this order, validating each stage before the next:

1. **Tokens first**: define the full set as CSS custom properties on `:root` — color
   ramps, type scale with line-heights, spacing scale, radii, shadows, focus ring
   (ready-made blocks in `references/design-principles.md`). Components reference only
   tokens; a hard-coded hex or px in a component is a bug.
2. **Semantic skeleton**: real landmarks (`header`, `nav`, `main`, `section`, `footer`),
   real heading order, real content — never lorem ipsum. Write the copy now: specific,
   active-voice, from the subject's vocabulary. If a section's copy is unwritable, the
   section shouldn't exist.
3. **Layout pass**: mobile-first; get every section's structure working at 375px and
   1280px before styling details.
4. **Component pass**: style components including *all* states — hover, focus-visible,
   active, disabled, and (for data UI) loading, empty, error.
5. **Signature + motion last**: build the signature element and the single orchestrated
   moment, with the `prefers-reduced-motion` fallback in the same commit — not retrofitted.

Watch CSS specificity so competing selectors don't silently cancel each other's spacing.

### 4. Critique the result

Render and screenshot at 375px and 1280px (both matter; the mobile view is where heroes
overflow and grids collapse). Then:

1. **Squint test** — blur or squint at the screenshot: exactly one focal point should
   survive. If not, demote until one does.
2. **Self-audit** — run the six-point audit at the end of `references/anti-ai-look.md`.
3. **Mechanical floor** — keyboard-walk the page (every interactive element reachable,
   focus visible), verify AA contrast on real fg/bg pairs, check alt text and labels.
4. **Subtraction pass** — remove the one element that least serves the page. If the page
   still holds, ship the removal; repeat once more.

Fix and re-screenshot; do not report a result you haven't looked at.

## Design checklist

Work top to bottom. Full rationale, numbers, and copy-pasteable CSS are in
`references/design-principles.md`.

- **Typography**
  - Pair a display + body face deliberately; set a modular type scale (ratio ~1.2–1.333)
    with paired line-heights, sizes in rem.
  - Body copy 16px+; line length 45–75 characters (`max-width: 65ch`); line-height ~1.5–1.6
    for body, tighter (1.0–1.25) for large headings; fluid hero sizes via `clamp()`.
  - Never go below 400 weight for UI text; de-emphasize with color or size, not thin weight.
  - Build hierarchy from size, weight, and color — not position alone.
- **Color**
  - Consider designing in grayscale first, then adding color last, to force real hierarchy.
  - Define a neutral ramp + primary + accent, each with 5–10 shades via the HSL ramp recipe;
    use tokens, never one-off hex. Tint greys toward the brand hue for cohesion.
  - Meet WCAG AA contrast: 4.5:1 for body text, 3:1 for large text (≥24px, or ≥18.66px bold)
    and meaningful UI elements. Test it; don't eyeball it.
- **Spacing & layout**
  - Use the constrained non-linear scale (4/8px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128);
    gaps inside a group must be smaller than gaps between groups.
  - Give elements room; start with too much whitespace and remove. Cramped reads as cheap.
  - Mobile-first with 2–3 content-driven breakpoints; prefer intrinsic layout
    (`auto-fit`/`minmax`) that needs none.
  - Lay out from content, not a fixed grid; allow asymmetry and grid-breaking where it
    encodes meaning. Section shapes should vary down the page (see `references/layout-patterns.md`).
- **Components**
  - Design states, not just the default: hover, focus-visible, active, disabled, loading,
    empty, error. Empty and error states give direction in plain language, not mood.
  - Reuse tokens and variants so components read as one system; label buttons with the
    action verb ("Save changes", not "Submit").
- **Depth**
  - Use the four-level layered-shadow system tuned to one implied light source; tint
    shadows with the dark neutral, not black. Depth comes from shadow + subtle background
    steps, not heavy borders.
- **Motion**
  - Prefer one orchestrated moment (a considered load or scroll reveal) over scattered effects —
    excess animation is itself a tell of AI-generated work.
  - Animate transform and opacity; ease-out entrances; 150–250ms micro / 300–400ms entrances;
    write motion inside `@media (prefers-reduced-motion: no-preference)`.
- **Accessibility & quality floor** (non-negotiable, not polish)
  - Responsive to mobile; visible `:focus-visible` rings (3:1 against surroundings);
    semantic HTML and landmarks; alt text; labelled controls; reduced-motion honored.

## Avoiding the AI look

The full tell-by-tell tables and fixes are in `references/anti-ai-look.md`. The short version:

- **Banned defaults**: Inter / Roboto / Arial / system-ui / Space Grotesk as the primary
  face; purple→blue hero gradients on white; purple as an unjustified default brand color;
  gradient-text headlines; every corner at one border-radius; three equal feature cards;
  icon-in-tinted-rounded-square card anatomy; announcement pills ("✨ Now with AI");
  a hero of one big number + tiny label + gradient accent; emoji as icons; glassmorphism
  and blurred background blobs; hover-scale on everything; fabricated social proof;
  fade-in-on-scroll on everything.
- **Three cliché palettes to avoid as defaults**: (1) warm cream `#F4F1EA` + high-contrast
  serif + terracotta; (2) near-black + one acid-green/vermilion accent; (3) hairline-rule
  broadsheet with zero radius. Each is legitimate when the brief calls for it — the point is
  not to land on one by accident when an axis is left free.
- **Fix**: draw type, color, and one structural idea from the subject's own world, and write
  specific copy (not "Empower your workflow") to match.

## Learning and following an existing design system

When the user has an existing site, brand, or component library, match it before you extend it.

1. **Extract the tokens.** Inspect the source — CSS custom properties, `tailwind.config`,
   Figma variables, or a live page's computed styles — and record the real values: color
   ramps, font families and scale, spacing units, border-radius, shadow definitions,
   container widths, and breakpoints. Map them to a token vocabulary (`--color-primary-600`,
   `--space-4`, `--radius-md`) so design and code share names. The W3C Design Tokens format
   is a useful vocabulary here.
2. **Infer the rules.** Note the patterns the tokens imply: radius convention, shadow style,
   density, capitalization, button shape, how motion is used, and the voice of the copy.
3. **Reuse, don't reinvent.** Build new components from the existing tokens and variants
   (e.g. class-variance-authority for shadcn/Tailwind). New pieces should be
   indistinguishable in origin from the originals.
4. **Extend consistently.** When a token is missing (a new state color, a wider spacing
   step), derive it from the existing scale's logic rather than inventing an ad-hoc value.
5. **Verify.** Place the new component beside real ones and confirm spacing, type, color,
   and radius align pixel-for-pixel.

## Worked example

**Brief**: one-page site for "Meridian", a small-batch coastal coffee roaster.

**Plan**
- Purpose: convince specialty-coffee buyers to order the seasonal subscription. Audience:
  design-literate home brewers. Job: get them to the subscribe CTA.
- Subject's world: nautical charts, tide tables, brass instruments, fog, rope, harbor
  signage, unbleached filter paper.
- Direction: salt-worn maritime editorial, justified by the list above.
- Color (HSL-reasoned): `--ink #12212B` (deep harbor navy), `--paper #F6F1E7` (unbleached
  filter), `--brass #B4884D` (accent), `--sea #3E6B6B` (muted teal), plus a navy-tinted
  neutral ramp derived by holding hue ~205° and stepping lightness.
- Type: display = a high-contrast transitional serif with maritime character; body = a
  humanist sans at 17px/1.55; utility = a mono for the "tide table" tasting-notes block.
- Layout: full-bleed hero (pattern 2) with an off-center headline; a tide-table-styled
  tasting grid; a narrative roast-origin section (pattern 6) with an animated coastline
  divider; colophon footer.
- Signature: the tasting notes rendered as a real tide table (rows = brew method, hand-set
  in mono) — a device pulled straight from the subject's world.
- Motion: one scroll reveal on the coastline divider; nothing else animates.

**Critique the plan**: the first draft was cream background + serif + terracotta — that is
cliché palette #1. Swapped terracotta for aged brass and shifted the ground to unbleached
filter-paper white so the palette reads maritime, not generic-artisanal.

**Build** — tokens first, then components that reference only tokens. Abridged but real:

```css
:root {
  /* color (contrast on --paper verified: ink 14.6:1, ink-2 7.7:1, sea 5.3:1) */
  --ink: #12212b;  --ink-2: #3a4e58;  --paper: #f6f1e7;
  --brass: #b4884d;  --sea: #3e6b6b;
  /* type */
  --font-display: "Playfair Display", Georgia, serif;
  --font-body: "Source Sans 3", "Gill Sans", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
  /* space / radius / shadow / focus */
  --space-2: 0.5rem; --space-4: 1rem; --space-6: 1.5rem;
  --space-8: 2rem; --space-16: 4rem;
  --radius-sm: 4px;
  --shadow-2: 0 1px 2px hsl(205 40% 12% / .08), 0 8px 24px hsl(205 40% 12% / .10);
  --focus-ring: var(--sea);
}
```

```html
<section class="hero">
  <p class="kicker">Roasted at the tide line — Mendocino, CA</p>
  <h1>Coffee that keeps harbor time.</h1>
  <p class="lead">Four single-origin lots a season, roasted the week they ship.</p>
  <a class="btn-primary" href="#subscribe">Start the seasonal subscription</a>
</section>

<table class="tide-table">
  <caption>Tasting chart — Lot 04 “Slack Water”</caption>
  <thead><tr><th scope="col">Brew</th><th scope="col">Time</th><th scope="col">Notes</th></tr></thead>
  <tbody>
    <tr><th scope="row">Pour-over</th><td>2:45</td><td>Salt caramel, kelp honey, meyer lemon</td></tr>
    <tr><th scope="row">Espresso</th><td>0:28</td><td>Dark toffee, brass, sea spray</td></tr>
  </tbody>
</table>
```

```css
.hero { background: var(--paper); color: var(--ink);
  padding: var(--space-16) var(--space-6); }
.kicker { font-family: var(--font-mono); font-size: 0.875rem;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--sea); }
.hero h1 { font-family: var(--font-display);
  font-size: clamp(2.5rem, 1.5rem + 4vw, 4.25rem);
  line-height: 1.05; letter-spacing: -0.02em; max-width: 14ch; }  /* off-center: no auto margins */
.lead { font-family: var(--font-body); font-size: 1.125rem;
  line-height: 1.55; max-width: 45ch; color: var(--ink-2); }

.btn-primary { display: inline-block; background: var(--ink); color: var(--paper);
  font-family: var(--font-body); font-weight: 600;
  padding: var(--space-2) var(--space-6); border-radius: var(--radius-sm); }
.btn-primary:hover { background: var(--sea); }
.btn-primary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

.tide-table { font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  border-collapse: collapse; }
.tide-table :is(td, th) { padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--brass); text-align: left; }
.tide-table td:nth-child(2) { text-align: right; }
```

Every value traces to a token; the headline sits off-center (no `margin-inline: auto`);
the table borders reuse `--brass` so the signature ties into the palette. The coastline
reveal is written inside `@media (prefers-reduced-motion: no-preference)`; focus rings are
visible; the layout reflows to a single column under 640px.

**Final critique**: removed a decorative rope-texture footer background — it competed with the
tide-table signature. One bold element, kept.

## Sources

- Anthropic, *frontend-design* skill (official `SKILL.md`): https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Anthropic, *Improving frontend design through Skills*: https://claude.com/blog/improving-frontend-design-through-skills
- Adam Wathan & Steve Schoger, *Refactoring UI*: https://www.refactoringui.com/ — principle summary: https://www.sglavoie.com/posts/book-summary-refactoring-ui/
- W3C Design Tokens Community Group (design-token vocabulary and format): https://www.w3.org/community/design-tokens/
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2* (contrast minimums): https://www.w3.org/TR/WCAG22/
- WebAIM, *Contrast Checker*: https://webaim.org/resources/contrastchecker/
- MDN, `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- MDN, `:focus-visible`: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- Utopia (fluid type/space scale calculator): https://utopia.fyi/
