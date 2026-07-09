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

They are additive and combine freely. When the same feature exists at multiple levels, precedence is: CLAUDE.md is additive (all levels contribute; more specific instructions typically win on conflict); skills override by name (managed > user > project; plugin skills are namespaced so they never conflict); subagents (managed > `--agents` CLI flag > project > user); MCP servers (local > project > user); hooks merge (all fire).

## Feature-by-feature detail

### CLAUDE.md
- **Loads:** every session, full content, from your working directory up to the repo root, plus nested files as you touch subdirectories. Keep under ~200 lines. Split large or path-specific content into `.claude/rules/` files, which can be `paths`-scoped to load only for matching files.
- **Best for:** build/test commands, project architecture, "always/never do X" conventions.
- **Not for:** anything conditional or heavy - that belongs in a skill.

### Skill
- **Location:** `.claude/skills/<name>/SKILL.md` (project), `~/.claude/skills/<name>/SKILL.md` (personal), plugin, or managed. The **directory name** becomes the `/command`; the frontmatter `name` is only the display label (except for a plugin-root `SKILL.md`, where `name` sets the command).
- **Frontmatter (all optional; only `description` recommended):** `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation` (manual-only), `user-invocable: false` (Claude-only background knowledge), `allowed-tools` (pre-approve tools without restricting others), `disallowed-tools`, `model`, `effort`, `context: fork` + `agent:` (run in a subagent), `paths` (glob-scoped auto-activation), `hooks`, `shell`.
- **Description rules:** third person, specific, key use case first. The combined `description` + `when_to_use` is truncated at 1,536 chars in the listing; the listing also has a per-session character budget (default 1% of the context window) that shortens low-priority descriptions when you have many skills. Include trigger keywords users would actually say.
- **Progressive disclosure:** keep `SKILL.md` body under ~500 lines; move detail into sibling files referenced from `SKILL.md`. Scripts are executed, not loaded, so they cost no context until run.
- **Dynamic context:** `` !`command` `` (inline, at line start or after whitespace) or a ` ```! ` fenced block injects live command output into the body before Claude sees it. `$ARGUMENTS`, `$ARGUMENTS[N]`/`$N`, `$name`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_SESSION_ID}` substitutions are available.
- **Lifecycle:** once invoked, the rendered content enters the conversation and stays for the session; it is not re-read each turn. Write standing instructions, not one-time steps.
- **Two flavors:** *reference* skills (knowledge applied inline) and *task* skills (step-by-step actions, often `disable-model-invocation: true`).

### Command (slash command)
- Custom commands have been **merged into skills**. `.claude/skills/deploy/SKILL.md` and legacy `.claude/commands/deploy.md` both create `/deploy` and behave the same. If a skill and a command share a name, the skill wins.
- Make it command-only (no auto-trigger) with `disable-model-invocation: true`. Use for side-effecting actions you want to time: `/commit`, `/deploy`, `/release`, `/send-slack-message`. This also removes the description from context until you invoke it (zero cost).
- Skills are preferred over the legacy `commands/` form because they support supporting files, invocation control, and auto-triggering.

