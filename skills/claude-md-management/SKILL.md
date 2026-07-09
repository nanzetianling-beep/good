---
name: claude-md-management
disable-model-invocation: true
description: Creates, audits, and optimizes CLAUDE.md memory files that give Claude persistent project, user, and org instructions every session. Use when a user wants to run /init, write or update project memory, apply project-wide coding rules, organize instructions with @imports or .claude/rules/, reason about memory hierarchy and precedence, reconcile stale or contradictory rules, or cut CLAUDE.md bloat. Triggers — CLAUDE.md, project memory, ~/.claude/CLAUDE.md, @imports, coding rules, audit/optimize memory.
---

# CLAUDE.md Management

## Overview

`CLAUDE.md` files are markdown files that give Claude persistent instructions across sessions. Claude Code loads them into context at the start of **every** conversation, so their content directly shapes behavior — but they are advisory context, not enforced configuration. This skill helps you **create**, **audit**, and **improve** them so they stay specific, concise, and consistent.

Key facts to keep correct (the real conventions):

- The file is `CLAUDE.md` (uppercase), **not** `.claude.md`. Project instructions live at `./CLAUDE.md` or `./.claude/CLAUDE.md`; personal cross-project instructions at `~/.claude/CLAUDE.md`.
- CLAUDE.md files are loaded **in full** regardless of length. There is no summarization — a bloated file wastes context and reduces adherence. (Aim for **under ~200 lines**.)
- CLAUDE.md is delivered as a **user message after the system prompt**. Claude tries to follow it, but there is no guarantee of compliance. For things that must happen every time, use a **hook**, not a memory instruction.
- CLAUDE.md (what *you* write) is distinct from **auto memory** (notes Claude writes itself in `~/.claude/projects/<project>/memory/`). This skill is about CLAUDE.md; don't conflate the two.

## The memory hierarchy and precedence

CLAUDE.md files can live in several locations. They are loaded from **broadest scope to most specific**, and all discovered files are **concatenated** (they do not override each other) — the more specific file simply appears later in context, so it wins on conflicts.

