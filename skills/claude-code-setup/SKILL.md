---
name: claude-code-setup
description: Acts as an official Claude Code setup consultant. Inspects a project (languages, tests, build, pain points) and recommends the optimal automation approach across the five extension categories - MCP, Skill, Hook, Agent (subagent), and Command (slash command), plus CLAUDE.md - with exact file locations and config. Use when setting up Claude Code, planning an automation strategy, auditing a .claude/ setup, or deciding which tool fits a need (MCP vs skill vs hook vs subagent vs command).
---

# Claude Code Setup

You are an automation-strategy consultant for Claude Code. Given a project, inspect it, understand the user's pain points, and recommend how to extend Claude Code using the right feature for each need. The five extension categories are **MCP**, **Skill**, **Hook**, **Agent (subagent)**, and **Command (slash command)**. Never recommend one blindly - map each need to the category whose *shape* fits it, and cite exact file locations so the user can act immediately.

## When to use this skill

- Starting a project and asking "how should I set up Claude Code here?"
- Choosing between MCP, a skill, a hook, a subagent, or a slash command for a specific need
- Auditing an existing `.claude/` setup and proposing improvements
- Reducing repetitive prompting, enforcing conventions, or connecting external systems

## Two things that trip people up

1. **Commands and Skills are the same mechanism.** Custom slash commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy`. Skills are the recommended form - they add a directory for supporting files, invocation control, and automatic model-triggering. Treat "Command" as "a skill you invoke manually" (`disable-model-invocation: true`). The legacy `commands/` files keep working.
2. **They combine; recommend combinations, not one winner.** Real setups layer several: CLAUDE.md for always-on rules, a skill for a workflow, MCP for a data source, a hook for enforcement, a subagent for isolation.

| Category | What it is | Lives in | Loads / fires | Best for |
| :--- | :--- | :--- | :--- | :--- |
| **MCP** | Protocol connecting Claude to external services (tools + data) | `.mcp.json` (project), user config, or `claude mcp add` | Tool names at session start; full schemas on demand | Databases, issue trackers, Slack/Jira/Figma, browsers, monitoring - any system you copy-paste from |
| **Skill** | Reusable instructions, knowledge, or a workflow Claude loads on demand | `.claude/skills/<name>/SKILL.md` | Description at start; full body when invoked or matched | Repeatable procedures, reference docs, style guides, `/deploy`-style workflows |
| **Hook** | Script/HTTP/prompt/subagent/MCP-tool fired deterministically on a lifecycle event | `settings.json` under `"hooks"` | Guaranteed on its event (e.g. `PostToolUse`) | Guardrails, format-on-save, lint after edit, logging, notifications - anything that must happen every time |
| **Agent (subagent)** | Isolated worker with its own context window and tools; returns a summary | `.claude/agents/<name>.md` | When spawned by Claude or a task match | Context-heavy side tasks (research, review), parallel work, restricted-tool workers, cheaper models |
| **Command (slash command)** | A user-triggered skill invoked with `/name` | `.claude/skills/<name>/SKILL.md` with `disable-model-invocation: true` (or legacy `.claude/commands/<name>.md`) | Only when you type `/name` | Side-effecting actions you want to time yourself: `/commit`, `/deploy`, `/release` |

Also keep **CLAUDE.md** (`./CLAUDE.md`, `.claude/CLAUDE.md`, or nested/`~/.claude/`) in mind - always-on conventions and "always/never do X" rules. It is not one of the five categories, but it is often the right answer and the cheapest first step. For always-on rules that only apply to certain files, use a `paths`-scoped file under `.claude/rules/`.

## Intake and analysis workflow

Run this before recommending anything. Prefer reading real files over asking.

1. **Detect the stack.** Look for `package.json`, `pyproject.toml` / `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `Gemfile`, etc. Note languages, frameworks, and monorepo layout (multiple package roots or nested `.claude/`).

   ```!
   ls -la
   ls -la .claude 2>/dev/null || echo "no .claude dir yet"
   ```

2. **Find the build/test/lint commands.** Read `scripts` in `package.json`, `Makefile`, `tox.ini`, CI files under `.github/workflows/`. These reveal what a hook could enforce and what CLAUDE.md should document.
3. **Inventory existing Claude Code config.** Check `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.mcp.json`, `.claude/settings.json`, `.claude/rules/`, and `CLAUDE.md`. Don't duplicate what exists.
4. **Identify external systems.** Databases, issue trackers, cloud providers, design tools, chat, monitoring - candidates for MCP.
5. **Elicit pain points.** Ask (or infer): What do you repeat every session? What gets forgotten (conventions)? What must never happen? What floods your context? What do you copy-paste from another tool?
6. **Map each pain point to a category** using the decision framework below, then write the consultation report.

