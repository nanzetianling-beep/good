---
name: frontend-design
description: Guidance for building distinctive, polished web UI/UX with HTML/CSS/JS that avoids the generic "AI-generated" look. Use when creating or reshaping a landing page, marketing/corporate site, web design mockup, hero section, or any UI prototype, and when you need to learn an existing design system and produce original components that follow its rules.
---

# Front-end Design

## Overview

Left unguided, generated web pages converge on a recognizable "AI look": Inter/Roboto,
a purple-to-blue gradient on white, evenly rounded cards, three feature columns, and
timid motion. This happens because safe, universal choices dominate training data, so
sampling drifts toward that high-probability center. This skill counteracts that drift.
It produces sites with a deliberate visual identity: opinionated typography, a palette
grounded in the subject, intentional layout, and motion that serves a purpose — the
kind of work a small design studio would ship for a paying client.

## When to use

- Building a landing page, marketing site, corporate-site mockup, or product page.
- Designing a hero section, pricing table, feature grid, or any web component from scratch.
- Reworking a UI that "looks fine but generic" into something with a point of view.
- Learning an existing design system / brand and producing new UI that matches it.

## Core principle

**Ground every choice in the subject.** Before touching CSS, name the concrete subject,
its audience, and the page's single job. The subject's own world — its materials,
instruments, artifacts, and vernacular — is where distinctive choices come from. A page
for a marine-research lab, a jazz label, and a tax-software company should look nothing
alike. If a decision would fit any of them equally well, it is a default, not a choice.

**Spend your boldness in one place.** Pick one signature element to be the memorable
thing and keep everything around it quiet and disciplined. Elegance is executing a
chosen vision well, not piling on effects.

## Workflow: plan → critique → build → critique

Do not jump straight to code. Follow four steps.

### 1. Plan (a compact token system)

Write these down before building:

- **Purpose**: subject, audience, and the one job of the page, in a sentence.
- **Aesthetic direction**: name it (e.g. editorial, brutalist, warm-minimal, technical,
  retro-futuristic, luxury). Justify it from the subject.
- **Color**: 4–6 named hex values — greys + 1–2 primaries + 1–2 accents. Reason in HSL
  so related shades share hue/saturation. Plan 5–10 shades per role for real UIs.
- **Type**: at least two roles — a characterful display face used with restraint and a
  readable body face — plus a mono/utility face if data is shown. Not the families you
  reach for on every project.
- **Layout**: one-sentence prose per section plus a quick ASCII wireframe.
- **Signature**: the single element that embodies the brief (a custom hero interaction,
  a distinctive grid, a typographic treatment, an illustrative motif).

### 2. Critique the plan

Test the plan against the brief. If any part reads like a templated default (see
`references/anti-ai-look.md`), revise it and state what changed and why. Only build once
the plan is demonstrably specific to this subject.

### 3. Build

Implement with the plan's real content, not lorem ipsum. Apply the design checklist
below. Watch CSS specificity so classes don't silently cancel each other's spacing.

### 4. Critique the result

Screenshot it and review honestly. Then, as a discipline: remove one element that does
not serve the brief.

## Design checklist

Work top to bottom. Full rationale and numbers live in
`references/design-principles.md`.

- **Typography**
  - Pair a display + body face deliberately; set a clear type scale (e.g. 1.2–1.333 ratio).
  - Body copy 16px+; line length 45–75 characters (~20–35em); line-height ~1.5 for body,
    tighter (1.1–1.25) for large headings.
  - Avoid font weights under 400 for UI text; de-emphasize with color/size, not thin weight.
  - Use real hierarchy: control emphasis with size, weight, and color — not position alone.
- **Color**
  - Define greys + primary + accent, each with a shade ramp; use tokens, never one-off hex.
  - Don't rely on a single grey — build a full neutral ramp. Saturate greys slightly toward
    the brand hue for cohesion.
  - Ensure text meets WCAG AA contrast (4.5:1 body, 3:1 large text).
