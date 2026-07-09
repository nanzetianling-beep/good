# Starter recipes

Copy-paste starting points for the most common recommendations. Every field and flag below was checked against the official docs (https://code.claude.com/docs — hooks, mcp, settings, cli-reference, skills, sub-agents pages). Swap the example commands (`prettier`, `vitest`, `pytest`, ...) for the ones detected during intake; the config *structure* is the part to keep verbatim.

Conventions used below:

- Hook scripts live in `.claude/hooks/` and must be executable (`chmod +x .claude/hooks/*.sh`).
- Hook scripts receive event JSON on stdin; read fields with `jq` (`tool_input.file_path` for Edit/Write, `tool_input.command` for Bash).
- `${CLAUDE_PROJECT_DIR}` in hook commands resolves to the project root.
- All JSON snippets show the full file; when the file already exists, merge the top-level keys instead of overwriting.

## 1. Format-on-edit hook

Runs your formatter on every file Claude edits or writes. Silent on success.

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/format.sh",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/format.sh`:

```bash
#!/bin/bash
# Format the file Claude just edited. Input JSON arrives on stdin.
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md) npx prettier --write "$FILE" >/dev/null 2>&1 ;;
  *.py) ruff format "$FILE" >/dev/null 2>&1 ;;
  *.go) gofmt -w "$FILE" ;;
  *.rs) rustfmt "$FILE" 2>/dev/null ;;
esac
exit 0
```

Keep the case-arms only for languages the repo actually uses. Exit 0 with no output = silent success (zero context cost).

## 2. Block-dangerous-commands hook

`PreToolUse` is the only place a tool call can be reliably blocked. Two mechanisms: exit code 2 (stderr goes to Claude), or exit 0 + JSON with `hookSpecificOutput.permissionDecision: "deny"`. The JSON form is preferred - it carries a structured reason.

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.sh"
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/guard.sh`:

```bash
#!/bin/bash
CMD=$(jq -r '.tool_input.command // empty')

BLOCKED='rm -rf (/|~|\*)|git push --force|git push -f |--no-verify|DROP (TABLE|DATABASE)|git reset --hard origin'

if echo "$CMD" | grep -qE "$BLOCKED"; then
  jq -n --arg cmd "$CMD" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Blocked by project guard hook: " + $cmd)
    }
  }'
fi
exit 0
```

`permissionDecision` values: `allow` / `deny` / `ask` / `defer`. For simple static patterns you don't need a hook at all - a `permissions.deny` rule (recipe 8) is cheaper; use the hook when you need regex/context logic.

## 3. Test-after-change hook

Runs tests related to the edited file. `PostToolUse` can't undo the edit, but exit code 2 feeds stderr back to Claude, which then fixes the failure - a self-correcting loop.

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/test-related.sh",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/test-related.sh`:

```bash
#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

case "$FILE" in
  *.test.*|*_test.*|*/tests/*) exit 0 ;;  # editing a test file: skip, avoid loops
  *.ts|*.tsx|*.js|*.jsx)
    OUT=$(npx vitest related --run "$FILE" 2>&1) || {
      echo "Tests failed after editing $FILE:" >&2
      echo "$OUT" | tail -30 >&2
      exit 2   # stderr goes back to Claude so it fixes the failure
    } ;;
  *.py)
    TEST="tests/test_$(basename "${FILE%.py}").py"
    if [ -f "$TEST" ]; then
      OUT=$(python -m pytest -q "$TEST" 2>&1) || {
        echo "Tests failed after editing $FILE:" >&2
        echo "$OUT" | tail -30 >&2
        exit 2
      }
    fi ;;
esac
exit 0
```

If tests are slow, prefer a manual `/test` command or CI over a per-edit hook - a 5-minute suite firing on every edit is worse than no hook.

## 4. Project skill skeleton

`.claude/skills/db-conventions/SKILL.md` (directory name = the `/db-conventions` command):

```markdown
---
name: db-conventions
description: Database schema, query conventions, and migration workflow for this project. Use when writing SQL, creating migrations, or querying the app database.
---

# Database conventions

## Rules
- Always exclude soft-deleted rows: `WHERE deleted_at IS NULL`.
- Never query `users.email` in analytics - use `users.id`.
- New migrations: `npm run db:migration:new <name>`; never edit an applied migration.

## Schema overview
Core tables: `users`, `orders`, `order_items`. Full column reference: [schema.md](schema.md).

## Common queries
See [queries.md](queries.md) for vetted patterns (pagination, tenant scoping).
```

Sibling files `schema.md` / `queries.md` cost no context until Claude opens them (progressive disclosure). Keep `SKILL.md` under ~500 lines. Add `disable-model-invocation: true` only if it should be manual-only; for reference knowledge like this, leave it auto-invocable and put trigger words in the description.

## 5. Code-reviewer subagent

`.claude/agents/code-reviewer.md`:

```markdown
---
name: code-reviewer
description: Reviews code changes for correctness, edge cases, and project conventions. Use proactively after completing a significant change, before committing.
tools: Read, Glob, Grep, Bash
model: sonnet
---

You are a senior code reviewer for this repository.

When invoked:
1. Run `git diff HEAD` (or review the files named in your task) to see the change.
2. Check: correctness and edge cases; error handling; security (injection, secrets, unsafe input); consistency with surrounding code and CLAUDE.md conventions; missing or stale tests.
3. Do NOT restyle or bikeshed - formatting is handled by hooks.

Report format:
- **Blocking**: bugs or security issues (file:line, why, suggested fix)
- **Should fix**: correctness risks, missing tests
- **Consider**: optional improvements
Keep it under 30 lines. If the change is clean, say so in one line.
```

