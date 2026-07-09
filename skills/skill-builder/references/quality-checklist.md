# Skill Quality Checklist (pass/fail)

## Contents
- How to use + mechanical checks
- Frontmatter — name (N1–N4)
- Frontmatter — description (D1–D6)
- Body and structure (B1–B9)
- Progressive disclosure and files (F1–F5)
- Scripts and dependencies (S1–S6)
- Evaluation gate (E1–E8)
- Anti-pattern scan (A1–A6)

## How to use + mechanical checks

Every item is binary: PASS or FAIL, with the pass condition stated. **Ship only at
zero FAILs** — an unfixed FAIL is a bug, not a nice-to-have. Run the mechanical
block first; the remaining items are judged by reading.

```bash
d=/path/to/skill-dir            # <-- set this
f="$d/SKILL.md"
name=$(sed -n 's/^name:[[:space:]]*//p' "$f" | head -1)
desc=$(sed -n 's/^description:[[:space:]]*//p' "$f" | head -1)  # single-line description only; count multi-line/folded descriptions by hand
[ "$name" = "$(basename "$d")" ]                    && echo "PASS N3 name==dir" || echo "FAIL N3 name==dir ($name)"
printf '%s' "$name" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' && [ "${#name}" -le 64 ] && echo "PASS N1 charset/length" || echo "FAIL N1 charset/length"
printf '%s' "$name" | grep -Eq 'anthropic|claude'   && echo "FAIL N2 reserved word" || echo "PASS N2 reserved word"
[ "${#desc}" -ge 60 ] && [ "${#desc}" -le 1024 ]    && echo "PASS D1 desc length (${#desc})" || echo "FAIL D1 desc length (${#desc})"
[ "$(wc -l < "$f")" -le 500 ]                       && echo "PASS B1 body lines ($(wc -l < "$f"))" || echo "FAIL B1 body lines ($(wc -l < "$f"))"
grep -n '\\' "$f" && echo "FAIL F3 backslash found (check if it's a path)" || echo "PASS F3 no backslashes"
```

## Frontmatter — `name`

- [ ] **N1 Charset/length** — PASS: matches `^[a-z0-9]+(-[a-z0-9]+)*$` and ≤64
  chars; no XML tags. (Mechanical.)
- [ ] **N2 Reserved words** — PASS: contains neither `anthropic` nor `claude`.
  (Mechanical.)
- [ ] **N3 Directory match** — PASS: equals the parent directory name exactly. In
  Claude Code the directory name is authoritative (it becomes the `/command`);
  the Agent Skills standard / API packaging expect them identical. (Mechanical.)
- [ ] **N4 Specificity** — PASS: names exactly one capability, gerund form
  preferred (`processing-pdfs`). FAIL: `helper`, `utils`, `tools`, `misc`, or any
  name that could plausibly describe 3+ unrelated skills.

## Frontmatter — `description`

- [ ] **D1 Length** — PASS: 60–1024 characters, no XML tags. Under ~60 chars it
  almost never carries both a what-clause and a when-clause. (Mechanical.)
- [ ] **D2 Third person** — PASS: zero first/second-person subjects. Verify:
  scan for `I `, `I'll`, `you `, `your ` in the description — each hit is a FAIL
  unless it's inside a quoted trigger phrase (e.g. `asks to "do the expenses"`).
- [ ] **D3 What-clause** — PASS: a reader can name the artifact or outcome the
  skill produces without opening the body.
- [ ] **D4 When-clause with concrete triggers** — PASS: contains an explicit
  "Use when …" (or equivalent) listing ≥3 concrete triggers — verbatim user
  phrasings, filenames/extensions, tool names. FAIL: only generic verbs
  ("helps with", "handles", "assists").
- [ ] **D5 Disambiguation** — PASS: with 100+ skills installed, no sibling skill
  would match these triggers equally well. Verify against skills actually
  installed next to it.
- [ ] **D6 Interview carryover** — PASS: every phrasing the user said they'd type
  (interview Q3), including the lazy ones and any non-English terms, appears in or
  is clearly covered by the description. (This is the exact failure in
  `references/worked-example.md`.)

## Body and structure

- [ ] **B1 Length** — PASS: SKILL.md ≤500 lines. (Mechanical; split into
  references when approaching the limit.)
- [ ] **B2 Opening** — PASS: purpose statement and "When to use" both appear
  within the first 15 body lines.
- [ ] **B3 Imperative workflow** — PASS: procedure steps are numbered and start
  with a verb ("Run…", "Read…"). FAIL: "Claude should…", "You can…".
- [ ] **B4 Token cost** — PASS: no paragraph explains what Claude already knows.
  Test per paragraph: if deleted, would behavior change? If not, delete it.
- [ ] **B5 Freedom matches fragility** — PASS: every must-not-vary step gives the
  exact command (and says "do not modify" where needed); every judgment step gives
  criteria, not scripts.
