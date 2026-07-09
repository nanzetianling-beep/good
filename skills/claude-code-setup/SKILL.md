---
name: claude-code-setup
disable-model-invocation: true
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

Run this before recommending anything. Prefer reading real files over asking; ask only what the repo cannot tell you.

### Step 1 - Fingerprint the repo (auto-injected at invocation)

```!
ls -a
ls -R .claude 2>/dev/null || echo "no .claude dir yet"
ls .mcp.json CLAUDE.md 2>/dev/null || true
```

### Step 2 - Run the detection probes

Run these (skip probes that Step 1 already answered), then read what they surface:

```bash
# Language manifests + lockfiles (the lockfile decides the package manager)
ls package.json pnpm-lock.yaml yarn.lock bun.lockb package-lock.json \
   pyproject.toml uv.lock poetry.lock Pipfile requirements.txt \
   go.mod go.work Cargo.toml pom.xml build.gradle build.gradle.kts \
   Gemfile mix.exs composer.json 2>/dev/null

# Monorepo signals
ls pnpm-workspace.yaml lerna.json turbo.json nx.json 2>/dev/null

# Formatters / linters (format-on-edit hook candidates)
ls .prettierrc* prettier.config.* biome.json* eslint.config.* .eslintrc* \
   ruff.toml .ruff.toml .flake8 rustfmt.toml .golangci.yml .editorconfig 2>/dev/null

# Task runners + CI (CI files are the ground truth for build/test commands - read them)
ls Makefile justfile Taskfile.yml .gitlab-ci.yml .circleci Jenkinsfile 2>/dev/null
ls .github/workflows/ 2>/dev/null

# External-system candidates for MCP
ls .env.example docker-compose.yml compose.yaml 2>/dev/null
```

Then follow up per stack: `jq -r '.scripts' package.json` (JS - canonical commands and the test runner name); read `pyproject.toml` for `[tool.pytest.ini_options]`/`[tool.ruff]`; `go test ./...` and `cargo test` are built in. Interpret:

| Evidence | Conclusion |
| :--- | :--- |
| `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` / `package-lock.json` | Package manager pnpm / yarn / bun / npm - a CLAUDE.md "use X, not Y" line |
| `vitest`/`jest`/`playwright` in devDependencies; `pytest` config | Test runner - the command for a test hook and CLAUDE.md |
| Formatter config present | Format-on-edit hook is a near-automatic recommendation |
| CI workflow steps | What must pass - candidates for hooks and `permissions.allow` |
| `docker-compose` services (postgres, redis...), `.env.example` keys (`DATABASE_URL`, `SENTRY_DSN`, `SLACK_*`) | External systems - MCP candidates |
| Existing `.claude/` contents | Don't duplicate; audit for the anti-patterns list in [references/decision-matrix.md](references/decision-matrix.md) |

### Step 3 - Ask the user (verbatim, minus anything already answered)

1. "What do you find yourself re-typing or re-explaining to Claude every session?" (repetition -> skill or CLAUDE.md)
2. "What has Claude gotten wrong here more than once - commands, conventions, style?" (drift -> CLAUDE.md / rules / format hook)
3. "What must never happen in this repo - pushing to main, touching prod data, editing generated files?" (red lines -> PreToolUse hook + permissions deny)
4. "Which other tools do you copy-paste to or from - issue tracker, database, logs, designs, chat?" (external -> MCP)
5. "Which tasks flood the conversation or feel like they should run on the side - big reviews, codebase research, audits?" (context -> subagent)
6. "Solo or team - should this config be committed and shared?" (scope -> project `.claude/` vs `~/.claude/` / `settings.local.json`)

### Step 4 - Score and prioritize candidates

For each candidate recommendation, score **Priority = Frequency + Severity - Effort**:

| Score | Frequency (pain occurs) | Severity (if unaddressed) | Effort (to set up) |
| :--- | :--- | :--- | :--- |
| 3 | Every session / every edit | Irreversible: prod, data loss, secrets | High: external creds, new server, plugin |
| 2 | Weekly | Real rework or context churn | Medium: script/config to write and test |
| 1 | Occasionally | Minor annoyance | Low: one file, <15 min (CLAUDE.md line, permissions entry) |