- **Spacing & layout**
  - Use a constrained spacing scale (e.g. 4/8px base: 4, 8, 12, 16, 24, 32, 48, 64, 96).
  - Give elements room — generous whitespace reads as intentional, not empty.
  - Start layouts from content, not a fixed grid; allow asymmetry and grid-breaking where
    it encodes meaning. Structural devices (numbering, eyebrows, dividers) must encode
    truth — numbered 01/02/03 markers only when the content is genuinely a sequence.
- **Components**
  - Design states, not just the default: hover, focus-visible, active, disabled, loading,
    empty, error. Empty and error states give direction, not mood.
  - Reuse tokens and variants so components read as one system.
- **Depth**
  - Suggest elevation with soft, layered shadows tuned to one light source; avoid harsh
    default box-shadows. Depth comes from shadow + subtle color shifts, not heavy borders.
- **Motion**
  - Prefer one orchestrated moment (a considered load or scroll reveal) over scattered
    effects — excess animation is itself a tell of AI-generated work.
  - Use easing (ease-out for entrances), ~150–400ms durations, and respect
    `prefers-reduced-motion`.
- **Accessibility & quality floor**
  - Responsive to mobile; visible keyboard focus; semantic HTML/landmarks; alt text;
    labelled controls; reduced-motion honored. This is non-negotiable, not polish.

## Avoiding the AI look

The tells and the fixes are in `references/anti-ai-look.md`. The short version:

- **Banned defaults**: Inter / Roboto / Arial / system-ui / Space Grotesk as the primary
  face; purple→blue hero gradients; every corner at the same border-radius; three equal
  feature cards; a big number + small label + gradient accent hero.
- **Three cliché palettes to avoid as defaults**: (1) warm cream `#F4F1EA` + high-contrast
  serif + terracotta accent; (2) near-black + one acid-green/vermilion accent; (3)
  hairline-rule broadsheet with zero radius. Each is fine for a brief that calls for it —
  but don't spend a free axis landing on one by default.
- **Fix**: choose type, color, and one structural idea from the subject's own world.

## Learning and following an existing design system

When the user has an existing site, brand, or component library, match it before you
extend it:

1. **Extract the tokens.** Inspect the source (CSS variables, `tailwind.config`, Figma
   values, or a live page) and record the real values: color ramps, font families and
   scale, spacing units, border-radius, shadow definitions, container widths, breakpoints.
   Map them to a token vocabulary (`--color-primary-600`, `--space-4`, `--radius-md`) so
   design and code share names.
2. **Infer the rules.** Note patterns the tokens imply: radius convention, shadow style,
   density, capitalization, button shapes, how motion is used, voice of the copy.
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
  neutral ramp.
- Type: display = a high-contrast transitional serif with maritime character; body = a
  humanist sans at 17px/1.55; utility = a mono for the "tide table" tasting-notes block.
- Layout: full-bleed hero photo of pour-over with an off-center headline; a tide-table-styled
  tasting grid; a roast-origin section with a subtle animated coastline divider.
- Signature: the tasting notes rendered as a real tide table (rows = brew time, hand-set
  in mono), a device pulled straight from the subject's world.

**Critique**: the first idea was a cream background + serif + terracotta accent — that is
cliché palette #1. Swapped terracotta for aged brass and shifted the ground to unbleached
filter-paper white so the palette reads maritime, not generic-artisanal.

**Build**: tokens as CSS variables; spacing on an 8px scale; one orchestrated scroll reveal
on the coastline divider (disabled under reduced-motion); AA contrast on all text; visible
focus rings; single-column reflow under 640px.

**Final critique**: removed a decorative rope-texture background from the footer — it
competed with the tide-table signature. One bold element, kept.

## Sources

- Anthropic, *Frontend Design* skill (official SKILL.md): https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
- Anthropic, *Improving frontend design through Skills*: https://claude.com/blog/improving-frontend-design-through-skills
- Adam Wathan & Steve Schoger, *Refactoring UI* (principles + summaries): https://www.refactoringui.com/ and notes at https://gist.github.com/selcukcihan/b9418596a98abfcd4bbc622550820cc5
- Tailwind CSS v4 + shadcn/ui design-token best practices: https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/
