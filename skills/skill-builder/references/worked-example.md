# Worked Example: From Request to Shipped Skill

## Contents
- The request
- Interview transcript
- Design decisions (the mapping)
- Directory layout
- The drafted SKILL.md (description v1)
- Supporting files (summarized)
- Step 2 baseline (run before drafting)
- The eval battery
- Eval round 1: results and the failing case
- The revision (description v2) and re-run
- Final state and lessons

This is one complete pass through the creation workflow in SKILL.md, with nothing
elided: the user's request, the interview answers, the skill those answers produced,
the eval prompts, and the one revision the evals forced.

## The request

> 経費精算レポートを毎週作る作業をスキル化したい
> ("I want to turn my weekly expense-report task into a skill.")

## Interview transcript

Answers recorded verbatim; the arrow notes what each answer decided.

**Q1 — One sentence: what task, what finished output?**
"Every Friday I produce a markdown report of the week's corporate-card spending,
grouped by category, with totals and a list of items that need receipts or break
policy. I paste it into the #finance Slack channel myself."
→ One coherent capability. Deliverable: a markdown report file. Name (gerund):
`reporting-weekly-expenses`.

**Q2 — Walk me through the last manual run, every step.**
"I export `transactions.csv` from the card portal — columns are `date, merchant,
amount_jpy, card_holder, memo`. I categorize each row as travel, meals, software,
office, or other, mostly by merchant name. I total each category, flag anything
5,000 JPY or more with no receipt note in the memo, flag meals over 10,000 JPY per
person, then format the report."
→ The body's numbered workflow: 6 steps (validate → categorize → write intermediate
→ total → flag → format).

**Q3 — What would you literally type? Include your laziest phrasing.**
"「経費精算レポート作って」, 'make the weekly expense report', and honestly
sometimes just 'do the expenses'."
→ Trigger vocabulary for the `description`, and verbatim should-trigger evals
S1–S3. (Watch this one — it is where the eval round finds a bug.)

**Q4 — File types, filenames, paths, tools?**
"`transactions.csv`, always. The report is `expenses-YYYY-WW.md`."
→ Concrete filenames into the `description`; artifact-only eval S4.

**Q5 — What does Claude get wrong today?**
"It invents categories — last time it added 'subscriptions'. And it rounds totals;
finance wants exact yen."
→ Body must pin the closed category set and forbid rounding. Both gaps to confirm
in the Step 2 baseline.

**Q6 — Long material?**
"There's a two-page finance policy PDF: category definitions, merchant rules,
per-diem limits."
→ Too long for the body, needed only during categorization →
`references/expense-policy.md` (condensed from the PDF), linked one level deep.

**Q7 — Which parts are identical every time?**
"The totals. Same arithmetic every week."
→ `scripts/summarize.py`: reads the categorized CSV, prints exact per-category
totals. Intent: **run it**, never re-derive totals in-model.

**Q8 — What must never vary?**
"Totals must be exact to the yen. The flag thresholds are hard rules.
Categorization is judgment — merchant names are messy."
→ Degree of freedom: zero for totals (script), exact numbers for thresholds,
prose + rules for categorization.

**Q9 — Show a good past output; how do you judge correctness?**
[User pastes last week's report.] "Correct means: every transaction appears exactly
once, totals match the CSV to the yen, every flag is justified."
→ Trimmed sample becomes the Report format example; the three criteria become the
behavior-eval success criteria.

**Q10 — Auto-trigger OK? Side effects?**
"Claude can trigger it — it just writes a file. I post to Slack myself."
→ No `disable-model-invocation`. Add `allowed-tools: Bash(python3 *)` so the
totals script runs without a permission prompt.

**Q11 — Who else needs it?**
"Just me." → `~/.claude/skills/reporting-weekly-expenses/` (personal).

**Q12 — Which models?**
"My default — Sonnet." → Normal verbosity; test on Sonnet only.

## Design decisions (the mapping)

| Interview answer | Structural decision |
|---|---|
| Q1 scope | `name: reporting-weekly-expenses` (= directory name) |
| Q3 + Q4 triggers | `description` phrasings and filenames |
| Q2 procedure | Body: workflow shape, 6 numbered steps |
| Q6 long material | `references/expense-policy.md` |
| Q7 deterministic step | `scripts/summarize.py` (run, don't read) |
| Q8 fragility | Step 4 is "use script output verbatim"; step 2 is judgment with rules |
| Q10 invocation | auto-trigger allowed; `allowed-tools: Bash(python3 *)` |
| Q11 placement | personal skills directory |

## Directory layout

```
~/.claude/skills/reporting-weekly-expenses/
├── SKILL.md
├── references/
│   └── expense-policy.md
└── scripts/
    └── summarize.py