Tiers: **>= 4 - "Do now"** (cap at 3-5 items); **2-3 - "Next steps"** (name the trigger that promotes them); **<= 1 - skip**, note why. Tie-breakers: safety guardrails beat convenience at equal score; prefer the item that unblocks others (CLAUDE.md is almost always first - Frequency 3, Effort 1).

### Step 5 - Write the report

Use the consultation report template below; pull starter configs from [references/recipes.md](references/recipes.md).

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

Copy-paste starter configs for everything below (hooks, skills, subagents, MCP, permissions, CLAUDE.md, headless CI) live in [references/recipes.md](references/recipes.md).

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

## Consultation report template

Output the consultation in exactly this shape - compact enough to act on, complete enough to audit later:

```markdown
# Claude Code setup consultation - <project>

**Stack:** <languages/frameworks> | **PM:** <pnpm/uv/cargo/...> | **Tests:** `<command>` | **Lint/format:** `<command>` | **CI:** <GitHub Actions/...>
**Existing config:** <none | list .claude/ items, .mcp.json servers, CLAUDE.md state>

## Do now
| # | Pain point | Mechanism | Location | F/S/E -> Priority |
| - | ---------- | --------- | -------- | ----------------- |
| 1 | <observed or stated pain> | <e.g. Hook (PostToolUse, Edit\|Write)> | `.claude/settings.json` + `.claude/hooks/format.sh` | 3/2/1 -> 4 |

For each row: one sentence of *why this mechanism* (tie to the decision framework) + the starter recipe to copy (references/recipes.md #N), adapted to the detected commands.

## Next steps (add when the trigger appears)
- <trigger, e.g. "second repo needs this setup"> -> <mechanism + location>

## Skipped
- <candidate> - <why: low score / duplicate of existing config / anti-pattern>

**Scopes:** commit `.claude/` and `.mcp.json` for the team; personal-only pieces go in `~/.claude/` or `.claude/settings.local.json`. Secrets only via `${VAR}` expansion, never committed.
```

Filled example (condensed): *TypeScript + pnpm monorepo, Vitest, ESLint, Postgres, shell-script deploys, no `.claude/`* -> Do now: (1) **CLAUDE.md** with pnpm/test/build commands (3/2/1 -> 4); (2) **PostToolUse hook** running ESLint+Prettier on `Edit|Write` (3/2/2 -> 3, enforcement not request); (3) **PreToolUse hook + permissions deny** blocking force-push and `.env` reads (2/3/2 -> 3). Next steps: Postgres **MCP** + `db-conventions` **skill** when DB questions recur; `/deploy` **command** (`disable-model-invocation: true`) before wiring deploys; `code-reviewer` **subagent** when diffs outgrow the main context. Skipped: GitHub MCP (gh CLI already covers it - anti-pattern #4).

For the category-by-category comparison, the anti-patterns audit list, and the ad-hoc-prompt migration table, see [references/decision-matrix.md](references/decision-matrix.md).

## Sources

- Extend Claude Code (feature comparison, when-to-use, context costs, layering): https://code.claude.com/docs/en/features-overview
- Skills (SKILL.md format, frontmatter, locations, progressive disclosure, command name): https://code.claude.com/docs/en/skills
- Hooks (events, config, handler types, blocking, `if` filter): https://code.claude.com/docs/en/hooks
- Subagents (`.claude/agents/`, frontmatter, scope precedence, what loads at startup): https://code.claude.com/docs/en/sub-agents
- MCP (scopes, `.mcp.json`, transports, `claude mcp add`, tool search): https://code.claude.com/docs/en/mcp
- Skill authoring best practices (descriptions, naming, conciseness): https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Anthropic: Steering Claude Code - skills, hooks, rules, subagents and more (official mental model): https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more
- Community full-stack overview (MCP/skills/subagents/hooks): https://alexop.dev/posts/understanding-claude-code-full-stack/