Only `name` and `description` are required; `tools` omitted = inherit all (restrict for least privilege), `model` can be `haiku`/`sonnet`/`opus`/`inherit`. The body is the subagent's entire system prompt - it does not see your conversation.

## 6. Conventional-commit command

`.claude/skills/commit/SKILL.md` - `disable-model-invocation: true` makes it manual-only (`/commit`); the `` !`...` `` lines inject live command output when invoked.

```markdown
---
name: commit
description: Stage and commit current changes with a Conventional Commits message.
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *)
argument-hint: [optional scope or instructions]
---

## Current state
- Status: !`git status --short`
- Unstaged/staged diff: !`git diff HEAD --stat`
- Recent message style: !`git log --oneline -10`

## Task
Create one commit for the current changes. Extra instructions: $ARGUMENTS

1. Review the diff; stage the related files explicitly (`git add <paths>`, never `git add -A` blindly).
2. Message format: `<type>(<scope>): <imperative summary>` with type in feat|fix|docs|refactor|test|chore|perf|ci. Wrap body at 72 chars; explain *why*, not *what*.
3. If the changes are unrelated, say so and propose a split instead of committing.
4. Never use `--no-verify`. Never push.
```

## 7. MCP servers: Postgres and GitHub

Postgres (stdio server; use a read-only DSN unless writes are truly wanted):

```bash
claude mcp add --transport stdio --scope project db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@db.example.com:5432/appdb"
```

GitHub (remote HTTP server, auth via fine-grained PAT header):

```bash
claude mcp add --transport http --scope project github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"
```

Notes: for stdio servers the `--` separates Claude's flags from the server command - everything after it runs untouched. `--scope project` writes `.mcp.json` (committed, team-shared); `local` (default) and `user` live in `~/.claude.json`.

**Never commit secrets.** For a shared `.mcp.json`, use `${VAR}` expansion (supported in `command`, `args`, `env`, `url`, `headers`; `${VAR:-default}` also works) and let each teammate export the variable:

```json
{
  "mcpServers": {
    "db": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "${DATABASE_URL}"]
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_PAT}" }
    }
  }
}
```

An entry with a `url` **must** set `type` (`http`, or alias `streamable-http`), otherwise Claude Code reads it as a stdio server and skips it. Check status and per-server token cost with `/mcp`.

## 8. Permissions allowlist

`.claude/settings.json` (project, committed) - stop the permission prompts for known-safe commands, hard-deny the never-events. Rules merge across scopes; personal extras go in `.claude/settings.local.json` (gitignored).

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(npm run build)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "ask": [
      "Bash(git push *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(curl *)"
    ]
  }
}
```

Rule syntax: `Tool` or `Tool(specifier)` - `Bash(npm run test *)` (prefix + wildcard), `Read(./secrets/**)` (glob), `WebFetch(domain:example.com)`, `mcp__server__tool`. `deny` beats `ask` beats `allow`. Swap the npm commands for the project's real ones found during intake.

## 9. CLAUDE.md starter

`./CLAUDE.md` (repo root, committed). Keep under ~60 lines; if it grows past ~200, move detail into skills or `.claude/rules/`.

```markdown
# <Project name>

<One sentence: what this codebase is.>

## Commands
- Install: `pnpm install`
- Test: `pnpm test` (single file: `pnpm vitest run <path>`)
- Lint/format: `pnpm lint` / `pnpm format`
- Build: `pnpm build`
- Dev server: `pnpm dev` (http://localhost:3000)

## Rules
- Use pnpm, never npm or yarn.
- Run `pnpm test` before declaring a task done.
- Never edit files under `src/generated/` - regenerate with `pnpm codegen`.
- New env vars must be added to `.env.example` with a comment.

## Architecture
- `apps/web` - Next.js frontend; `apps/api` - Fastify backend; `packages/*` - shared libs.
- API routes follow REST conventions in `.claude/skills/api-conventions/` (Claude: load that skill before adding endpoints).
```

Every line should be something Claude would otherwise get wrong. Delete sections that don't apply; don't pad.

## 10. CI / headless invocation

`claude -p` runs one non-interactive turn-loop and exits - the building block for CI jobs. Scope tools tightly instead of `--dangerously-skip-permissions`.

```bash
# Example: auto-fix lint failures on a branch (CI step)
claude -p "Run 'npm run lint'. Fix every error it reports, then rerun it to confirm a clean pass." \
  --allowedTools "Edit" "Read" "Bash(npm run lint)" \
  --permission-mode acceptEdits \
  --max-turns 25 \
  --output-format json
```

GitHub Actions step (requires `ANTHROPIC_API_KEY` secret; `npm install -g @anthropic-ai/claude-code` first or use a setup action):

```yaml
- name: Claude lint fix
  run: |
    claude -p "Run 'npm run lint'; fix all reported errors, then rerun to confirm." \
      --allowedTools "Edit" "Read" "Bash(npm run lint)" \
      --permission-mode acceptEdits --max-turns 25 --output-format json
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Useful flags: `--output-format text|json|stream-json` (`json` gives a machine-readable result envelope), `--max-turns N` and `--max-budget-usd N` (runaway guards, print mode only), `--json-schema '<schema>'` (validated structured output), `--append-system-prompt "..."` (extra standing instructions), `--permission-mode` (`default`, `acceptEdits`, `plan`, `dontAsk`, `bypassPermissions`). For PR-triggered review/fix workflows, the packaged `anthropics/claude-code-action` on the GitHub Marketplace is usually simpler than hand-rolled steps.
