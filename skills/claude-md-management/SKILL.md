---
name: claude-md-management
description: Creates, audits, and optimizes CLAUDE.md memory files that give Claude persistent project, user, and org instructions. Use when a user wants to set up or run /init, apply project-wide coding rules, add or update memory/CLAUDE.md, clean up stale or contradictory settings, reduce CLAUDE.md bloat, or make instructions more specific and token-efficient. Triggers: CLAUDE.md, project memory, ~/.claude/CLAUDE.md, @imports, audit/optimize memory.
---

# CLAUDE.md Management

## Overview

`CLAUDE.md` files are markdown files that give Claude persistent instructions across sessions. Claude Code loads them into context at the start of **every** conversation, so their content directly shapes behavior — but they are advisory context, not enforced configuration. This skill helps you **create**, **audit**, and **improve** them so they stay specific, concise, and consistent.

Key facts to keep correct (the real conventions):

- The file is `CLAUDE.md` (uppercase), not `.claude.md`. It lives at the project root (`./CLAUDE.md`) or `./.claude/CLAUDE.md`, and personal-global instructions live at `~/.claude/CLAUDE.md`.
- CLAUDE.md files are loaded **in full** regardless of length. There is no summarization — a bloated file wastes context and reduces adherence.
- CLAUDE.md is delivered as a user message after the system prompt. Claude tries to follow it, but there is no guarantee of compliance. For things that must happen every time, use a **hook**, not a memory instruction.

## The memory hierarchy and precedence

CLAUDE.md files can live in several locations. They are loaded from **broadest scope to most specific**, and all discovered files are **concatenated** (they do not override each other) — the more specific file simply appears later in context, so it wins on conflicts.