### Hook
- **Location:** `settings.json` under `"hooks"` - `.claude/settings.json` (project, committed), `.claude/settings.local.json` (local, gitignored), `~/.claude/settings.json` (personal), managed settings, plugin `hooks/hooks.json`, or skill/agent frontmatter (scoped to that component's lifecycle).
- **Structure (three nesting levels):** `{ "hooks": { "<Event>": [ { "matcher": "<pattern>", "hooks": [ { "type": "command", "command": "..." } ] } ] } }`. Matcher is an exact string / list (`Bash`, `Edit|Write`, `startup`) or a JS regex when it contains other characters (`^Notebook`, `mcp__memory__.*`); omit or `*` to match all. The matched field depends on the event (tool name for `PreToolUse`; how the session started for `SessionStart`; etc.).
- **Events (selected from ~30):** `SessionStart`, `Setup`, `UserPromptSubmit`, `PreToolUse` (can block), `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Stop`, `StopFailure`, `SubagentStart`/`SubagentStop`, `PreCompact`/`PostCompact`, `SessionEnd`, `Notification`, `FileChanged`, `ConfigChange`, `CwdChanged`. Full list in the hooks reference.
- **Handler types:** `command` (shell, JSON on stdin), `http` (POST JSON), `prompt` (single-turn yes/no to a model), `agent` (spawn a subagent; experimental), `mcp_tool` (call a connected server's tool). A per-handler `if` field filters execution by permission rule (e.g. `"Bash(rm *)"`, `"Edit(*.ts)"`); `timeout` and `statusMessage` are also supported.
- **Blocking:** a `command` hook exiting 2 blocks the action (on blockable events like `PreToolUse`, `UserPromptSubmit`, `Stop`) and shows stderr to Claude; or exit 0 and print JSON with `hookSpecificOutput.permissionDecision` set to `allow` / `deny` / `ask` / `defer` (plus a `permissionDecisionReason`). Exit 0 with no output stays silent. `PostToolUse` and other after-the-fact events cannot block.
- **Rule of thumb:** if a rule must hold *every* time, make it a hook, not a CLAUDE.md/skill instruction. Prompt instructions are requests; hooks are enforcement. Hook context cost is zero unless the hook returns output. Keep judgment out of hooks - they are for deterministic checks.

### Subagent (Agent)
- **Location:** `.claude/agents/<name>.md` (project, precedence over user), `~/.claude/agents/<name>.md` (personal). Scanned recursively; identity comes only from the `name` field, not the path. Precedence: managed > `--agents` CLI flag > project > user.
- **Format:** YAML frontmatter + markdown body (the body is the system prompt). Required: `name`, `description`. Common fields: `tools` (allowlist; omit to inherit all), `model` (`haiku`/`sonnet`/`opus`/`inherit`), `skills` (preloaded fully at launch), plus permission/isolation options.
- **When:** context-heavy side tasks (read many files, extensive search) where you only want the summary; parallel specialized workers; least-privilege workers; routing to a cheaper/faster model like Haiku.
- **Startup:** gets its own system prompt + CLAUDE.md + git status, plus any skills in its `skills:` field fully preloaded (built-in `Explore` and `Plan` agents skip CLAUDE.md and git status to stay small). Does not inherit your conversation history.
- **Subagent vs agent team:** subagents report back to the main agent only; agent teams are independent sessions that message each other. Start with subagents; move to agent teams only when workers must communicate (agent teams are experimental and off by default).

### MCP
- **Add:** `claude mcp add --transport http <name> <url>` (remote, recommended, supports OAuth), or `claude mcp add [--env K=V] --scope project <name> -- <command> [args]` (stdio/local; the `--` separates Claude's flags from the server command).
- **Scopes (`-s`/`--scope`):** `local` (default, just you in this project; older versions called this `project`), `project` (`.mcp.json`, shared with the team, requires approval), `user` (all your projects; older versions called this `global`).
- **Transports:** `http` (`streamable-http` is an accepted alias; preferred for remote, supports OAuth), `stdio` (local process), `sse` (deprecated), `ws` (event-pushing servers, header auth only). A `.mcp.json` entry with a `url` **must** set `type`, or Claude reads it as a stdio server and skips it.
- **`.mcp.json` example:**
  ```json
  { "mcpServers": { "airtable": { "command": "npx", "args": ["-y", "airtable-mcp-server"], "env": { "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}" } } } }
  ```
- **When:** any time you copy-paste from an external system (issue tracker, DB, monitoring, design tool, chat). Tool names load at session start; full schemas are deferred (tool search on by default), so idle servers are cheap. `/mcp` shows status and per-server token cost. Project servers from `.mcp.json` require approval / a trusted workspace before they connect.

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

- **Who starts it?** Lifecycle event -> hook. You typing `/name` -> command. Claude matching a description -> skill/subagent. A call to an external system -> MCP.
- **Skill vs Subagent:** skill = reusable content added to *your* context; subagent = isolated worker with its *own* context returning a summary. They combine (`context: fork`, or a subagent's `skills:` field).
- **Skill vs Hook:** skill = Claude reasons over instructions (outcome can vary); hook = deterministic, guaranteed on its event. Guardrails belong in hooks.
- **Skill vs MCP:** MCP provides the *connection and tools*; a skill provides the *knowledge of how to use them well*. Pair them.
- **CLAUDE.md vs Skill:** always-on rules vs on-demand reference/workflow. If CLAUDE.md grows past ~200 lines, move reference content into skills or `.claude/rules/`.
- **Command vs Skill:** a command is just a skill you invoke manually (`disable-model-invocation: true`).