| Scope | Location | Purpose | Shared with |
| --- | --- | --- | --- |
| **Managed policy** (enterprise) | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`  •  Linux/WSL: `/etc/claude-code/CLAUDE.md`  •  Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | Org-wide standards, security/compliance. Cannot be excluded by users. | All users on the machine |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences across all your projects | Just you (all projects) |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared project instructions (commit to git) | Team via source control |
| **Local** | `./CLAUDE.local.md` | Personal per-project notes; add to `.gitignore` | Just you (this project) |

Load order details:
- Claude walks **up** the directory tree from the working directory, loading every `CLAUDE.md` / `CLAUDE.local.md` along the way. Content is ordered **root-down**, so instructions closer to where you launched Claude are read last (and win).
- Within a directory, `CLAUDE.local.md` is appended **after** `CLAUDE.md`.
- **Subdirectory** CLAUDE.md files are NOT loaded at launch — they load on demand when Claude reads a file in that subdirectory.
- Managed policy loads before user, which loads before project. Managed policy cannot be excluded. `claudeMdExcludes` (in any settings layer) can skip other files by absolute-path glob, e.g. other teams' files in a monorepo.
- Enterprises can also inline managed instructions via the `claudeMd` key in `managed-settings.json` instead of shipping a file — same precedence as a managed CLAUDE.md, honored only in managed/policy settings.

Related mechanisms (know they exist, don't conflate with CLAUDE.md):
- **`.claude/rules/*.md`** — modular instruction files. Rules **without** `paths:` frontmatter load at launch with the **same priority as `.claude/CLAUDE.md`**; rules **with** a `paths:` glob load only when Claude touches matching files (saving launch context). User-level rules live in `~/.claude/rules/` and load before project rules.
- **Skills** (`.claude/skills/*/SKILL.md`) — load on demand, best for occasional workflows / domain knowledge that shouldn't bloat every session.
- **Auto memory** (`~/.claude/projects/<project>/memory/MEMORY.md`) — notes Claude writes itself; only the first ~200 lines / 25KB of `MEMORY.md` load each session. Separate from CLAUDE.md.

## @path imports

CLAUDE.md can pull in other files with `@path/to/import` syntax:

```markdown
See @README.md for the project overview and @package.json for npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
- Personal (cross-worktree) overrides: @~/.claude/my-project-instructions.md
```

- Relative paths resolve against the **file containing the import** (not the cwd); absolute and `~/` paths work too.
- Imports recurse, to a **max depth of 4 hops**.
- Imported files are expanded and loaded at launch — imports help **organization**, they do **not** save context. To actually cut launch context, use path-scoped `.claude/rules/`.
- To mention a path literally without importing, wrap it in backticks: `` `@README` `` stays literal; `@README` imports. Import parsing skips code spans and fenced code blocks.
- First-time external imports show a one-time approval dialog (declining disables them silently).
- If the repo has an `AGENTS.md`, don't duplicate — create a `CLAUDE.md` that does `@AGENTS.md` (Claude Code reads CLAUDE.md, not AGENTS.md), then add Claude-specific instructions below. A symlink (`ln -s AGENTS.md CLAUDE.md`) also works when you need no Claude-specific content.

## When to use this skill

- Setting up memory for a new or existing project (run `/init`).
- Applying project-wide coding rules, workflows, or conventions.
- Claude repeatedly makes the same mistake, ignores a rule, or asks about things already documented.
- A CLAUDE.md has grown long, contradictory, or stale and needs an audit/cleanup.
- Deciding whether something belongs in CLAUDE.md vs a rule, skill, or hook.

## Workflow

### 1. CREATE

1. Run `/init` in the project. Claude analyzes the codebase (build systems, test frameworks, patterns, plus existing `AGENTS.md`/`.cursorrules`/`.devin/rules/`/`.windsurfrules`) and writes a starter `CLAUDE.md`. If one exists, `/init` **suggests improvements instead of overwriting**. (`CLAUDE_CODE_NEW_INIT=1` enables an interactive multi-phase flow that can also set up skills and hooks.)
2. Refine with the things Claude can't infer from code: non-obvious build/test commands, env-var quirks, architectural decisions, repo etiquette, common gotchas.
3. Choose the right home: team standards → `./CLAUDE.md` (commit it); personal cross-project prefs → `~/.claude/CLAUDE.md`; private per-project notes → `./CLAUDE.local.md` (gitignore it).
4. See `templates/CLAUDE.template.md` for a starting skeleton.

### 2. AUDIT — runnable procedure

Steps 1–6 are mechanical (run the exact commands — copy-paste one-liners live in `references/audit-checklist.md` under "Mechanical checks"); steps 7–8 need judgment. A complete worked example (bad file → report → rewrite → change log) is in `references/worked-audit.md`.

1. **Inventory.** Run `/memory` and list every loaded CLAUDE.md / CLAUDE.local.md / rules file. An expected file that is **not** listed is itself a must-fix finding (wrong name/location — e.g. `.claude.md`, `claude.md`, or outside the directory walk). Record the absolute path of each loaded file; all later steps run over this set. To trace *why* a file loaded (path-scoped rule, lazy subdirectory file), add the `InstructionsLoaded` hook.
2. **Count lines.** `wc -l` each file. Thresholds: **≤200** pass · **201–350** should-fix (prune or split) · **>350** must-fix (well past the point where long files dilute adherence; prune, then move file-scoped rules to path-scoped `.claude/rules/`). The 200 figure is the documented guidance; 350 is this skill's escalation heuristic.
3. **Secrets scan.** Grep for key-shaped strings and `key/token/password = value` assignments (one-liner in the checklist). Any true hit is a **must-fix**, and the fix is two actions: remove the line *and* rotate the credential — it may already be in git history.
4. **Dead-reference scan.** (a) Extract every `@import` and check each target file exists (relative paths resolve against the *importing file's* directory). (b) Check backticked commands against reality: npm scripts named in the file exist in `package.json`; the package manager named matches the lockfile present; referenced paths exist on disk. Each dead reference is a must-fix — a false instruction is worse than no instruction.
5. **Duplicate scan.** Normalize bullet lines (lowercase, squeeze whitespace) across **all** loaded files and `sort | uniq -d`. Exact repeats are should-fix; also eyeball near-duplicates that say the same thing twice in different words.
6. **Contradiction scan.** Grep for opposing-pair vocabulary — tabs/spaces, semicolon, npm/yarn/pnpm/bun, merge/rebase/squash, CommonJS/ES modules, `always`/`never` + the same noun — then read each hit-cluster together, *across* files too (user vs project vs local). Every genuine contradiction is a must-fix: Claude resolves it arbitrarily.
7. **Line-by-line judgment.** For every surviving line ask, in order: *Would removing this cause a mistake?* (no → bloat, cut) · *Can compliance be verified?* ("format properly" → vague, rewrite concrete) · *Is it still true?* (stale, fix or cut) · *Is this the right layer?* (see the placement decision table below — misplaced content is moved, not deleted).
8. **Report.** Fill the template below. Every finding gets an ID, `file:line`, a severity from the rubric, and a concrete action (never just "bad").

**Severity rubric**

| Severity | Criterion | Typical findings |
| --- | --- | --- |
| **Must-fix** | Harmful or false — following the file causes damage or errors | Secret/credential present; contradictory rules; dead @import; command/path/version that no longer exists; expected file not loading; file >350 lines |
| **Should-fix** | Wastes context or weakens adherence | 201–350 lines; vague/unverifiable rules; exact or near duplicates; generic filler ("write clean code"); misplaced content (belongs in a hook/skill/rule/local file); personal absolute paths; frequently-changing trivia |
| **Nice** | Polish — small adherence or maintenance gains | Missing header grouping; `IMPORTANT` overuse; human-only notes not in stripped `<!-- -->` comments; prose that could be tighter bullets |

**Report template** (the audit's output)

```markdown
# CLAUDE.md audit — <repo> — <date>
Loaded files (/memory): <path> (<N> lines)[, ...]   Missing/not loading: <paths or none>
Size: <N> lines → <pass | should-fix | must-fix>