```

## The drafted SKILL.md (description v1)

This is the full first draft. Note the description: it carries the *formal*
phrasings from Q3 and the filename from Q4 — but the drafter dropped the lazy
phrasing "do the expenses". The eval round below catches exactly this.

````markdown
---
name: reporting-weekly-expenses
description: Generates the weekly corporate-card expense report from a transactions.csv export — categorizes each transaction per the finance policy, computes exact per-category totals via a bundled script, flags missing receipts and policy violations, and writes expenses-YYYY-WW.md. Use when the user asks for the weekly expense report, 経費精算レポート, or provides a transactions.csv card export.
allowed-tools: Bash(python3 *)
---

# Reporting Weekly Expenses

Produce the weekly expense report (`expenses-YYYY-WW.md`) from the card portal's
`transactions.csv` export.

## When to use

Use when the user asks for the weekly expense report or supplies a
`transactions.csv` export to summarize. Not for filing individual reimbursements
or debugging the portal export itself.

## Workflow

1. Read `transactions.csv`. Verify the columns are exactly
   `date, merchant, amount_jpy, card_holder, memo`. If they differ, stop and tell
   the user the export looks wrong — do not guess column meanings.
2. Categorize every row into exactly one of: **travel, meals, software, office,
   other**. Apply the merchant rules in `references/expense-policy.md` (read it
   before categorizing). Never invent a new category; when unsure, use `other`
   and say why in the Notes section.
3. Write the categorized rows to `categorized.csv` (original columns plus a
   `category` column).
4. Run `python3 scripts/summarize.py categorized.csv` and use its totals
   verbatim. Do not compute or round totals yourself — finance requires exact
   yen, and manual arithmetic across dozens of rows is error-prone.
5. Flag violations:
   - any transaction ≥ 5,000 JPY whose `memo` lacks a receipt reference →
     "missing receipt";
   - any `meals` transaction over 10,000 JPY per person (headcount from `memo`;
     if absent, assume 1) → "over meal limit".
6. Write `expenses-YYYY-WW.md` (ISO week of the latest transaction date) in the
   format below. Every transaction must appear in exactly one category section.

## Report format

Input: the week's `transactions.csv` rows
Output:
```
# Weekly Expenses — 2026-W27

| Category  | Total (JPY) | Items |
|-----------|------------:|------:|
| travel    |      84,300 |     3 |
| meals     |      23,450 |     5 |
| software  |      18,160 |     4 |
| office    |       6,000 |     2 |
| **Total** |     131,910 |    14 |

## Flags
- 07-02 GINZA DINING 18,900 JPY (meals, 1 person per memo) — over meal limit
- 07-03 JR EAST 12,400 JPY (travel) — missing receipt

