---
name: <kebab-case-name-matching-folder>
description: <One or two sentences, third person. State WHAT the skill does and WHEN to use it, with concrete trigger words/phrases and file types the user might mention — include the user's verbatim phrasings from interview Q3, including the lazy ones. Max 1024 chars. No first/second person. No XML tags. Name uses lowercase/numbers/hyphens only, no "anthropic"/"claude".>
# Optional Claude Code fields (delete if unused):
# allowed-tools: Read Grep          # tools usable without a prompt while active — grant what the workflow provably needs (e.g. Bash(python3 *) for a bundled script), no more
# disable-model-invocation: true    # set when the skill has side effects (sends, deploys, deletes) or the user wants to control timing — /name only (interview Q10)
# paths: "**/*.py"                  # globs that scope auto-activation to matching files
# context: fork                     # run in an isolated subagent — ONLY for skills that are a complete task; never for reference/guideline skills (the subagent would get rules but no task)
# argument-hint: "[input-file]"     # autocomplete hint for /name arguments
---

# <Human Readable Skill Name>

<One-line statement of what this skill produces or accomplishes — interview Q1.>

## When to use

Use this skill when the user wants to:

- <trigger scenario 1>
- <trigger scenario 2>

<Optional: when NOT to use it — e.g. "For one-off X, just do the task directly.">

<!--
CHOOSE ONE body shape below and DELETE the other two. Pick by what the interview produced:

A. WORKFLOW skill — the skill DOES a multi-step procedure (deploy, weekly report,
   migration). Pick when Q2 produced ordered steps ending in a deliverable.
B. REFERENCE skill — the skill supplies knowledge Claude applies while doing other
   work (API conventions, style guide, schema docs). Pick when there are rules but
   no sequence. Do NOT combine with `context: fork` — guidelines without a task
   give the subagent nothing to do.
C. GENERATOR skill — the skill transforms one input into one artifact (commit
   message, changelog entry, boilerplate file). Pick when output format/quality is
   the whole game; examples matter more than steps.

If the skill genuinely needs two shapes, it is probably two skills.
-->

<!-- ======================= A. WORKFLOW body ======================= -->

## Workflow

<Numbered, imperative steps from interview Q2. Match specificity to fragility (Q8):
prose for flexible steps, exact commands ("run exactly this", "do not modify") for
fragile ones. Explain the WHY, not just the rule. For flows of 5+ steps, offer a
copyable progress checklist.>

```
Progress:
- [ ] Step 1: <...>
- [ ] Step 2: <...>
- [ ] Step 3: <...>
```

1. <Step 1 — validate inputs first; say what to do when validation fails.>
2. <Step 2>
3. <Step 3 — for a deterministic step, run the bundled script instead of reasoning it out.>

<!-- ======================= B. REFERENCE body ======================= -->

## Rules

<Group rules by topic. Every rule states its WHY — a rule without a reason gets
ignored or misapplied. One term per concept throughout.>

### <Topic 1>

- <Rule.> <Why it exists.>
- <Rule.> <Why it exists.>

### <Topic 2>

- <Rule.> <Why.>

## Correct vs. incorrect

<At least one pair per topic where mistakes are likely.>

Correct:
```
<compliant example>
```
Incorrect (violates <rule>):
```
<non-compliant example>
```

<!-- ======================= C. GENERATOR body ======================= -->

## Input

<What the user provides (file, diff, selection, description) and how to get it —
e.g. "Run `git diff --staged`". Say what to do if the input is missing or malformed.>

## Generation steps

1. <Analyze the input for X.>
2. <Decide Y based on Z.>
3. <Produce the artifact in the exact format below.>

## Output format

<The exact shape of the artifact, then 2+ REAL input/output pairs — generators live
or die on examples (interview Q9's sample goes here).>

Input: <example input 1>
Output:
```
<example output 1>
```

Input: <example input 2>
Output:
```
<example output 2>
```

<!-- ======================= end of body shapes ======================= -->

## Reference files

<Link one level deep to any long or optional material (interview Q6/Q7). Delete if
the body is self-contained. Give a table of contents to any reference over ~100
lines. For scripts, state run-vs-read intent and dependencies.>

- `references/<topic>.md` — <what it covers, when to read it>
- `scripts/<name>.py` — <"Run it" or "read it as reference" — say which; list dependencies>
