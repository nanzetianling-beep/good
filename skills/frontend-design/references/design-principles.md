# Design Principles Reference

Concrete numbers, ready-to-use snippets, and rules behind the SKILL.md checklist. Distilled
mainly from *Refactoring UI* (Wathan & Schoger) and design-token practice, adapted for web
output. Use these as defaults, not laws — the brief can justify departures. All CSS below is
valid and copy-pasteable; rename tokens to match the project.

## Visual hierarchy

- Emphasis is relative. Establish importance with **size, weight, and color**, not by
  pushing elements around the layout.
- **Design in grayscale first**, add color last. Building hierarchy with spacing, size, and
  contrast before color prevents leaning on color as a crutch.
- De-emphasize instead of emphasizing: to make secondary text recede, use a lighter grey
  or smaller size — do not use a thin font weight.
- Don't use grey text on colored backgrounds; instead pick a color with the same hue as
  the background, adjusting saturation and lightness.
- Labels are often unnecessary; when the format makes meaning obvious (e.g. "$99/mo"),
  combine label and value or drop the label.
- A useful test: squint (or blur the screenshot). Exactly one element should still
  dominate. If two or three compete, demote all but one.

## Typography

- **Body size**: 16px minimum for paragraph text; 16–20px is the comfortable range.
- **Line length**: 45–75 characters per line for readable paragraphs. Enforce with
  `max-width` in `ch` units (e.g. `max-width: 65ch`) rather than guessing pixels.
- **Line height**: proportional to width and size. Body ~1.5–1.6; narrow columns 1.5,
  wide columns up to ~2. Large headings tighten to 1.0–1.25.
- **Font weight**: never below 400 for UI text. Headings 500–700. Pair weights with size,
  not thinness, for contrast.
- **Letter spacing**: default tracking is usually fine; tighten large display headings
  slightly (-0.01 to -0.03em), loosen all-caps labels (+0.05 to +0.1em).
- **Pairing**: one display face + one body face is plenty (plus an optional mono for data).
  Choose faces with real character and at least 5 weights; avoid the overused defaults
  (see anti-ai-look.md).
- **Alignment**: left-align most text; center only short blocks (1–2 lines). Align numbers
  right in tables; use `font-variant-numeric: tabular-nums` for aligned data.

### A complete type scale, ready to use

Modular scale, ratio ≈1.25 (major third), base `1rem` = 16px, hand-rounded at the top end
(pure ratios produce awkward values like 3.052rem — round to clean quarters). Each step has
a paired line-height; ship them together so nobody re-derives leading per component.

```css
:root {
  /* size / line-height / typical role */
  --text-xs:   0.75rem;   --lh-xs:   1.5;   /* 12px — fine print, table captions */
  --text-sm:   0.875rem;  --lh-sm:   1.5;   /* 14px — secondary UI, captions, labels */
  --text-base: 1rem;      --lh-base: 1.6;   /* 16px — body copy */
  --text-lg:   1.125rem;  --lh-lg:   1.55;  /* 18px — lead paragraph, roomy body */
  --text-xl:   1.25rem;   --lh-xl:   1.4;   /* 20px — h4, card titles */
  --text-2xl:  1.5rem;    --lh-2xl:  1.3;   /* 24px — h3 */
  --text-3xl:  1.875rem;  --lh-3xl:  1.2;   /* 30px — h2 */
  --text-4xl:  2.5rem;    --lh-4xl:  1.12;  /* 40px — h1 */
  --text-5xl:  3.25rem;   --lh-5xl:  1.05;  /* 52px — hero display */
  --text-6xl:  4.25rem;   --lh-6xl:  1.0;   /* 68px — oversized display */
}
h1 { font-size: var(--text-4xl); line-height: var(--lh-4xl); }
```

Rules of use:

- Pick from the scale only. If a size "needs" to be between steps, the hierarchy problem
  is elsewhere (weight, color, spacing).
- Skip steps to create contrast: h1 at `--text-4xl` with body at `--text-base` reads as
  hierarchy; h1 at `--text-lg` does not.