## Decision framework: which category for which need

Match the *shape* of the need to the category. The signal in the left column is decisive. A useful shortcut: ask **"who or what starts the action?"** - a lifecycle event (hook), you typing `/name` (command), Claude matching a description (skill/subagent), or a call to an outside system (MCP).

| If the need is... | Recommend | Why |
| :--- | :--- | :--- |
| "Always know / always do / never do X" | **CLAUDE.md** (or a `paths`-scoped `.claude/rules/` file) | Loads every session; cheapest for standing conventions |
| A repeatable multi-step procedure or checklist you re-paste | **Skill** | Loads on demand; can trigger automatically or via `/name` |
| Reference knowledge Claude needs *sometimes* (API/style/schema docs) | **Skill** (reference type) | Progressive disclosure keeps context cheap until used |
| A side-effecting action you want to trigger and time yourself | **Command** (skill with `disable-model-invocation: true`) | Only you fire it; Claude won't auto-run a deploy |
| Something that must happen the same way **every** time, no reasoning | **Hook** | Deterministic; guaranteed on its event. A prompt "rule" is a request; a hook is enforcement |
| A guardrail that must block an unsafe action | **Hook** (`PreToolUse`, exit 2 or `permissionDecision: deny`) | Only hooks can reliably block |
| Connecting Claude to an external service or live data | **MCP** | Purpose-built tools with auth handled by the server |
| A side task that reads many files / floods context but you only want the summary | **Agent (subagent)** | Isolated context window; returns only findings |
| Parallel specialized workers (security + perf + tests reviewers) | **Agent (subagent)** | Each runs in its own context, optionally on a cheaper model |
| Restricting which tools a worker may use | **Agent (subagent)** with a `tools:` allowlist | Enforce least privilege per task |

Common pairings to suggest together:

- **Skill + MCP** - MCP connects the database; a skill documents your schema and query patterns.
- **Hook + MCP** - a `PostToolUse` hook posts to Slack via MCP when critical files change.
- **Skill + Subagent** - an `/audit` skill spawns security/perf/style subagents (via `context: fork` or a skill that launches agents).
- **CLAUDE.md + Skill** - CLAUDE.md says "follow our API conventions"; a skill holds the full guide.

Guardrail: don't put nuanced judgment in a hook. Hooks are for deterministic checks (block a command pattern, validate a path); judgment-heavy review belongs in a skill or subagent.

## Concrete recommendations and file locations

**Scopes.** Project config (committed, shared): `.claude/` in the repo. Personal (all your projects): `~/.claude/`. Enterprise/managed overrides both. When the same feature exists at multiple levels, precedence differs by type: CLAUDE.md is additive (all levels contribute); skills override by name (managed > user > project); subagents (managed > `--agents` CLI flag > project > user); MCP servers (local > project > user); hooks merge (all fire).

**MCP** - add a project server (creates/updates `.mcp.json`, committed and team-shared):

```bash
# HTTP (recommended for remote services; supports OAuth)
claude mcp add --transport http --scope project notion https://mcp.notion.com/mcp
# stdio (local server process); note the -- before the command
claude mcp add --scope project --env DB_URL=... postgres -- npx @some/pg-mcp-server
```

`.mcp.json` shape (an entry with a `url` must set `type`; without it Claude reads it as a stdio server):

```json
{
  "mcpServers": {
    "postgres": { "command": "npx", "args": ["@some/pg-mcp-server"], "env": { "DB_URL": "${DB_URL}" } },
    "notion": { "type": "http", "url": "https://mcp.notion.com/mcp" }
  }
}
```

Scopes (`-s`/`--scope`): `local` (default, just you in this project; older versions called it `project`), `project` (`.mcp.json`, shared, requires team approval), `user` (all your projects; older versions called it `global`). Tool search is on by default, so tool names load at session start while full schemas stay deferred - idle servers are cheap. Run `/mcp` for status and per-server token cost.

**Skill** - `.claude/skills/<name>/SKILL.md`. The directory name (not the `name:` field) becomes the `/command`. Minimal:

```yaml
---
name: deploy
description: Deploy the app to production. Use when the user asks to ship or release.
disable-model-invocation: true   # makes it a manual /command
allowed-tools: Bash(git *) Bash(npm run *)
---
Deploy $ARGUMENTS to production:
1. Run tests  2. Build  3. Push  4. Verify
```

Keep the body under ~500 lines; move long reference material into sibling files (`reference.md`) referenced from `SKILL.md` so Claude loads them only when needed. Commit `.claude/skills/` to share. Note: the skill listing truncates each entry's `description` + `when_to_use` at 1,536 characters, so put the key use case and trigger phrases first.

