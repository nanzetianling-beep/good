---
name: skill-creator
description: Creates, scaffolds, and refines Claude Code Skills from a user's requirements. Guides an interview-driven workflow to define scope, write a valid SKILL.md with correct YAML frontmatter, add reference/script files via progressive disclosure, and run a quality-evaluation-and-revision loop. Use when the user wants to create a skill, author a skill, write a new SKILL.md, scaffold or package a workflow into a reusable skill, or improve an existing skill's description and structure.
---

# Skill Creator

A master engine for building new Claude Code Skills. It turns a rough requirement ("I want a skill that does X") into a correctly structured, discoverable, and tested skill directory through a short interview, file generation, and an evaluate-and-revise loop.

## When to use

Use this skill when the user wants to:

- Create a brand-new skill from scratch ("make a skill for our release-notes workflow").
- Package a repeated, manual workflow into something reusable.
- Improve an existing skill — tighten the `description` for better triggering, split a bloated body, or add reference files.
- Learn the correct SKILL.md format and conventions.

If the user only needs a one-off task done, do the task directly — don't wrap it in a skill.

## What a skill is

A skill is a directory containing a `SKILL.md` file plus optional supporting files. `SKILL.md` has two parts:

1. **YAML frontmatter** — required `name` and `description` metadata.
2. **Markdown body** — instructions Claude reads when the skill triggers.

Skills use **progressive disclosure** — a three-level loading model that keeps context lean:

| Level | Content | Loaded |
|-------|---------|--------|
| 1 | `name` + `description` (frontmatter) | Always, at startup (~100 words) |
| 2 | `SKILL.md` body | When the skill triggers (keep under 500 lines) |
| 3 | Reference files, scripts, assets | On demand, only when Claude reads/runs them |

The `description` is the single most important field: it is the primary signal Claude uses to decide whether to trigger the skill among potentially 100+ available skills.

## SKILL.md anatomy

### Frontmatter rules

```yaml
---
name: managing-changelogs
description: Generates and updates changelog entries from git history following the team's format. Use when the user asks to write a changelog, update CHANGELOG.md, or summarize commits for a release.
---
```

**`name`**
- Lowercase letters, numbers, and hyphens only.
- Max 64 characters; cannot start or end with a hyphen; no XML tags.
- Cannot contain reserved words `anthropic` or `claude`.
- **Must match the parent folder name exactly**, or the skill will not load.
- Prefer **gerund form** (`processing-pdfs`, `analyzing-spreadsheets`). Noun phrases (`pdf-processing`) and action verbs (`process-pdfs`) are acceptable. Avoid vague names (`helper`, `utils`, `tools`).

**`description`**
- Non-empty, max 1024 characters, no XML tags.
- **Third person** always. It is injected into the system prompt; first/second person ("I can help…", "You can use…") hurts discovery.
- Include **both** what the skill does **and when to use it**, with concrete trigger terms and file types the user is likely to mention.
- Good: `Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.`
- Bad: `Helps with documents.` (vague, no triggers, no point-of-view discipline)

### Body structure

Write the body as an overview that points to detail as needed — like a table of contents, not an encyclopedia. Recommended sections:

- A one-line purpose statement and a **When to use** section.
- The core **workflow** as numbered, imperative steps.
- **Examples** (input/output pairs) where output quality depends on style.
- Links to reference files for anything long or rarely needed.

Keep it concise. Assume Claude is already smart — only add context Claude doesn't already have. Challenge each paragraph: "Does this justify its token cost?"

### Progressive disclosure via supporting files

When the body approaches 500 lines or contains mutually exclusive paths, split content into sibling files and link them **one level deep** from SKILL.md:

```
my-skill/
├── SKILL.md              # overview + navigation (loaded on trigger)
├── references/
│   ├── format-guide.md   # loaded only when needed
│   └── examples.md
├── templates/
│   └── output.template.md
└── scripts/
    └── validate.py       # executed, not loaded into context
```

Rules:
- **One level deep only.** Don't chain references (SKILL.md → a.md → b.md); Claude may only partially read nested files.
- For reference files over ~100 lines, add a table of contents at the top so partial reads still reveal scope.
- Use forward slashes in all paths. Name files by content (`form-validation-rules.md`, not `doc2.md`).
- State intent for scripts explicitly: "Run `validate.py`" (execute) vs. "See `validate.py` for the algorithm" (read as reference).
- Don't assume packages are installed; list dependencies. The Claude API code environment has no network access.

## Creation workflow

Copy this checklist and track progress:

```
Skill Creation Progress:
- [ ] 1. Gather requirements (interview)
- [ ] 2. Choose name + scope
- [ ] 3. Draft frontmatter
- [ ] 4. Write the body
- [ ] 5. Add references / examples / scripts
- [ ] 6. Validate against the quality checklist
- [ ] 7. Evaluate and iterate
```

