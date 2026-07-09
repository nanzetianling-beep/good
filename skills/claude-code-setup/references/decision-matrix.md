# Decision matrix: MCP vs Skill vs Hook vs Agent vs Command

Detailed reference for the `claude-code-setup` skill. Read when a recommendation is non-obvious or the user wants to understand trade-offs.

## The layering model

Every extension plugs into a different part of the agentic loop:

- **CLAUDE.md** - persistent context Claude sees every session (not one of the five, but usually the first thing to reach for).
- **Skill** - reusable knowledge or an invocable workflow, loaded on demand.
- **MCP** - a connection to an external service (tools + data).
- **Subagent** - an isolated worker with its own context window that returns a summary.
- **Hook** - a deterministic side effect fired on a lifecycle event.
- **Command** - a manually invoked skill (`/name`).

They are additive and combine freely. When the same feature exists at multiple levels, precedence is: CLAUDE.md is additive (all levels contribute); skills override by name (managed > user > project); subagents (managed > CLI flag > project > user > plugin); MCP servers (local > project > user); hooks merge (all fire).

## Feature-by-feature detail

### CLAUDE.md
- **Loads:** every session, full content. Keep under ~200 lines. Split large content into `.claude/rules/` files (which can be `paths`-scoped to load only for matching files).
- **Best for:** build/test commands, project architecture, "always/never do X" conventions.
- **Not for:** anything conditional or heavy - that belongs in a skill.