- For heroes, make the display size fluid instead of adding breakpoint overrides:

```css
.hero-title {
  /* 2.5rem at ~375px viewport → 4.25rem at ~1280px, no breakpoints needed */
  font-size: clamp(2.5rem, 1.75rem + 3.2vw, 4.25rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
}
```

(Utopia — utopia.fyi — is a good calculator for fluid scales like this.)

## Color

- **Reason in HSL**, not hex — hue/saturation/lightness are easier to relate across shades.
- A real UI needs more colors than expected: greys (8–10 shades), 1–2 primaries, and a
  few accents (success/warning/danger/info), each with 5–10 shades.
- **Perceived brightness**: rotating hue a few degrees toward a brighter neighbor (yellow
  at 60°, cyan at 180°, magenta at 300°) as shades lighten — and toward a darker neighbor as
  they darken — keeps ramps from looking muddy or washed out.
- **Accessible contrast**: WCAG AA needs 4.5:1 for body text and 3:1 for large text (≥24px,
  or ≥18.66px / 14pt bold) and meaningful UI components. Test with a real checker
  (e.g. WebAIM's); don't eyeball it.
- **Tokens**: expose colors as CSS custom properties (`--color-primary-600`) and reference
  tokens everywhere — no one-off hex in components. This is what makes theming, consistency,
  and dark mode work. The W3C Design Tokens format gives a portable naming vocabulary.

### Recipe: generate a 10-step HSL ramp from one brand color

1. **Fix the anchor.** Choose the brand color as the 600 step (dark enough that white text
   on it passes AA). Note its H/S/L.
2. **Ladder the lightness.** Use this ladder, tuned so steps are perceptually even-ish:
   `50:96, 100:90, 200:80, 300:66, 400:54, 500:44, 600:36, 700:28, 800:21, 900:15`.
3. **Curve the saturation.** Drop saturation ~10–15 points at the light end (400–300–200)
   so mids don't turn chalky, and recover it toward both extremes.
4. **Drift the hue.** Rotate 1° per step toward the darker neighbor as you darken
   (optional, subtle — keeps darks rich instead of grey).
5. **Verify contrast**, then assign roles (see below).

Worked output for a teal brand color `hsl(193 50% 36%)` as 600 (contrast figures computed
against `#fff`):

```css
:root {
  --teal-50:  hsl(190 55% 96%);  /* tinted page background            */
  --teal-100: hsl(190 55% 90%);  /* hover wash, selected row          */
  --teal-200: hsl(190 50% 80%);  /* borders on tinted surfaces        */
  --teal-300: hsl(190 46% 66%);  /* decorative, large glyphs          */
  --teal-400: hsl(191 42% 54%);  /* icons on dark grounds             */
  --teal-500: hsl(192 45% 44%);  /* 3.7:1 vs white — large text only  */
  --teal-600: hsl(193 50% 36%);  /* 5.2:1 vs white — buttons, links   */
  --teal-700: hsl(194 52% 28%);  /* 7.5:1 — hover on 600, small text  */
  --teal-800: hsl(195 52% 21%);  /* 10.6:1 — headings on light        */
  --teal-900: hsl(196 50% 15%);  /* 14:1 — near-black brand ink       */
}
```

### Recipe: a tinted neutral ramp

Never use pure grey (`hsl(0 0% x%)`) next to a colored brand — it looks detached. Hold the
brand hue and keep saturation low (8–25%), rising slightly at the dark end where saturation
is barely visible but keeps darks warm/cool:

```css
:root {
  --grey-50:  hsl(200 15% 97%);  /* app background                    */
  --grey-100: hsl(200 14% 93%);  /* card background step              */
  --grey-200: hsl(200 12% 86%);  /* hairlines, dividers               */
  --grey-300: hsl(202 11% 74%);  /* disabled text/borders             */
  --grey-400: hsl(203 10% 58%);  /* placeholder text (3:1 vs white)   */
  --grey-500: hsl(204 10% 46%);  /* secondary text (4.6:1 vs white)   */
  --grey-600: hsl(205 12% 36%);  /* body text on tinted grounds       */
  --grey-700: hsl(205 15% 27%);  /* body text                         */
  --grey-800: hsl(206 18% 18%);  /* headings                          */
  --grey-900: hsl(207 22% 12%);  /* highest-emphasis ink              */
}
```

Don't lighten one grey with opacity to fake a ramp — semi-transparent greys shift
unpredictably over images and tinted surfaces. (Exception: shadows and scrims, where
blending is the point.)

## Spacing & layout

### Spacing scale

Base 8px with a 4px half-step; non-linear on purpose — small steps at the bottom for
intra-component rhythm, big jumps at the top for section-level air.

| Token       | rem      | px  | Typical use                                        |
| ----------- | -------- | --- | -------------------------------------------------- |
| `--space-1` | 0.25rem  | 4   | icon-to-label gap, badge padding                   |
| `--space-2` | 0.5rem   | 8   | label-to-input, button padding-block               |
| `--space-3` | 0.75rem  | 12  | compact card padding, list-item gap                |
| `--space-4` | 1rem     | 16  | default gap inside a component                     |
| `--space-6` | 1.5rem   | 24  | card padding, gap between related blocks           |
| `--space-8` | 2rem     | 32  | gap between component groups                       |
| `--space-12`| 3rem     | 48  | subsection separation                              |
| `--space-16`| 4rem     | 64  | section padding-block (mobile)                     |
| `--space-24`| 6rem     | 96  | section padding-block (desktop)                    |
| `--space-32`| 8rem     | 128 | hero breathing room, major section breaks          |

Rules of use:

- **Nesting must shrink**: gaps inside a group < gap between groups, or grouping is
  ambiguous — the most common readability bug.
- If two adjacent values both look fine, take the larger. Generous spacing reads as
  confident; cramped reads as cheap.
- **Don't fill the screen**: give elements only the width they need; a form field does not
  have to span the container. Use `max-width` on text and content.
- **Layout from content out**: decide what an element needs, then size it — don't force
  content into a predetermined grid. Asymmetry and grid-breaking are fine when they encode
  meaning; avoid them as random decoration.

### Responsive breakpoint strategy

- **Mobile-first**: write base styles for a ~375px viewport, add `min-width` media queries
  to *enhance*, never `max-width` queries to patch desktop-first CSS.
- Standard cut points (align with Tailwind so teams share vocabulary):
  `40rem` (640) · `48rem` (768) · `64rem` (1024) · `80rem` (1280). But break where the
  **content** breaks — if the nav wraps at 52rem, add a query at 52rem, not the nearest
  standard stop.
- Budget: a typical marketing page needs **2–3 breakpoints total**, not one per section.
  Prefer intrinsic techniques that need none:

```css
/* Grid that reflows without media queries */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
  gap: var(--space-6);
}

/* Standard page container */
.container {
  max-width: 72rem;            /* 1152px; 80rem for airy marketing pages */
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 2.5rem);
}
```

- Test at 375px, 768px, 1280px minimum. The 375px pass is where heroes overflow,
  tables need `overflow-x: auto`, and 4-column footers must stack.

## Depth & elevation

- Light comes from above: top edge slightly lighter, bottom shadow. Keep a single implied
  light source across the whole page.
- Use **soft, layered shadows** (two or more stacked with different blur/offset) rather than
  one harsh shadow. Larger elevation = larger, softer, more spread shadow.
- Tint shadows with the page's dark neutral, not pure black — `hsl(0 0% 0% / .2)` over a
  warm page looks like a smudge.
- Reduce reliance on borders; separate regions with spacing, a subtle background shift, or
  a soft shadow before reaching for a 1px line.

### Elevation levels, ready to use

Four levels are enough for almost any page. Each pairs a tight "contact" shadow (small
blur, keeps the edge grounded) with an "ambient" shadow (large blur, sells the height).
`220 40% 20%` here is the dark neutral of a cool-tinted system — swap in yours.

```css
:root {
  --shadow-color: 220 40% 20%;
  /* 1 — resting cards, inputs */
  --shadow-1: 0 1px 2px hsl(var(--shadow-color) / 0.08);
  /* 2 — raised cards, dropdowns */
  --shadow-2: 0 1px 2px hsl(var(--shadow-color) / 0.07),
              0 3px 8px hsl(var(--shadow-color) / 0.08);
  /* 3 — popovers, sticky headers over content */
  --shadow-3: 0 2px 4px  hsl(var(--shadow-color) / 0.06),
              0 8px 20px hsl(var(--shadow-color) / 0.10);
  /* 4 — modals, command palettes */
  --shadow-4: 0 4px 8px   hsl(var(--shadow-color) / 0.06),
              0 20px 48px hsl(var(--shadow-color) / 0.16);
}
```

Rules of use: one element per view at level 3+; hover may promote an interactive card one
level (1→2), never two; flat designs replace shadows with background-color steps
(`--grey-50` page → white card → `--grey-100` inset well) — hierarchy still exists.

## Components & states

- Design every interactive state: default, hover, focus-visible, active, disabled, loading,
  selected. Missing states are where "prototype" becomes "unfinished".
- **Empty states** should onboard and direct action, not show a sad icon. **Error states**
  say what happened and how to fix it, in plain language, without apologizing or being vague.
- Use variant systems (e.g. class-variance-authority with Tailwind/shadcn) so a button's
  sizes and intents stay consistent and token-driven.
- Buttons: label with the action verb ("Save changes", not "Submit"); keep the verb constant
  through the flow ("Publish" button → "Published" toast).

### Focus states, ready to use

`:focus-visible` fires for keyboard focus but not most mouse clicks, so you can make rings
bold without annoying pointer users. Never `outline: none` without a replacement.

```css
:root { --focus-ring: var(--teal-600); }

/* One global rule covers nearly everything */
:where(a, button, input, select, textarea, summary,
       [tabindex]):focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: inherit;       /* ring follows the control's shape */
}

/* On dark or brand-colored grounds, a halo ring stays visible */
.on-dark :focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--grey-900), 0 0 0 4px var(--focus-ring);
}
```

Requirements: the ring must meet 3:1 contrast against the surrounding background, and every
interactive element must be reachable and visibly focused on a keyboard-only walk of the page.

## Motion

- Purposeful, not decorative. Prefer one orchestrated moment (load sequence or a single
  scroll reveal) over many scattered micro-animations.
- Durations: 150–250ms for micro-interactions (hover, toggle), 300–400ms for entrances and
  larger moves; ease-out for entrances, ease-in for exits, ease-in-out for moves.
- Animate `transform` and `opacity` only (compositor-cheap); avoid animating `width`,
  `height`, `top`, `margin` (layout thrash).
- Always honor `prefers-reduced-motion`.

### Reduced-motion pattern, ready to use

Prefer the **opt-in** form — motion is written inside a `no-preference` query, so the
reduced experience is the default and nothing is forgotten:

```css
@keyframes rise-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .reveal { animation: rise-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  html    { scroll-behavior: smooth; }
}
```

For an existing animation-heavy codebase, the blanket kill-switch is the pragmatic fallback
(near-zero duration rather than `none`, so `animationend`-dependent JS still fires):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Reduced motion ≠ no change: opacity crossfades are fine; it's the movement, parallax, and
zoom that must go.

## Images & media

- Don't place text directly on busy images without a scrim/overlay or gradient for contrast
  (e.g. `background: linear-gradient(180deg, hsl(0 0% 0% / 0) 40%, hsl(0 0% 0% / 0.6));`
  over the image, text on top).
- Keep icon and image scale consistent; don't stretch a small icon to headline size.
- Use consistent aspect ratios in galleries/grids (`aspect-ratio: 3 / 2` +
  `object-fit: cover`); crop rather than distort.