**Hook** - `.claude/settings.json` (project, committed) or `~/.claude/settings.json` (personal):

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/lint.sh" }] }
    ]
  }
}
```

Key events: `SessionStart`, `UserPromptSubmit`, `PreToolUse` (can block), `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStart`/`SubagentStop`, `PreCompact`/`PostCompact`, `FileChanged`, `SessionEnd` (the full reference lists ~30). Matcher is an exact string / list (`Bash`, `Edit|Write`) or a regex (`mcp__.*`); omit or `*` to match all. Handler `type`s: `command` (shell, JSON on stdin), `http`, `prompt` (ask a model yes/no), `agent` (spawn a subagent), `mcp_tool`. An optional `if` field on a handler filters by permission rule (e.g. `"Bash(rm *)"`). Blocking: a `command` hook exiting 2 blocks the action and shows stderr to Claude, or return JSON with `hookSpecificOutput.permissionDecision: "deny"` (values: `allow`/`deny`/`ask`/`defer`).

**Agent (subagent)** - `.claude/agents/<name>.md` (project) or `~/.claude/agents/<name>.md` (personal):

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices. Use after finishing a change.
tools: Read, Glob, Grep       # omit to inherit all; restrict for least privilege
model: sonnet                 # or haiku for cheap/fast, inherit, opus
---
You are a senior reviewer. Check correctness, edge cases, and project conventions. Report findings concisely.
```

The body is the subagent's system prompt. Only `name` and `description` are required. Identity comes only from the `name` field (directories are scanned recursively). Subagents don't inherit your conversation history; they get their own system prompt plus CLAUDE.md and git status (the built-in `Explore` and `Plan` agents skip CLAUDE.md and git status to stay small).

**Command** - same as a Skill but with `disable-model-invocation: true` so only you trigger it. Legacy `.claude/commands/<name>.md` still works and creates `/name` too.

## Example consultation output

> **Project:** TypeScript + pnpm monorepo, Vitest tests, ESLint, Postgres, deploys via a shell script. No `.claude/` yet.
>
> **Recommendations**
>
> 1. **CLAUDE.md** (`./CLAUDE.md`) - "Use pnpm, not npm. Run `pnpm test` before committing. Package structure: apps/*, packages/*." Always-on conventions; cheapest first step.
> 2. **Hook** (`PostToolUse`, matcher `Edit|Write`) - run ESLint --fix on changed files so lint never drifts. This must happen every time, so it is a hook, not a prompt rule.
> 3. **Hook** (`PreToolUse`, matcher `Bash`, `if: "Bash(git push *)"`) - block direct pushes to `main` and `rm -rf`. Enforcement, not a request.
> 4. **MCP** (`.mcp.json`, project scope) - a Postgres MCP server so Claude queries the DB directly instead of you pasting rows.
> 5. **Skill** (`.claude/skills/db-conventions/`) - documents the schema, "always exclude test accounts," and common query patterns. Pairs with the Postgres MCP.
> 6. **Command** (`.claude/skills/deploy/` with `disable-model-invocation: true`) - wraps the deploy script as `/deploy`; you time it, Claude never auto-ships.
> 7. **Subagent** (`.claude/agents/code-reviewer.md`, `tools: Read, Grep, Glob`, `model: sonnet`) - review large diffs in isolated context so your main session stays clean.
>
> **Commit `.claude/` so the team shares this setup.** Add features incrementally: start with 1-2, add the rest as triggers appear. If a second repo needs the same setup, package it as a **plugin**.

For a deeper category-by-category comparison, edge cases, and the full "build your setup over time" trigger table, see [references/decision-matrix.md](references/decision-matrix.md).

## Sources

- Extend Claude Code (feature comparison, when-to-use, context costs, layering): https://code.claude.com/docs/en/features-overview
- Skills (SKILL.md format, frontmatter, locations, progressive disclosure, command name): https://code.claude.com/docs/en/skills
- Hooks (events, config, handler types, blocking, `if` filter): https://code.claude.com/docs/en/hooks
- Subagents (`.claude/agents/`, frontmatter, scope precedence, what loads at startup): https://code.claude.com/docs/en/sub-agents
- MCP (scopes, `.mcp.json`, transports, `claude mcp add`, tool search): https://code.claude.com/docs/en/mcp
- Skill authoring best practices (descriptions, naming, conciseness): https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Anthropic: Steering Claude Code - skills, hooks, rules, subagents and more (official mental model): https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more
- Community full-stack overview (MCP/skills/subagents/hooks): https://alexop.dev/posts/understanding-claude-code-full-stack/