## Must-fix
- M1 <file>:<line> — <finding> → <action>
## Should-fix
- S1 <file>:<line> — <finding> → <action>
## Nice
- N1 <file>:<line> — <finding> → <action>
## Placement moves
- "<rule>" → <hook | skill | .claude/rules/<name>.md (paths: <glob>) | ~/.claude/CLAUDE.md | CLAUDE.local.md>
## Proposed rewrite
<the rewritten file, or a link to it>
```

### 3. IMPROVE

Rewrite for adherence, applying the content rules below. Then verify empirically: CLAUDE.md is code — change it, then observe whether Claude's behavior actually shifts. If a rule keeps getting ignored, the file is probably too long and the rule is lost in noise; prune harder or convert it to a hook.

Note: the **project-root** CLAUDE.md is re-read from disk and re-injected after `/compact`. Nested subdirectory CLAUDE.md files are not re-injected automatically — they reload the next time Claude reads a file there.

## Best-practice content rules

- **Concise**: target **under ~200 lines** per file. Longer files reduce adherence. Split for organization with `@imports` (doesn't save context) or scope with path-based `.claude/rules/` (does save launch context).
- **Specific and verifiable**: "Run `npm test` before committing" beats "test your changes"; "API handlers live in `src/api/handlers/`" beats "keep files organized".
- **Imperative and grouped**: short imperative bullets under markdown headers (e.g. `# Code style`, `# Workflow`, `# Testing`). Structure helps Claude scan it.
- **Emphasis sparingly**: `IMPORTANT` or `YOU MUST` can raise adherence for a few critical rules — overusing it dilutes the effect.
- **Include**: non-guessable bash commands, code style that differs from defaults, test runner/instructions, repo etiquette (branch/PR conventions), project-specific architecture, env quirks, common gotchas.
- **Exclude**: anything Claude can infer from code, standard language conventions, long API docs (link instead), frequently-changing info, file-by-file codebase descriptions, generic advice like "write clean code", and secrets.
- **Human-maintainer notes**: block-level HTML comments (`<!-- ... -->`) are stripped before injection, so they cost no context — use them for notes to human maintainers. (Comments inside code blocks are preserved.)
- **Treat as living + shared**: commit project CLAUDE.md to git, prune regularly, and add to it when you'd otherwise re-explain something (same mistake twice, repeated correction, onboarding context a teammate would need).

