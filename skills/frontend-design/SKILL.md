---
name: frontend-design
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
- `references/design-principles.md` — the numbers and rules behind the checklist below.
- `references/anti-ai-look.md` — the specific "AI look" tells and the fix for each.

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

Do not jump straight to code. Follow four steps.

### 1. Plan a compact token system

Write these down before building:

- **Purpose**: subject, audience, and the one job of the page, in a sentence.
- **Aesthetic direction**: name it (e.g. editorial, brutalist, warm-minimal, technical,
  retro-futuristic, luxury) and justify it from the subject.
- **Color**: 4–6 named values — a neutral ramp plus 1–2 primaries and 1–2 accents. Reason
  in HSL so related shades share hue and saturation. Plan 5–10 shades per role for a real UI.
- **Type**: at least two roles — a characterful display face used with restraint and a
  readable body face — plus a mono/utility face if data is shown. Not the families you
  reach for on every project.
- **Layout**: one sentence of prose per section, plus a quick ASCII wireframe.
- **Signature**: the single element that embodies the brief (a custom hero interaction, a
  distinctive grid, a typographic treatment, an illustrative motif drawn from the subject).

### 2. Critique the plan

Test each part against the brief. If anything reads like a templated default (see
`references/anti-ai-look.md`), revise it and state what changed and why. Only build once the
plan is demonstrably specific to this subject.

### 3. Build

Implement with the plan's real content, not lorem ipsum. Define tokens as CSS custom
properties and reference them everywhere. Apply the checklist below. Watch CSS specificity
so competing selectors don't silently cancel each other's spacing.

### 4. Critique the result

Screenshot it and review honestly against the brief. Then, as a discipline, remove the one
element that least serves the page and confirm it still holds.

## Design checklist

Work top to bottom. Full rationale and numbers are in `references/design-principles.md`.

- **Typography**
  - Pair a display + body face deliberately; set a modular type scale (ratio ~1.2–1.333).
  - Body copy 16px+; line length 45–75 characters (~20–35em); line-height ~1.5 for body,
    tighter (1.1–1.25) for large headings.
  - Never go below 400 weight for UI text; de-emphasize with color or size, not thin weight.
  - Build hierarchy from size, weight, and color — not position alone.
- **Color**
  - Consider designing in grayscale first, then adding color last, to force real hierarchy.
  - Define a neutral ramp + primary + accent, each with 5–10 shades; use tokens, never
    one-off hex. Saturate greys slightly toward the brand hue for cohesion.
  - Meet WCAG AA contrast: 4.5:1 for body text, 3:1 for large text (≥24px, or ≥18.66px bold)
    and meaningful UI elements. Test it; don't eyeball it.
- **Spacing & layout**
  - Use a constrained non-linear scale (4/8px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128).
  - Give elements room; start with too much whitespace and remove. Cramped reads as cheap.
  - Lay out from content, not a fixed grid. Group related items by proximity. Allow asymmetry
    and grid-breaking where it encodes meaning — numbered 01/02/03 markers only when the
    content is genuinely a sequence.
- **Components**
  - Design states, not just the default: hover, focus-visible, active, disabled, loading,
    empty, error. Empty and error states give direction in plain language, not mood.
  - Reuse tokens and variants so components read as one system; label buttons with the
    action verb ("Save changes", not "Submit").
- **Depth**
  - Suggest elevation with soft, layered shadows tuned to one implied light source; avoid the
    harsh default box-shadow. Depth comes from shadow + subtle background steps, not heavy borders.
- **Motion**
  - Prefer one orchestrated moment (a considered load or scroll reveal) over scattered effects —
    excess animation is itself a tell of AI-generated work.
  - Animate transform and opacity; use ease-out for entrances, ~150–400ms durations, and
    honor `prefers-reduced-motion`.
- **Accessibility & quality floor** (non-negotiable, not polish)
  - Responsive to mobile; visible keyboard focus; semantic HTML and landmarks; alt text;
    labelled controls; reduced-motion honored.

## Avoiding the AI look

The full tell-by-tell table and fixes are in `references/anti-ai-look.md`. The short version:

- **Banned defaults**: Inter / Roboto / Arial / system-ui / Space Grotesk as the primary
  face; purple→blue hero gradients on white; every corner at one border-radius; three equal
  feature cards; a hero of one big number + tiny label + gradient accent; emoji as icons;
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
- Direction: salt-worn maritime editorial — nautical charts, tide tables, brass instruments.
- Color (HSL-reasoned): `--ink #12212B` (deep harbor navy), `--paper #F6F1E7` (unbleached
  filter), `--brass #B4884D` (accent), `--sea #3E6B6B` (muted teal), plus a 5-step navy
  neutral ramp derived by holding hue ~200° and stepping lightness.
- Type: display = a high-contrast transitional serif with maritime character; body = a
  humanist sans at 17px/1.55; utility = a mono for the "tide table" tasting-notes block.
- Layout: full-bleed hero photo of a pour-over with an off-center headline; a
  tide-table-styled tasting grid; a roast-origin section with a subtle animated coastline divider.
- Signature: the tasting notes rendered as a real tide table (rows = brew time, hand-set in
  mono) — a device pulled straight from the subject's world.

**Critique the plan**: the first draft was cream background + serif + terracotta — that is
cliché palette #1. Swapped terracotta for aged brass and shifted the ground to unbleached
filter-paper white so the palette reads maritime, not generic-artisanal.

**Build** (tokens first, then components reference only tokens):

```css
:root {
  --ink: #12212b; --paper: #f6f1e7; --brass: #b4884d; --sea: #3e6b6b;
  --space-1: 8px; --space-2: 16px; --space-3: 24px; --space-4: 48px;
  --radius-sm: 4px; --shadow-1: 0 1px 2px rgba(18,33,43,.08), 0 8px 24px rgba(18,33,43,.10);
}
```

One orchestrated scroll reveal animates the coastline divider (static under
`prefers-reduced-motion`); all text meets AA contrast; focus rings are visible; the layout
reflows to a single column under 640px.

**Final critique**: removed a decorative rope-texture footer background — it competed with the
tide-table signature. One bold element, kept.

## Sources

- Anthropic, *frontend-design* skill (official `SKILL.md`): https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Anthropic, *Improving frontend design through Skills*: https://claude.com/blog/improving-frontend-design-through-skills
- Adam Wathan & Steve Schoger, *Refactoring UI*: https://www.refactoringui.com/ — principle summary: https://www.sglavoie.com/posts/book-summary-refactoring-ui/
- W3C Design Tokens Community Group (design-token vocabulary and format): https://www.w3.org/community/design-tokens/