- [ ] **B6 Why over MUST** — PASS: count of all-caps MUST/NEVER/ALWAYS without an
  adjacent stated reason = 0.
- [ ] **B7 Terminology** — PASS: one term per concept throughout (not
  report/summary/digest for the same artifact).
- [ ] **B8 No time-sensitive claims** — PASS: zero "currently", "as of <date>",
  "the new X" statements; legacy info lives in an explicitly labeled old-patterns
  section.
- [ ] **B9 Examples** — PASS: wherever output style/format matters, ≥1 complete,
  realistic input/output pair (not a schematic placeholder).

## Progressive disclosure and files

- [ ] **F1 One level deep** — PASS: 0 links from a reference file to another
  reference file; every supporting file is linked directly from SKILL.md.
- [ ] **F2 TOC** — PASS: every reference file >100 lines has a table of contents
  within its first 15 lines (partial reads like `head -100` must reveal scope).
- [ ] **F3 Forward slashes** — PASS: 0 backslash paths. (Mechanical.)
- [ ] **F4 Named by content** — PASS: every filename says what's inside
  (`form-validation-rules.md`); FAIL: `doc2.md`, `notes.md`, `misc.md`.
- [ ] **F5 No orphans, no dead links** — PASS: every bundled file is referenced
  from SKILL.md and every referenced path exists. Verify: compare `ls -R "$d"`
  against the links in SKILL.md.

## Scripts and dependencies

- [ ] **S1 Intent stated** — PASS: each script mention says **run** it or **read**
  it as reference — never ambiguous.
- [ ] **S2 Error handling** — PASS: invalid input → nonzero exit + actionable
  message. Verify by executing each script once with valid input and once with
  deliberately broken input.
- [ ] **S3 No magic constants** — PASS: every non-obvious value has a comment
  saying why it was chosen.
- [ ] **S4 Dependencies** — PASS: required packages listed; nothing assumed
  pre-installed; remember the Claude API code environment has no network access
  (prefer stdlib).
- [ ] **S5 MCP names** — PASS: MCP tools referenced by fully qualified name
  (`ServerName:tool_name`).
- [ ] **S6 Batch safety** — PASS: high-stakes batch operations use
  plan-validate-execute with a verifiable intermediate file.

## Evaluation gate

This is the shipping bar. Numbers are minimums, not targets.

- [ ] **E1 Baseline exists** — PASS: ≥1 representative task was run **without**
  the skill and the observed gaps written down before drafting. Every body
  constraint traces to a baseline observation or an interview answer.
- [ ] **E2 Trigger battery written** — PASS: ≥3 (aim for 5) should-trigger AND
  ≥3 (aim for 5) near-miss prompts, recorded in a `prompt | expect | got` table.
  Should-triggers span: verbatim (Q3), lazy phrasing, artifact-only, off-vocabulary
  or typo. Near-misses share vocabulary but differ in intent.
- [ ] **E3 Trigger pass bar** — PASS: 100% of should-triggers fire AND 0
  near-misses fire, in the same run. One miss = revise the description and re-run
  the **whole** battery (widening a description can regress near-misses). If a
  near-miss keeps firing because it genuinely belongs in scope, promote it to a
  should-trigger deliberately — don't just accept the flake.
- [ ] **E4 Fresh sessions** — PASS: every trigger prompt was run in a fresh
  session (warm context contaminates triggering).
- [ ] **E5 A/B discipline** — PASS: between any two compared runs, exactly one
  thing changed (description-only, or body-only). A description B replaces A only
  if it fires on ≥ as many should-triggers and ≤ as many near-misses.
- [ ] **E6 Behavior battery** — PASS: ≥3 realistic task prompts (real paths,
  casual phrasing, typos — not abstract), each judged against the interview Q9
  success criteria and compared to the baseline (or previous version).
- [ ] **E7 Revisions generalize** — PASS: every fix maps to a diagnosed cause
  (trigger failure / skipped step / missing or buried context), not to patching
  one prompt's wording into the body.
- [ ] **E8 Final clean run** — PASS: after the last edit of any kind, the full
  battery (trigger + behavior) was re-run once with zero failures.
- [ ] **E9 Model tiers** — PASS (if the skill targets multiple models): tested on
  each targeted tier (Haiku needs more guidance than Opus). Skip if single-model.

## Anti-pattern scan

Each is a FAIL on sight:

- [ ] **A1** Vague description with no triggers, or wrong point-of-view.
- [ ] **A2** Everything crammed into SKILL.md instead of progressive disclosure.
- [ ] **A3** Many alternative approaches offered instead of one sensible default
  (+ escape hatch).
- [ ] **A4** Nested reference chains (SKILL.md → a.md → b.md) that trigger
  partial reads.
- [ ] **A5** Assuming packages/tools are installed.
- [ ] **A6** Constraints for imagined problems with no baseline observation or
  interview answer behind them.
