# Design Principles Reference

Concrete numbers and rules behind the SKILL.md checklist. Distilled mainly from
*Refactoring UI* (Wathan & Schoger) and Tailwind/shadcn token practice, adapted for
web output. Use these as defaults, not laws — the brief can justify departures.

## Visual hierarchy

- Emphasis is relative. Establish importance with **size, weight, and color**, not by
  pushing elements around the layout.
- De-emphasize instead of emphasizing: to make secondary text recede, use a lighter grey
  or smaller size — do not use a thin font weight.
- Don't use grey text on colored backgrounds; instead pick a color with the same hue as
  the background, adjusting saturation and lightness.
- Labels are often unnecessary; when the format makes meaning obvious (e.g. "$99/mo"),
  combine label and value or drop the label.

## Typography

- **Font size scale**: use a fixed modular scale rather than arbitrary pixels, e.g.
  12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72. Ratios ~1.2 (minor third) to 1.333 (perfect
  fourth) work well.
- **Body size**: 16px minimum for paragraph text; 16–20px is the comfortable range.
- **Line length**: 45–75 characters per line for readable paragraphs (~20–35em / `max-width`).
- **Line height**: proportional to width and size. Body ~1.5; narrow columns can go 1.5,
  wide columns up to ~2. Large headings tighten to 1.1–1.25.
- **Font weight**: never below 400 for UI text. Headings 500–700. Pair weights with size,
  not thinness, for contrast.
- **Letter spacing**: default tracking is usually fine; tighten large display headings
  slightly (-0.01 to -0.03em), loosen all-caps labels (+0.05 to +0.1em).
- **Pairing**: one display face + one body face is plenty. Choose faces with real
  character and at least 5 weights; avoid the overused defaults (see anti-ai-look.md).
- **Alignment**: left-align most text; center only short blocks (1–2 lines). Align numbers
  right in tables; use tabular figures for aligned data.

## Color

- **Reason in HSL**, not hex — hue/saturation/lightness are easier to relate across shades.
- A real UI needs more colors than expected: greys (8–10 shades), 1–2 primaries, and a
  few accents (success/warning/danger/info), each with 5–10 shades.
- **Build grey ramps deliberately**; don't lighten one grey with opacity. Saturate greys
  slightly toward the brand hue (cool or warm) for cohesion.
- **Perceived brightness**: rotating hue toward brighter neighbors (e.g. toward yellow)
  while adjusting lightness keeps shades from looking muddy or washed out.
- **Accessible contrast**: WCAG AA needs 4.5:1 for body text, 3:1 for large text (≥24px
  or ≥19px bold) and meaningful UI elements. Test it; don't eyeball it.
- **Tokens**: expose colors as CSS variables (`--color-primary-600`) and reference tokens
  everywhere — no one-off hex in components. This is what makes theming and dark mode work.

## Spacing & layout

- **Spacing scale**: base 4px or 8px; a good ramp is 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
  The scale is not linear on purpose — small steps near the bottom, large jumps at the top.
- **Whitespace**: start with too much and remove; generous spacing reads as confident and
  intentional. Cramped layouts read as cheap.
- **Don't fill the screen**: give elements only the width they need; a form field does not
  have to span the container. Use `max-width` on text and content.
- **Layout from content out**: decide what an element needs, then size it — don't force
  content into a predetermined grid. Asymmetry and grid-breaking are fine when they encode
  meaning; avoid them as random decoration.
- **Group with proximity**: related items close, unrelated items far. Ambiguous spacing
  (equal gap inside and between groups) is a common readability bug.

## Depth & elevation

- Light comes from above: top edge slightly lighter, bottom shadow. Keep a single implied
  light source across the whole page.
- Use **soft, layered shadows** (two or more stacked with different blur/offset) rather than
  one harsh shadow. Larger elevation = larger, softer, more spread shadow.
- Reduce reliance on borders; separate regions with spacing, a subtle background shift, or
  a soft shadow before reaching for a 1px line.
- Flat design still has hierarchy — use subtle background-color steps to layer surfaces.

## Components & states

- Design every interactive state: default, hover, focus-visible, active, disabled, loading,
  selected. Missing states are where "prototype" becomes "unfinished".
- **Empty states** should onboard and direct action, not show a sad icon. **Error states**
  say what happened and how to fix it, in plain language, without apologizing or being vague.
- Use variant systems (e.g. class-variance-authority with Tailwind/shadcn) so a button's
  sizes and intents stay consistent and token-driven.
- Buttons: label with the action verb ("Save changes", not "Submit"); keep the verb constant
  through the flow ("Publish" button → "Published" toast).

## Motion

- Purposeful, not decorative. Prefer one orchestrated moment (load sequence or a single
  scroll reveal) over many scattered micro-animations.
- Durations ~150–400ms; ease-out for entrances, ease-in for exits, ease-in-out for moves.
- Animate transform and opacity (cheap/compositable); avoid animating layout properties.
- Always honor `@media (prefers-reduced-motion: reduce)` — provide a static equivalent.

## Images & media

- Don't place text directly on busy images without a scrim/overlay or gradient for contrast.
- Keep icon and image scale consistent; don't stretch a small icon to headline size.
- Use consistent aspect ratios in galleries/grids; crop rather than distort.