### Skill
- **Location:** `.claude/skills/<name>/SKILL.md` (project), `~/.claude/skills/<name>/SKILL.md` (personal), plugin, or managed. Directory name -> `/command`.
- **Frontmatter:** only `description` is recommended. Useful fields: `disable-model-invocation` (manual-only), `user-invocable: false` (Claude-only background knowledge), `allowed-tools` (pre-approve tools), `context: fork` + `agent:` (run in a subagent), `model`, `effort`, `paths`, `argument-hint`, `arguments`, `hooks`.
- **Description rules:** third person, specific, put the key use case first (combined description + `when_to_use` is truncated near 1,536 chars in the listing). Include trigger keywords users would actually say.
- **Progressive disclosure:** keep `SKILL.md` body under 500 lines; move detail into sibling files linked exactly one level deep from `SKILL.md`. Scripts are executed, not loaded, so they cost no context until run.
- **Dynamic context:** `` !`command` `` injects live command output into the body before Claude sees it. `$ARGUMENTS`, `$0`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}` substitutions are available.
- **Two flavors:** *reference* skills (knowledge applied inline) and *task* skills (step-by-step actions, often `disable-model-invocation: true`).

### Command (slash command)
- Unified with skills. `.claude/skills/deploy/SKILL.md` and legacy `.claude/commands/deploy.md` both create `/deploy`.
- Make it command-only (no auto-trigger) with `disable-model-invocation: true`. Use for side-effecting actions you want to time: `/commit`, `/deploy`, `/release`, `/send-slack-message`.
- Skills are preferred over the legacy `commands/` form because they support supporting files, invocation control, and auto-triggering.

### Hook
- **Location:** `settings.json` under `"hooks"` - `.claude/settings.json` (project, committed), `.claude/settings.local.json` (local, gitignored), `~/.claude/settings.json` (personal), plugin `hooks/hooks.json`, or skill/agent frontmatter (scoped to that component's lifecycle).
- **Structure:** `{ "hooks": { "<Event>": [ { "matcher": "<ToolPattern>", "hooks": [ { "type": "command", "command": "..." } ] } ] } }`. Matcher is exact (`Bash`, `Edit|Write`) or regex (`mcp__.*`); omit or `*` to match all.
- **Events (selected):** `SessionStart`, `UserPromptSubmit`, `PreToolUse` (can block), `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStart`/`SubagentStop`, `PreCompact`/`PostCompact`, `SessionEnd`, `Notification`, `FileChanged`. Full list in the hooks reference.
- **Handler types:** `command` (shell, JSON on stdin), `http`, `prompt` (ask a model yes/no), `agent` (spawn a subagent), `mcp_tool`.
- **Blocking:** a `command` hook exiting 2 blocks the action and shows stderr to Claude; or return JSON `hookSpecificOutput.permissionDecision: "deny"`. Exit 0 = success, other = non-blocking error.
- **Rule of thumb:** if a rule must hold *every* time, make it a hook, not a CLAUDE.md/skill instruction. Prompt instructions are requests; hooks are enforcement. Hook context cost is zero unless the hook returns output.

### Subagent (Agent)
- **Location:** `.claude/agents/<name>.md` (project, precedence over user), `~/.claude/agents/<name>.md` (personal). Scanned recursively; identity comes only from the `name` field.
- **Format:** YAML frontmatter + markdown body (the body is the system prompt). Required: `name`, `description`. Common fields: `tools` (allowlist; omit to inherit all), `disallowedTools`, `model` (`haiku`/`sonnet`/`opus`/`inherit`), `skills` (preloaded fully at launch), `permissionMode`, `mcpServers`, `hooks`, `isolation: worktree`, `color`.
- **When:** context-heavy side tasks (read many files, extensive search) where you only want the summary; parallel specialized workers; least-privilege workers; routing to a cheaper/faster model.
- **Startup:** gets its own system prompt + CLAUDE.md + git status (built-in `Explore` and `Plan` agents skip CLAUDE.md and git status to stay small). Does not inherit your conversation history.
- **Subagent vs agent team:** subagents report back to the main agent only; agent teams are independent sessions that message each other. Start with subagents; move to agent teams only when workers must communicate.

### MCP
- **Add:** `claude mcp add --transport http <name> <url>` (remote, recommended), or `claude mcp add [--env K=V] --scope project <name> -- <command> [args]` (stdio/local).
- **Scopes:** `local` (default, just you in this project), `project` (`.mcp.json`, shared with the team, requires approval), `user` (all your projects, `~/.claude.json`).
- **Transports:** `http` (a.k.a. `streamable-http`, supports OAuth - preferred for remote), `stdio` (local process), `sse` (deprecated), `ws` (event-pushing servers).
- **`.mcp.json` example:**
  ```json
  { "mcpServers": { "airtable": { "command": "npx", "args": ["-y", "airtable-mcp-server"], "env": { "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}" } } } }
  ```
- **When:** any time you copy-paste from an external system (issue tracker, DB, monitoring, design tool, chat). MCP tool names load at session start; full schemas are deferred (tool search on by default), so idle servers are cheap. `/mcp` shows status and per-server token cost.

## Build your setup over time (trigger -> add)

| Trigger | Add |
| :--- | :--- |
| Claude gets a convention/command wrong twice | CLAUDE.md |
| You keep typing the same prompt to start a task | A user-invocable skill |
| You paste the same playbook a third time | A skill |
| You keep copying from a tool Claude can't see | An MCP server |
| A side task floods your conversation | A subagent |
| You want something to happen every time without asking | A hook |
| A second repo needs the same setup | A plugin (bundles skills/hooks/agents/MCP) |

Don't configure everything up front. Start with CLAUDE.md plus one or two clear wins, and add the rest as triggers appear. The same triggers tell you when to update what you already have.

## Quick disambiguation cheatsheet

- **Skill vs Subagent:** skill = reusable content added to *your* context; subagent = isolated worker with its *own* context returning a summary. They combine (`context: fork`, or a subagent's `skills:` field).
- **Skill vs Hook:** skill = Claude reasons over instructions (outcome can vary); hook = deterministic, guaranteed on its event. Guardrails belong in hooks.
- **Skill vs MCP:** MCP provides the *connection and tools*; a skill provides the *knowledge of how to use them well*. Pair them.
- **CLAUDE.md vs Skill:** always-on rules vs on-demand reference/workflow. If CLAUDE.md grows past ~200 lines, move reference content into skills.
- **Command vs Skill:** a command is just a skill you invoke manually (`disable-model-invocation: true`).