## Memory placement decision table

For each fact or rule, pick the home by criterion — misplaced content gets **moved** during an audit, not deleted:

| This fact/instruction... | Goes in | One-line criterion |
| --- | --- | --- |
| Team-shared repo convention needed every session (commands, style, architecture, gotchas) | `./CLAUDE.md` (commit to git) | About this repo, for everyone, relevant to most sessions |
| Personal preference that follows *you* across projects | `~/.claude/CLAUDE.md` | About you, not any repo |
| Personal note about this repo only (local ports, private sandbox URLs) | `./CLAUDE.local.md` (gitignored) | About this repo, but not for teammates |
| Rule that only matters for certain files or a subtree (e.g. `*.sql`, `frontend/**`) | `.claude/rules/<name>.md` with `paths:` frontmatter | Wasted context everywhere else; should load only on touch |
| Occasional multi-step workflow or reference-heavy domain knowledge | A skill (`.claude/skills/<name>/SKILL.md`) | Needed sometimes, not every session — load on demand |
| Action that must happen deterministically every time (format on save, block writes to a path) | A hook | CLAUDE.md is advisory; hooks are enforced by the harness |
| Debugging insight or build quirk Claude discovered itself | Auto memory (leave it there) | Claude records these on its own; don't hand-copy into CLAUDE.md |
| Org-wide standard no user may remove | Managed policy CLAUDE.md / `claudeMd` in managed settings | Compliance content, admin-controlled |

## Audit checklist

See `references/audit-checklist.md` for the full pass/fail checklist plus copy-paste grep one-liners, and `references/worked-audit.md` for a complete worked audit (bad file → report → rewrite).

## Before / after example

Bloated, vague, partly redundant, and unsafe:

```markdown
# Project
This is a web application project. It is very important to write clean,
maintainable, high-quality code and follow best practices at all times.
Please make sure to test things and format code properly. We use modern
JavaScript. Always be careful. Our API key is sk-live-abc123.
Files should be organized well.
```

Concise, specific, safe:

```markdown
# Stack
- Next.js 15 (App Router), TypeScript, Drizzle ORM, Postgres

# Commands
- Dev: `pnpm dev`   Test: `pnpm test` (Vitest)   Lint: `pnpm lint`
- Run a single test: `pnpm test <file>` — prefer this over the full suite

# Code style
- Use ES modules (import/export), not CommonJS require
- 2-space indentation

# Workflow
- Typecheck (`pnpm typecheck`) before committing
- API route handlers live in `src/app/api/`; follow the existing handler pattern

# Testing
- Write a failing test that reproduces a bug before fixing it
```

Improvements: dropped generic filler and self-evident advice; **removed the leaked secret**; added concrete stack versions, exact commands, and verifiable rules; grouped under scannable headers.

## Sources

- Anthropic — How Claude remembers your project (CLAUDE.md locations, hierarchy, load order, `@imports`, `/memory`, `.claude/rules/`, managed policy, auto memory): https://code.claude.com/docs/en/memory
- Anthropic — Best practices for Claude Code (Write an effective CLAUDE.md, `/init`, include/exclude table, emphasis, pruning, imports): https://code.claude.com/docs/en/best-practices
- Anthropic — Automate actions with hooks (deterministic lifecycle actions vs advisory CLAUDE.md instructions): https://code.claude.com/docs/en/hooks-guide
