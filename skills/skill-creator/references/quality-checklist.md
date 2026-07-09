# Skill Quality Checklist

## Contents
- Frontmatter (name)
- Frontmatter (description)
- Body and structure
- Progressive disclosure and files
- Scripts and dependencies
- Evaluation and iteration
- Common anti-patterns

Use this to validate a skill before delivery (workflow Step 6) and to drive the
evaluate-and-revise loop (Step 7). Every unchecked item is a fix, not a nice-to-have.

## Frontmatter — `name`

- [ ] Lowercase letters, numbers, hyphens only.
- [ ] Max 64 characters; does not start or end with a hyphen.
- [ ] Contains no XML tags.
- [ ] Does not contain reserved words `anthropic` or `claude`.
- [ ] **Matches the parent directory name exactly** (or the skill will not load).
- [ ] Specific, not vague — prefer gerund form (`processing-pdfs`), avoid `helper`/`utils`/`tools`.

## Frontmatter — `description`

- [ ] Non-empty; max 1024 characters; no XML tags.
- [ ] Written in **third person** (not "I can…" / "You can…").
- [ ] States **what** the skill does.
- [ ] States **when** to use it, with concrete trigger words and file types.
- [ ] "Pushy" enough that Claude reliably selects it for the intended tasks.
- [ ] Would still disambiguate this skill if 100+ other skills were installed.

## Body and structure

- [ ] Opens with a purpose statement and a clear "When to use" section.
- [ ] Workflow is numbered and written in the imperative.
- [ ] Under 500 lines (split into reference files if longer).
- [ ] Concise — no explanation of things Claude already knows.
- [ ] Degree of freedom matches task fragility (prose for flexible, exact commands for fragile).
- [ ] Consistent terminology throughout (one term per concept).
- [ ] No time-sensitive statements (use an "old patterns" section for legacy info).
- [ ] Concrete input/output examples where output style matters.

## Progressive disclosure and files

- [ ] Long or optional content lives in `references/`, `templates/`, `assets/`, or `scripts/`.
- [ ] All references are **one level deep** from SKILL.md (no reference-to-reference chains).
- [ ] Reference files over ~100 lines start with a table of contents.
- [ ] All paths use forward slashes.
- [ ] Files are named by content (`form-validation-rules.md`, not `doc2.md`).

## Scripts and dependencies

- [ ] Instructions say whether to **execute** a script or **read** it as reference.
- [ ] Scripts handle error conditions rather than punting back to Claude.
- [ ] No unexplained magic constants (document why each value was chosen).
- [ ] Required packages are listed; no assumption that tools are pre-installed.
- [ ] MCP tools referenced by fully qualified name (`ServerName:tool_name`).

## Evaluation and iteration

- [ ] At least 3 realistic test prompts written (what a real user would type, not abstract).
- [ ] Skill run against each prompt; ideally compared to a baseline without the skill.
- [ ] Each output judged against intended behavior and success criteria.
- [ ] Failures diagnosed (bad trigger? skipped step? missing/buried context?) and fixed.
- [ ] Revisions generalize from feedback rather than overfitting to one test case.
- [ ] `description` optimized specifically for triggering accuracy in a final pass.
- [ ] (If used across models) tested with the Haiku/Sonnet/Opus tiers you target.

## Common anti-patterns to avoid

- Vague description with no triggers or wrong point-of-view.
- Everything crammed into SKILL.md instead of progressive disclosure.
- Offering many alternative approaches instead of a sensible default (+ escape hatch).
- Nested references Claude only partially reads.
- Windows-style backslash paths.
- Assuming packages/tools are installed.
