---
name: skill-creator
description: Guides an interview-driven workflow to create, scaffold, and refine Claude Code Agent Skills from a user's requirements — picks a valid name, writes a trigger-rich third-person description, structures the SKILL.md body with progressive disclosure, adds reference files, and runs a quality-evaluation-and-revision loop. Use when the user wants to create a skill, author a skill, write a new SKILL.md, or package a workflow into a reusable skill.
---

# Skill Creator

A master engine for building new Claude Code Agent Skills. It turns a rough requirement ("I want a skill that does X") into a correctly structured, discoverable, and tested skill directory through a short interview, file generation in the right location, and an evaluate-and-revise loop.

## When to use

Use this skill when the user wants to:

- Create a brand-new skill from scratch ("make a skill for our release-notes workflow").
- Package a repeated, manual workflow or a growing CLAUDE.md procedure into something reusable.
- Improve an existing skill — tighten the `description` for better triggering, split a bloated body, or add reference files.
- Learn the correct SKILL.md format and conventions.

If the user only needs a one-off task done, do the task directly — don't wrap it in a skill. Build a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat.

## What a skill is

A skill is a directory containing a `SKILL.md` file plus optional supporting files. Skills follow the open [Agent Skills](https://agentskills.io) standard; Claude Code extends it with features like invocation control and subagent execution. `SKILL.md` has two parts:

1. **YAML frontmatter** — required `name` and `description` metadata.
2. **Markdown body** — instructions Claude reads when the skill triggers.

Skills use **progressive disclosure** — a three-level loading model that keeps context lean:

| Level | Content | Loaded |
|-------|---------|--------|
| 1 | `name` + `description` (frontmatter) | Always, at startup (~100 words) |
| 2 | `SKILL.md` body | When the skill triggers (keep under 500 lines) |
| 3 | Reference files, scripts, assets | On demand, only when Claude reads/runs them |

The `description` is the single most important field: it is the primary signal Claude uses to decide whether to trigger the skill among potentially 100+ available skills. All "when to use" information belongs in the `description`, not buried in the body.

## SKILL.md anatomy

### Frontmatter rules

```yaml
---
name: managing-changelogs
description: Generates and updates changelog entries from git history following the team's format. Use when the user asks to write a changelog, update CHANGELOG.md, or summarize commits for a release.
---
```

**`name`** (required)
- Lowercase letters, numbers, and hyphens only. Max 64 characters. No XML tags.
- Cannot contain the reserved words `anthropic` or `claude`.
- **Should equal the skill's directory name.** In Claude Code the directory name is authoritative — it becomes the `/command` and the skill's identity, and `name` defaults to the directory name if omitted. The Agent Skills standard and API packaging require `name` and expect it to match the folder, so always keep them identical to avoid confusion and keep the skill portable.
- Prefer **gerund form** (`processing-pdfs`, `analyzing-spreadsheets`). Noun phrases (`pdf-processing`) and action verbs (`process-pdfs`) are acceptable. Avoid vague names (`helper`, `utils`, `tools`).

**`description`** (required)
- Non-empty, max 1024 characters, no XML tags.
- **Third person** always. It is injected into the system prompt; first/second person ("I can help…", "You can use…") hurts discovery.
- Include **both** what the skill does **and when to use it**, with concrete trigger terms and file types the user is likely to mention. Make it a little "pushy" to counter Claude's tendency to under-trigger.
- Good: `Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.`
- Bad: `Helps with documents.` (vague, no triggers, no point-of-view discipline)

**Optional Claude Code frontmatter** (add only when needed): `allowed-tools` (grant tools without a prompt while the skill is active), `disallowed-tools`, `disable-model-invocation: true` (hide from auto-trigger), `paths` (globs that scope auto-activation), `context: fork` (run in an isolated subagent). These are Claude Code extensions, not part of the portable standard.

### Body structure

Write the body as an overview that points to detail as needed — like a table of contents, not an encyclopedia. Recommended sections:

- A one-line purpose statement and a **When to use** section.
- The core **workflow** as numbered, imperative steps.
- **Examples** (input/output pairs) where output quality depends on style.
- Links to reference files for anything long or rarely needed.

Keep it concise. Assume Claude is already smart — only add context Claude doesn't already have. Challenge each paragraph: "Does this justify its token cost?"

**Match the degree of freedom to the task** (the robot-on-a-path analogy):
- **High freedom** (prose guidance) — many valid approaches; decisions depend on context. E.g. a code-review process.
- **Medium freedom** (pseudocode / parameterized scripts) — a preferred pattern with acceptable variation.
- **Low freedom** (exact commands, "run exactly this", "do not modify") — fragile, error-prone steps where consistency is critical. E.g. a database migration.

### Progressive disclosure via supporting files

When the body approaches 500 lines, or contains mutually exclusive / rarely-combined paths, split content into sibling files and link them **one level deep** from SKILL.md:

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
- **One level deep only.** Don't chain references (SKILL.md → a.md → b.md). Claude may preview nested files with partial reads (e.g. `head -100`) and miss content. All reference files link directly from SKILL.md.
- For reference files over ~100 lines, add a table of contents at the top so partial reads still reveal scope.
- Use forward slashes in all paths. Name files by content (`form-validation-rules.md`, not `doc2.md`); organize by domain so unrelated context stays unloaded.
- State intent for scripts explicitly: "Run `validate.py`" (execute — cheaper and more reliable) vs. "See `validate.py` for the algorithm" (read as reference).
- Don't assume packages are installed; list dependencies. The Claude API code environment has no network access (claude.ai can install from npm/PyPI).
- Reference MCP tools by fully qualified name (`ServerName:tool_name`).

## Creation workflow

Copy this checklist and track progress:

```
Skill Creation Progress:
- [ ] 1. Gather requirements (interview)
- [ ] 2. Choose name + scope, establish a baseline
- [ ] 3. Draft frontmatter
- [ ] 4. Write the body
- [ ] 5. Add references / examples / scripts
- [ ] 6. Validate against the quality checklist
- [ ] 7. Evaluate, iterate, and place
```

**Step 1 — Gather requirements.** Interview the user before writing anything. Ask:
- What task should the skill accomplish, and what's the end deliverable / output format?
- What phrases or situations should *trigger* it? (These become the `description`.)
- What context does Claude repeatedly need that it doesn't already know (schemas, conventions, house rules)? Notice what you keep re-explaining.
- Any fragile steps that must run in an exact sequence, example files, or scripts to bundle?
- Are the outputs objectively verifiable? (If so, evals are worthwhile; purely subjective skills like writing style rely on qualitative judgment.)
- Which models will use it (Haiku needs more guidance than Opus)?

**Step 2 — Choose name + scope, establish a baseline.** Pick a specific, gerund-form `name`; keep scope tight — one coherent capability per skill. The directory name must equal `name`. Then run one or two representative tasks **without** any skill to see where Claude actually falls short. This is eval-driven development: only add context that closes an observed gap, not imagined ones.

**Step 3 — Draft frontmatter.** Write `name` and a "pushy," trigger-rich, third-person `description`. This is the highest-leverage step — spend real effort here. See `references/quality-checklist.md`.

**Step 4 — Write the body.** Start from `templates/SKILL.template.md`. Lead with purpose + when-to-use, then an imperative numbered workflow. Match the degree of freedom to task fragility. Explain the *why* behind instructions rather than piling on all-caps MUSTs.

**Step 5 — Add references / examples / scripts.** Move long or optional material into `references/`, templates into `templates/` or `assets/`, deterministic operations into `scripts/`. Link one level deep. Add concrete input/output examples where style matters. If several trial runs generated the same helper code, bundle it as a script.

**Step 6 — Validate.** Run the skill against the quality checklist in `references/quality-checklist.md`. Fix every failing item before showing the user.

**Step 7 — Evaluate, iterate, and place (the eval/revise loop).** Do not ship on first draft:
1. Write ~3 realistic test prompts a real user would actually type (concrete: file paths, casual phrasing, typos), plus expected-behavior notes.
2. Run each with the skill loaded; compare against the Step 2 baseline (or, when improving an existing skill, its previous version).
3. Judge each output against the intended behavior and success criteria.
4. Diagnose failures — usually the `description` didn't trigger, a step was skipped, or context was missing/buried.
5. Revise (generalize from feedback, keep the prompt lean, explain the why); don't overfit to one case. Re-run until outputs are consistently correct.
6. Optimize the `description` specifically for triggering: draft should-trigger and should-not-trigger (near-miss) prompts and confirm the skill fires only when intended.
7. Place the skill in the correct directory (see below), confirm the folder name and `name` match, and tell the user to reload so the metadata loads. Package it if they want to share it.

## Quality checklist (the eval gate)

Verify before delivering. Full version in `references/quality-checklist.md`.

- [ ] `name` is kebab-case, ≤64 chars, no `anthropic`/`claude`, no XML tags, matches the folder name.
- [ ] `description` is third person, states what it does **and** when to use it, includes concrete triggers, ≤1024 chars.
- [ ] Body is under 500 lines; long/optional content moved to reference files.
- [ ] References are one level deep; paths use forward slashes; files named by content; long refs (>100 lines) have a table of contents.
- [ ] Instructions are imperative; degree of freedom matches task fragility.
- [ ] Examples are concrete input/output pairs, not abstract descriptions.
- [ ] Consistent terminology throughout; no time-sensitive statements.
- [ ] Scripts (if any) handle errors and document their constants; dependencies listed; MCP tools fully qualified.
- [ ] At least 3 realistic test prompts run against a baseline; observed failures fixed.

## Directory placement

Place the skill so the folder name matches `name`. In Claude Code the folder name becomes the `/command`:

| Scope | Location | Available |
|-------|----------|-----------|
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project (committed to version control) |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where the plugin is enabled |

Reference and script files live beside `SKILL.md` inside `<name>/`. After creating files, confirm the folder name and `name` field match exactly. Claude Code picks up added or edited skills under a watched `~/.claude/skills/` or project `.claude/skills/` within the session; creating a brand-new top-level skills directory requires a restart.

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
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [anthropics/skills — skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- [Equipping agents for the real world with Agent Skills — Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
