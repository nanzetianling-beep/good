# Anti-"AI Look" Reference

Why generated pages look generated, the specific tells, and how to fix each one.

## Why it happens

During sampling a model predicts the highest-probability tokens. Safe design choices that
work for any brief and offend no one dominate web training data, so with no direction the
output drifts to that statistical center ("distributional convergence"). The fix is
direction: make deliberate choices grounded in one specific subject, and take one real,
justifiable aesthetic risk.

## The tells (and the fix for each)

| Tell | Why it reads as AI | Fix |
| --- | --- | --- |
| **Inter / Roboto / Arial / system-ui / Space Grotesk** as the primary face | The default of defaults | Choose a characterful display face from the subject's world; pair with a distinct body face |
| **Purple → blue hero gradient** on white | The single most common generated hero | Derive palette from the subject; if you use gradient, make it specific and restrained |
| **Every corner at one border-radius** | Signals a component library on autopilot | Vary radius by role, or commit to a deliberate radius language (sharp editorial vs. soft playful) |
| **Three equal feature cards** in a row | Template layout | Vary weight/size by importance; break the grid where content justifies it |
| **Hero = big number + tiny label + gradient accent** | The "template answer" | Only use if the stat truly is the point; otherwise lead with the most characteristic thing |
| **Numbered 01 / 02 / 03 markers** everywhere | Decoration masquerading as structure | Use numbering only when content is genuinely sequential |
| **Emoji as feature icons** | Filler, no craft | Use a real icon set or custom marks consistent with the type |
| **Scattered fade-in-on-scroll on everything** | Excess motion is itself a tell | One orchestrated moment; cut the rest |
| **Centered everything, uniform padding, no focal point** | No hierarchy | Establish one clear focal point; vary spacing and emphasis |
| **Lorem ipsum or vague marketing copy** ("Empower your workflow") | Templated words match templated design | Write specific copy from the end user's side, active voice |

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

- Could this exact page front three different companies unchanged? If yes, it's too generic.
- Name the one signature element. If you can't, there isn't one — add it.
- Does the palette come from the subject, or from the table above?
- Is any animation there for its own sake? Remove it.
- Remove one accessory: cut the single least necessary element and confirm it still holds.
