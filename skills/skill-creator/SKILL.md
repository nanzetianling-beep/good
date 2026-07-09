---
name: skill-creator
disable-model-invocation: true
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

**Step 1 — Gather requirements (the interview).** Interview the user before writing anything. Ask these in order, skipping only what the user already answered. Each answer maps to a specific part of the skill — record answers verbatim, especially Q3 (they become eval prompts later).

| # | Question | Why it's asked | Answer becomes |
|---|----------|----------------|----------------|
| 1 | "In one sentence: what task, and what does the finished output look like?" | Forces one coherent capability — a multi-part answer means multiple skills. | Scope, the `name` (gerund of this sentence's verb), and the body's purpose line. |
| 2 | "Walk me through the last time you did this by hand — every step, in order." | The real procedure beats an idealized one; it surfaces steps the user forgot they do. | The body's numbered workflow. |
| 3 | "What would you literally type in chat to ask for this? Give 2–3 phrasings, including your laziest one." | These verbatim phrases are the trigger vocabulary — and the should-trigger evals. | `description` trigger terms (Step 3) and the Step 7 eval battery. |
| 4 | "What file types, filenames, paths, or tools are involved?" | Concrete nouns are what disambiguate this skill among 100+ others. | `description` triggers; optionally a `paths` glob. |
| 5 | "When you do this with Claude today, what does it get wrong or keep asking about?" | Only add context that closes an observed gap, not an imagined one. | Body content selection; confirmed by the Step 2 baseline. |
| 6 | "Is there long material — policy docs, schemas, style guides, past outputs? Roughly how long?" | Long or rarely-needed material shouldn't load on every trigger. | `references/` files, linked one level deep. |
| 7 | "Which parts are identical every time — could they be code?" | Deterministic steps run cheaper and more reliably as scripts than as regenerated reasoning. | `scripts/` (state run-vs-read intent; list dependencies). |
| 8 | "Where does it break if done slightly differently? What must never vary?" | Sets the degree of freedom per step. | Prose for flexible steps; exact "run exactly this" commands for fragile ones. |
| 9 | "Show me one good past output. How do you judge an output correct?" | Verifiable criteria make evals meaningful; a real sample anchors the format. | The Examples section and the Step 7 behavior-eval success criteria. |
| 10 | "Should Claude trigger this on its own, or only when you invoke it? Any side effects — sends, deploys, deletes?" | Side-effectful workflows should be manual-only; known tool needs can be pre-approved. | `disable-model-invocation: true` and/or `allowed-tools`. |
| 11 | "Is this just for you, this repo's team, or shared wider?" | Determines placement and portability constraints. | Personal / project / plugin directory (see Directory placement). |
| 12 | "Which models will run it?" | Haiku needs more explicit guidance and guardrails than Opus. | Body verbosity; which tiers to test in Step 7. |

The mapping in one line: **scope → `name`; triggers → `description`; procedure → body; long material → `references/`; deterministic steps → `scripts/`.** A complete interview transcript and the skill it produced are in `references/worked-example.md`.

**Step 2 — Choose name + scope, establish a baseline.** Pick a specific, gerund-form `name`; keep scope tight — one coherent capability per skill. The directory name must equal `name`. Then run one or two representative tasks **without** any skill to see where Claude actually falls short. This is eval-driven development: only add context that closes an observed gap, not imagined ones.

**Step 3 — Draft frontmatter.** Write `name` and a "pushy," trigger-rich, third-person `description`. This is the highest-leverage step — spend real effort here. See `references/quality-checklist.md`.

**Step 4 — Write the body.** Start from `templates/SKILL.template.md`. Lead with purpose + when-to-use, then an imperative numbered workflow. Match the degree of freedom to task fragility. Explain the *why* behind instructions rather than piling on all-caps MUSTs.

**Step 5 — Add references / examples / scripts.** Move long or optional material into `references/`, templates into `templates/` or `assets/`, deterministic operations into `scripts/`. Link one level deep. Add concrete input/output examples where style matters. If several trial runs generated the same helper code, bundle it as a script.

**Step 6 — Validate.** Run the skill against the quality checklist in `references/quality-checklist.md`. Fix every failing item before showing the user.

**Step 7 — Evaluate, iterate, and place (the eval/revise loop).** Do not ship on first draft. There are two eval types: **trigger evals** (does the skill fire at the right moments?) and **behavior evals** (does it do the right thing once fired?).

*7a. Build the trigger battery.* Write 3–5 **should-trigger** prompts, each a different distance from the description's wording:
- one verbatim phrasing from interview Q3;
- one lazy/casual phrasing ("can you do the expenses for this week?");
- one that names only an artifact, not the task ("here's transactions.csv from the portal");
- one with different vocabulary or a typo ("weekly expence report pls").

Write 3–5 **near-miss** prompts — adjacent requests that share vocabulary with the description but must NOT fire:
- same domain, different task ("split this dinner bill with my roommate");
- same artifact, different intent ("why is the CSV export failing?");
- a task another installed skill (or no skill) should own.

Record everything in a table: `prompt | expect (fire / no fire) | got`.

*7b. Run it.* One **fresh session per prompt** — a warm session's context contaminates triggering. Paste the prompt and note whether the skill loaded (the transcript shows the skill invocation; `claude --debug` prints skill loading and frontmatter parse errors). Pass bar: **every should-trigger fires, zero near-misses fire.**

*7c. A/B a description.* Change **only the description** between comparison runs — never description and body together, or the result can't be attributed. Run the identical battery against version A and version B; adopt B only if it fires on at least as many should-triggers and no more near-misses. Typical fixes for under-triggering: add the user's literal vocabulary (lazy phrasings, non-English terms they actually use), concrete filenames/extensions, an explicit "Use when…" sentence. For over-triggering: remove generic words, add a "not for X" clause.

*7d. Behavior evals.* Reuse the Step 2 baseline prompts (realistic: file paths, casual phrasing, typos) plus edge cases from interview Q8. Run with the skill loaded; judge against the interview Q9 success criteria; compare to the baseline (or previous version, when improving an existing skill). Diagnose each failure — bad trigger, skipped step, or missing/buried context — and revise by generalizing, not by patching one prompt. Re-run until consistently correct.

*One round, worked (abridged — full version in `references/worked-example.md`):*
> Should-trigger S3 — "can you do the expenses for this week?" — did **not** fire (4/5). Diagnosis: description v1 listed only formal phrasings and the filename; the lazy phrasing the user gave in interview Q3 was never carried into the description.
> Revision (description only): append `…asks to "do the expenses", or mentions the weekly spending summary`.
> Re-run of the full battery: 5/5 should-trigger fire; near-misses unchanged at 0/4 — "split this dinner bill" still correctly ignored. Adopt v2.

*7e. Place.* Place the skill in the correct directory (see below), confirm the folder name and `name` match, and tell the user to reload so the metadata loads. Package it if they want to share it.

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
- [ ] Trigger battery run: ≥3 should-trigger and ≥3 near-miss prompts, fresh session each — all should-triggers fire, zero near-misses fire.
- [ ] At least 3 realistic behavior prompts run against a baseline; observed failures diagnosed and fixed; full battery re-run clean after the last edit.

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

That single file is a valid, shippable skill. Grow it — add `references/scope-conventions.md` or a `scripts/` validator — only when a real need appears. For a larger example that exercises the whole workflow (interview → skill with references and a script → eval battery → revision), see `references/worked-example.md`.

## Bundled resources

- `templates/SKILL.template.md` — copy this as the starting point for a new skill body; contains choose-one blocks for the three common body shapes (workflow / reference / generator).
- `references/quality-checklist.md` — the full pass/fail validation and evaluation checklist, with mechanical checks and thresholds.
- `references/worked-example.md` — a complete end-to-end run: user request → interview transcript → resulting SKILL.md → eval battery → one revision. Read it before your first interview.

## Sources

- [Skill authoring best practices — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [anthropics/skills — skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- [Equipping agents for the real world with Agent Skills — Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
