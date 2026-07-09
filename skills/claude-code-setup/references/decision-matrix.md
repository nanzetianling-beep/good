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

## Migration table: from ad-hoc prompt to mechanism

Users usually arrive with habits, not requirements. Map what they *already do by hand* to the mechanism that absorbs it. Starter configs for most targets are in [recipes.md](recipes.md).

| You keep typing/pasting/doing... | Migrate to | Where |
| :--- | :--- | :--- |
| Correcting "use pnpm, not npm" (or any command Claude gets wrong twice) | CLAUDE.md line | `./CLAUDE.md` |
| "Now run the formatter on the files you touched" | `PostToolUse` hook on `Edit\|Write` | `.claude/settings.json` |
| "Run the tests before you say you're done" | `PostToolUse` test hook, or a Stop-time check | `.claude/settings.json` |
| "Don't touch `.env` / never push to main / no `rm -rf`" | `permissions.deny` rule; `PreToolUse` hook for patterns needing logic | `.claude/settings.json` (+ `.claude/hooks/`) |
| Approving the same safe command every session | `permissions.allow` entry | `.claude/settings.json` |
| Pasting the same release/deploy checklist | Command (skill with `disable-model-invocation: true`) | `.claude/skills/deploy/` |
| Pasting your API style guide before API work | Reference skill (auto-invocable) or `paths`-scoped rule | `.claude/skills/api-conventions/` or `.claude/rules/` |
| Pasting query results from psql / rows from a dashboard / tickets from Jira | MCP server | `.mcp.json` |
| Explaining the schema and "always exclude test accounts" after connecting the DB | Skill paired with the MCP server | `.claude/skills/db-conventions/` |
| "Now review that diff for bugs" at the end of every task | Code-reviewer subagent | `.claude/agents/code-reviewer.md` |
| "Search the whole codebase for X and just give me a summary" | Subagent (research/explore worker) | `.claude/agents/` or built-in Explore |
| The same kickoff prompt every morning ("check CI, then...") | User-invocable skill (`/kickoff`) | `.claude/skills/kickoff/` |
| Hand-writing commit messages in your team's format | `/commit` command with injected `git status`/`diff` | `.claude/skills/commit/` |
| Copying this whole setup into a second repo | Plugin | plugin repo / marketplace |

## Anti-patterns seen in the wild

Wrong tool choices to recognize during an audit - each with why it fails and the fix.

1. **Guardrails as prose.** "NEVER run rm -rf" in CLAUDE.md. A prompt instruction is a request the model can miss under context pressure; only `permissions.deny` and `PreToolUse` hooks actually block. Keep the sentence if you like, but add the enforcement.
2. **The 500-line CLAUDE.md.** Architecture essays, API references, and onboarding docs in an always-on file tax every request and dilute the rules that matter. Keep it to commands + rules Claude actually gets wrong; move reference material to skills, path-specific rules to `.claude/rules/`.
3. **Always-on rules hidden in a skill.** "Always use pnpm" inside an on-demand skill may never load when needed. Standing rules go in CLAUDE.md; skills are for on-demand depth. (Inverse of #2.)
4. **MCP wrappers around local CLIs.** Building/installing an MCP server for git, gh, aws, or kubectl when Claude already runs them via Bash. MCP earns its cost for systems Bash can't reach (auth'd SaaS APIs, DBs, browsers). For a CLI, a skill documenting the right invocations is cheaper.
5. **Judgment inside hooks.** A `PreToolUse` script grepping for "bad style" or "risky-looking" code blocks legitimate work and can't reason about context. Hooks = deterministic checks (path, pattern, exit code); judgment belongs in a reviewer subagent or skill.
6. **Auto-invocable side effects.** A deploy/publish/email skill without `disable-model-invocation: true` - Claude can trigger it from a description match. Anything irreversible must be manual-only, plus `permissions.ask` on the underlying command as a belt-and-suspenders.
7. **Subagents for everything.** Spawning a worker for a two-file lookup pays startup cost and loses conversation context. Subagents earn their keep when the side task would flood context or parallelize; small questions stay in the main thread.
8. **Vague skill descriptions.** `description: Helps with testing.` never triggers (or triggers wrongly). Write third-person, key use case first, with the words users actually say: "Runs and fixes the Vitest suite. Use when tests fail or when asked to add test coverage."
9. **Secrets committed in `.mcp.json`.** PATs and DSNs in a shared file. Use `${VAR}` expansion (`command`, `args`, `env`, `url`, `headers`) and document required variables in `.env.example`.
10. **Chatty hooks.** A format/lint hook that prints success output on every edit bloats context each time. Exit 0 silently on success; emit output only on failure (exit 2 stderr for feedback Claude should act on).
11. **The same rule in four places.** CLAUDE.md, a skill, a hook message, and a subagent prompt all restating the test command - they drift, and Claude gets contradictions. One source of truth per fact; other layers reference it, not restate it.
12. **`--dangerously-skip-permissions` as a habit** (especially in CI on repos holding secrets). Scope a real allowlist with `--allowedTools` / `permissions.allow` plus `--max-turns` instead; bypass mode is for sandboxed throwaway environments.

## Quick disambiguation cheatsheet

- **Who starts it?** Lifecycle event -> hook. You typing `/name` -> command. Claude matching a description -> skill/subagent. A call to an external system -> MCP.
- **Skill vs Subagent:** skill = reusable content added to *your* context; subagent = isolated worker with its *own* context returning a summary. They combine (`context: fork`, or a subagent's `skills:` field).
- **Skill vs Hook:** skill = Claude reasons over instructions (outcome can vary); hook = deterministic, guaranteed on its event. Guardrails belong in hooks.
- **Skill vs MCP:** MCP provides the *connection and tools*; a skill provides the *knowledge of how to use them well*. Pair them.
- **CLAUDE.md vs Skill:** always-on rules vs on-demand reference/workflow. If CLAUDE.md grows past ~200 lines, move reference content into skills or `.claude/rules/`.
- **Command vs Skill:** a command is just a skill you invoke manually (`disable-model-invocation: true`).