## Notes
- "AMZN MKTP JP" categorized as office (desk lamp per memo), not software.
```

## Files

- `references/expense-policy.md` — category definitions, merchant rules,
  thresholds. Read it before categorizing.
- `scripts/summarize.py` — prints exact per-category totals from
  `categorized.csv`. Run it; do not re-derive totals. Python 3 stdlib only.
````

## Supporting files (summarized)

- `references/expense-policy.md` (~80 lines): the five category definitions with
  example merchants per category, the receipt threshold (5,000 JPY), the per-person
  meal limit (10,000 JPY), and ambiguous-merchant tie-breakers ("Amazon: decide by
  memo, default office"). Under 100 lines, so no table of contents required.
- `scripts/summarize.py` (~40 lines, stdlib only): validates the header, exits
  nonzero with a readable message on a missing/unknown column or non-integer
  amount, prints a `category<TAB>total<TAB>count` table plus a grand total.

## Step 2 baseline (run before drafting)

One representative prompt run **without** any skill: *"make the weekly expense
report from transactions.csv"* (with a real 14-row export).
Observed: Claude produced a decent report but invented a "subscriptions" category
and rounded totals to the nearest 100 yen — exactly the Q5 gaps. Both are now
pinned by workflow steps 2 and 4. No other gaps observed, so nothing else was
added (don't document imagined problems).

## The eval battery

Should-trigger (expect: fire):

| # | Prompt | Source |
|---|--------|--------|
| S1 | 経費精算レポート作って | Q3 verbatim |
| S2 | make the weekly expense report | Q3 verbatim |
| S3 | can you do the expenses for this week? | Q3 lazy phrasing |
| S4 | here's transactions.csv from the card portal | artifact-only |
| S5 | weekly expence report pls | typo variant |

Near-miss (expect: no fire):

| # | Prompt | Why it must not fire |
|---|--------|----------------------|
| N1 | split this dinner bill with my roommate | same domain (money/meals), personal task |
| N2 | why is the card portal CSV export failing? | same artifact, debugging intent |
| N3 | book travel for next week's trip | shares the word "travel" only |
| N4 | write a script that parses CSV files | generic CSV work |

Behavior (expect: correct report, judged by Q9 criteria):

| # | Prompt | Success criteria |
|---|--------|------------------|
| B1 | full request with a real 14-row CSV | every row exactly once; totals exact (match script); flags justified |
| B2 | CSV whose header says `amount` not `amount_jpy` | stops at step 1, tells user, does not guess |
| B3 | CSV with a 24,000 JPY meal, memo "dinner, 3 people" | 8,000/person → no flag |

## Eval round 1: results and the failing case

Fresh session per prompt. Results:

| Prompt | Expect | Got |
|--------|--------|-----|
| S1 | fire | fire |
| S2 | fire | fire |
| S3 | fire | **no fire** |
| S4 | fire | fire |
| S5 | fire | fire |
| N1–N4 | no fire | no fire (4/4) |
| B1–B3 | pass | pass (3/3 — script totals matched, B2 stopped, B3 unflagged) |

**Failing case:** S3, "can you do the expenses for this week?"
**Diagnosis:** trigger failure, not behavior failure. Description v1's "Use when"
clause lists only formal phrasings ("weekly expense report", 経費精算レポート) and
the filename. The lazy phrasing the user *told us about in Q3* was never carried
into the description — a carryover bug, not a discovery. Nothing in the body can
fix this; the body isn't loaded until the skill fires.

## The revision (description v2) and re-run

One variable changed: the description's final sentence. Body untouched.

Before (v1):
```
Use when the user asks for the weekly expense report, 経費精算レポート, or provides a transactions.csv card export.
```

After (v2):
```
Use when the user asks for the weekly expense report, 経費精算レポート, asks to "do the expenses", mentions the weekly spending summary or card transactions, or provides a transactions.csv export.
```

Re-run the **entire** battery, not just S3 — the new broader words ("spending",
"card transactions") could regress the near-misses, and N4 (generic CSV work) is
the one to watch:

| Prompt | Expect | Got |
|--------|--------|-----|
| S1–S5 | fire | fire (5/5) |
| N1–N4 | no fire | no fire (4/4) |

A/B verdict: v2 fires on more should-triggers (5 ≥ 4) and no more near-misses
(0 ≤ 0). Adopt v2. Behavior evals unaffected (description-only change), but the
final clean run re-runs everything once anyway: all pass.

## Final state and lessons

Shipped: `~/.claude/skills/reporting-weekly-expenses/` with description v2;
folder name equals `name`; quality checklist all-PASS; user told to reload.

Lessons this run demonstrates:
1. Record Q3 answers verbatim and diff the description against them — the only
   failure here was a dropped interview answer.
2. Trigger failures and behavior failures need different fixes; the body cannot
   fix a trigger failure.
3. After widening a description, always re-run the near-misses — the pass bar is
   "all should-triggers fire AND zero near-misses fire", not just the former.
4. The baseline (invented category, rounded totals) told us which two constraints
   to pin — everything else stayed lean.