| Scope | Location | Purpose | Shared with |
| --- | --- | --- | --- |
| **Managed policy** (enterprise) | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`  •  Linux/WSL: `/etc/claude-code/CLAUDE.md`  •  Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | Org-wide standards, security/compliance. Cannot be excluded by users. | All users on the machine |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences across all your projects | Just you (all projects) |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared project instructions (commit to git) | Team via source control |
| **Local** | `./CLAUDE.local.md` | Personal per-project notes; add to `.gitignore` | Just you (this project) |

Load order details:
- Claude walks **up** the directory tree from the working directory, loading every `CLAUDE.md` / `CLAUDE.local.md` along the way. Content is ordered root-down, so instructions closer to where you launched Claude are read last.
- Within a directory, `CLAUDE.local.md` is appended **after** `CLAUDE.md`.
- **Subdirectory** CLAUDE.md files are NOT loaded at launch — they load on demand when Claude reads a file in that subdirectory.
- Managed policy loads before user, which loads before project. Managed policy cannot be excluded (`claudeMdExcludes` in settings can skip other files by glob, e.g. in monorepos).

Related mechanisms (know they exist, don't conflate with CLAUDE.md):
- **`.claude/rules/*.md`** — modular instruction files loaded at launch (same priority as `.claude/CLAUDE.md`). Add `paths:` YAML frontmatter to scope a rule to matching globs so it only loads when Claude touches those files.
- **Skills** (`.claude/skills/*/SKILL.md`) — load on demand, best for occasional workflows/domain knowledge that shouldn't bloat every session.
- **Auto memory** (`~/.claude/projects/<project>/memory/`) — notes Claude writes itself; separate from CLAUDE.md.

## @path imports

CLAUDE.md can pull in other files with `@path/to/import` syntax:

```markdown
See @README.md for the project overview and @package.json for npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
- Personal (cross-worktree) overrides: @~/.claude/my-project-instructions.md
```

- Relative paths resolve against the file containing the import (not the cwd); absolute and `~/` paths work too.
- Imports recurse, to a **max depth of 4 hops**.
- Imported files are expanded and loaded at launch — imports help **organization**, they do **not** save context.
- To mention a path literally without importing, wrap it in backticks: `` `@README` `` stays literal; `@README` imports. Import parsing skips code spans and fenced code blocks.
- First-time external imports show a one-time approval dialog.
- If the repo has an `AGENTS.md`, don't duplicate — create a `CLAUDE.md` that does `@AGENTS.md` (Claude Code reads CLAUDE.md, not AGENTS.md).

## When to use this skill

- Setting up memory for a new or existing project (run `/init`).
- Applying project-wide coding rules, workflows, or conventions.
- Claude repeatedly makes the same mistake, ignores a rule, or asks about things that are already documented.
- A CLAUDE.md has grown long, contradictory, or stale and needs an audit/cleanup.
- Deciding whether something belongs in CLAUDE.md vs a rule, skill, or hook.

## Workflow

### 1. CREATE

1. Run `/init` in the project. Claude analyzes the codebase (build systems, test frameworks, patterns, plus existing `AGENTS.md`/`.cursorrules`/`.windsurfrules`) and writes a starter `CLAUDE.md`. If one exists, `/init` suggests improvements instead of overwriting. (`CLAUDE_CODE_NEW_INIT=1` enables an interactive multi-phase flow.)
2. Refine with the things Claude can't infer from code: non-obvious build/test commands, env-var quirks, architectural decisions, repo etiquette, common gotchas.
3. Choose the right home: team standards → `./CLAUDE.md` (commit it); personal cross-project prefs → `~/.claude/CLAUDE.md`; private per-project notes → `./CLAUDE.local.md` (gitignore it).
4. See `templates/CLAUDE.template.md` for a starting skeleton.

### 2. AUDIT

Run `/memory` to list every CLAUDE.md / CLAUDE.local.md / rules file loaded in the session (a file not listed is not being seen). Then read each loaded file and apply the checklist in `references/audit-checklist.md`. Look for:

- **Bloat** — lines that don't change behavior. For each line ask: *"Would removing this cause Claude to make a mistake?"* If no, cut it.
- **Vagueness** — "format code properly" instead of "use 2-space indentation".
- **Contradictions** — conflicting rules across files (project vs user vs nested); Claude picks arbitrarily. Reconcile them.
- **Staleness** — commands, paths, versions, or decisions that no longer match the codebase.
- **Misplacement** — occasional/multi-step content that belongs in a skill; file-type-specific content that belongs in a path-scoped `.claude/rules/` file; must-happen-every-time actions that belong in a hook.
- **Secrets** — never store tokens, keys, or credentials in CLAUDE.md.
- **Redundancy** — restating standard language conventions or things Claude learns by reading code.

### 3. IMPROVE

Rewrite for adherence, applying the content rules below. Then verify empirically: CLAUDE.md is code — change it, then observe whether Claude's behavior actually shifts. If a rule keeps getting ignored, the file is probably too long and the rule is lost in noise; prune harder or convert it to a hook.

## Best-practice content rules

- **Concise**: target **under ~200 lines** per file. Longer files reduce adherence. Split for organization with `@imports` (note: doesn't save context) or scope with `.claude/rules/`.
- **Specific and verifiable**: "Run `npm test` before committing" beats "test your changes"; "API handlers live in `src/api/handlers/`" beats "keep files organized".
- **Imperative and grouped**: short imperative bullets under markdown headers (e.g. `# Code style`, `# Workflow`, `# Testing`). Structure helps Claude scan it.
- **Emphasis sparingly**: `IMPORTANT` or `YOU MUST` can raise adherence for a few critical rules — overusing it dilutes the effect.
- **Include**: non-guessable bash commands, code style that differs from defaults, test runner/instructions, repo etiquette (branch/PR conventions), project-specific architecture, env quirks, common gotchas.
- **Exclude**: anything Claude can infer from code, standard language conventions, long API docs (link instead), frequently-changing info, file-by-file codebase descriptions, generic advice like "write clean code", and secrets.
- **Human-maintainer notes**: block-level HTML comments (`<!-- ... -->`) are stripped before injection, so they cost no context — use them for notes to human maintainers.
- **Treat as living + shared**: commit project CLAUDE.md to git, prune regularly, and add to it when you'd otherwise re-explain something (same mistake twice, repeated correction, onboarding context a teammate would need).

## Audit checklist

See `references/audit-checklist.md` for the full pass/fail checklist to run during an audit.

## Before / after example

Bloated, vague, partly redundant:

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

Improvements: dropped generic filler and self-evident advice; **removed the leaked secret**; added concrete stack versions, exact commands, and verifiable rules; grouped under headers.

## Sources

- Anthropic — How Claude remembers your project (Manage memory / CLAUDE.md): https://code.claude.com/docs/en/memory
- Anthropic — Best practices for Claude Code (Write an effective CLAUDE.md, `/init`, imports): https://code.claude.com/docs/en/best-practices
- Community best-practice guides on writing effective CLAUDE.md (line targets, include/exclude, pruning): https://www.humanlayer.dev/blog/writing-a-good-claude-md and https://www.datacamp.com/tutorial/writing-the-best-claude-md