**Step 1 — Gather requirements.** Interview the user. Ask:
- What task should the skill accomplish, and what's the end deliverable/output format?
- What phrases or situations should *trigger* it? (These become the `description`.)
- What context does Claude repeatedly need that it doesn't already know (schemas, conventions, house rules)?
- Any fragile steps that must run in an exact sequence, or scripts to bundle?
- Which models will use it (Haiku needs more guidance than Opus)?

**Step 2 — Choose name + scope.** Pick a specific, gerund-form `name`. Keep scope tight — one coherent capability per skill. The directory name must equal the `name`.

**Step 3 — Draft frontmatter.** Write `name` and a "pushy," trigger-rich, third-person `description`. This is the highest-leverage step — spend real effort here. See `references/quality-checklist.md`.

**Step 4 — Write the body.** Start from `templates/SKILL.template.md`. Lead with purpose + when-to-use, then an imperative numbered workflow. Match the **degree of freedom** to the task: high freedom (prose guidance) when many approaches work; low freedom (exact commands, "do not modify") when steps are fragile.

**Step 5 — Add references / examples / scripts.** Move long or optional material into `references/`, templates into `templates/` or `assets/`, deterministic operations into `scripts/`. Link one level deep. Add concrete input/output examples where style matters.

**Step 6 — Validate.** Run the skill against the quality checklist in `references/quality-checklist.md`. Fix every failing item before showing the user.

**Step 7 — Evaluate and iterate (the eval/revise loop).** Do not ship on first draft:
1. Write 3 realistic test prompts a real user would type (not abstract).
2. Run each with the skill loaded; ideally compare against a baseline run without it.
3. Judge each output against the intended behavior and success criteria.
4. Diagnose failures — usually the `description` didn't trigger, a step was skipped, or context was missing/buried.
5. Revise the skill (generalize from feedback; don't overfit to one test case), then re-run. Repeat until outputs are consistently correct.
6. Finally, optimize the `description` specifically for triggering accuracy.

## Quality checklist (the eval gate)

Verify before delivering. Full version in `references/quality-checklist.md`.

- [ ] `name` is kebab-case, ≤64 chars, no reserved words, matches the folder name.
- [ ] `description` is third person, states what it does **and** when to use it, includes concrete triggers, ≤1024 chars.
- [ ] Body is under 500 lines; long/optional content moved to reference files.
- [ ] References are one level deep; paths use forward slashes; files named by content.
- [ ] Instructions are imperative; degree of freedom matches task fragility.
- [ ] Examples are concrete input/output pairs, not abstract descriptions.
- [ ] Consistent terminology throughout; no time-sensitive statements.
- [ ] Scripts (if any) handle errors and document their constants; dependencies listed.
- [ ] At least 3 realistic test prompts run; observed failures fixed.

## Directory placement

Place the skill so the folder name matches `name`:

- **Project skill** (shared with the repo/team, committed to version control):
  `.claude/skills/<name>/SKILL.md`
- **Personal skill** (available across all your projects):
  `~/.claude/skills/<name>/SKILL.md`

Reference and script files live beside `SKILL.md` inside `<name>/`. After creating files, confirm the folder name and `name` field match exactly, then ask the user to start a new session (or reload) so the new metadata loads.

## Filled-in example

A complete minimal skill for the request "make a skill that writes our conventional-commit messages":

Directory: `.claude/skills/writing-commit-messages/`

```markdown
---
name: writing-commit-messages
description: Generates Conventional Commits messages by analyzing staged git diffs. Use when the user asks for help writing a commit message, wants to commit staged changes, or mentions conventional commits.
---

# Writing Commit Messages

Generate a Conventional Commits message from the staged diff.

## Workflow

1. Run `git diff --staged` to read the staged changes.
2. Determine the type: feat, fix, docs, refactor, chore, test.
3. Write the subject line: `type(scope): summary` — imperative mood, ≤50 chars.
4. Add a body only if the change needs explanation (what and why, not how).

## Examples

Input: Added JWT login endpoint and token middleware
Output:
​```
feat(auth): add JWT-based authentication

Add login endpoint and token validation middleware.
​```

Input: Fixed dates showing wrong timezone in reports
Output:
​```
fix(reports): correct timezone in date formatting

Use UTC timestamps consistently across report generation.
​```
```

That single file is a valid, shippable skill. Grow it — add `references/scope-conventions.md` or a `scripts/` validator — only when a real need appears.

## Bundled resources

- `templates/SKILL.template.md` — copy this as the starting point for a new skill body.
- `references/quality-checklist.md` — the full validation and evaluation checklist.

## Sources

- [Skill authoring best practices — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [anthropics/skills — skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- [Equipping agents for the real world with Agent Skills — Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
