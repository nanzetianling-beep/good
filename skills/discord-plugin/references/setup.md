# Discord ↔ Claude Code bridge — full setup

This walks through creating the Discord bot, wiring it to the host, and the two
invocation options (headless CLI subprocess, or the Agent SDK).

## 1. Create the Discord application and bot

1. Go to the **Discord Developer Portal** → <https://discord.com/developers/applications>.
2. **New Application**, name it (e.g. "Claude Code Bridge").
3. Left sidebar → **Bot** → **Reset Token** → copy the token. This is your
   `DISCORD_BOT_TOKEN`. Treat it like a password; you can only view it once.
4. Still on **Bot**, scroll to **Privileged Gateway Intents** and enable
   **MESSAGE CONTENT INTENT** (mandatory to read the text of user messages).
   Leave Presence / Server Members off unless you need them.

## 2. Invite the bot to your server

1. Left sidebar → **OAuth2** → **URL Generator**.
2. **Scopes:** check `bot`.
3. **Bot Permissions:** *View Channels*, *Send Messages*, *Attach Files*,
   *Read Message History*, *Create Public Threads* / *Create Private Threads*,
   *Send Messages in Threads*.
4. Copy the generated URL, open it in a browser, pick your server, authorize.

## 3. Collect the IDs that lock down access

1. Discord → **User Settings → Advanced → Developer Mode: ON**.
2. Right-click **your username** → **Copy User ID** → `ALLOWED_USER_IDS`.
3. Right-click your **server icon** → **Copy Server ID** → `GUILD_ID`.
4. Right-click the **channel** the bot should watch → **Copy Channel ID** →
   `CHANNEL_ID`.

## 4. Host prerequisites

- `claude` CLI installed and authenticated (`claude` once interactively, or set
  `ANTHROPIC_API_KEY`). Verify: `claude -p "say hi" --output-format json`.
- Python 3.10+ and `pip install discord.py` (v2.x).
- A dedicated working directory for deliverables, e.g. `~/claude-bridge-workspace`.

## 5. Configure environment (never commit these)

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"   # from step 1.3 — keep secret
export GUILD_ID="123456789012345678"
export CHANNEL_ID="123456789012345678"
export ALLOWED_USER_IDS="111111111111111111,222222222222222222"
export BRIDGE_WORKDIR="$HOME/claude-bridge-workspace"
```

## 6. Run the bridge (keep it alive)

```bash
tmux new -s claude-bridge
python examples/bot.py
# detach: Ctrl-b then d
```

Or install it as a `systemd --user` service / `launchd` agent so it restarts on
boot. Keep it running on the host that has your project and Claude Code login.

## 7. Headless invocation reference (`claude -p`)

The bridge shells out per message. Core flags:

| Flag | Purpose |
| ---- | ------- |
| `-p, --print` | Non-interactive: one prompt in, one result out, then exit. |
| `--output-format json` | Returns `{"result","session_id","total_cost_usd",...}`. Parse `.result` and `.session_id`. |
| `--output-format stream-json --verbose` | Newline-delimited events for live streaming/progress. |
| `--resume <session_id>` | Continue a specific prior session (per-thread revise workflow). |
| `--continue` | Continue the most recent session in that directory. |
| `--allowedTools "Read,Edit,Write,Bash(git *)"` | Auto-approve specific tools (permission-rule syntax; trailing ` *` = prefix match). |
| `--permission-mode acceptEdits` | Auto-approve file writes + common fs commands; other shell/network still need allow rules. |
| `--append-system-prompt "..."` | Add standing instructions (e.g. "Always save deliverables into $BRIDGE_WORKDIR"). |
| `--max-turns N` | Bound the agent loop for cost/safety. |
| `--bare` | Skip auto-discovery (hooks/skills/MCP/CLAUDE.md) for fast, reproducible runs. |

Example the bridge runs:

```bash
claude -p "Create a one-page news brief on today's AI headlines and save it as brief.pdf" \
  --output-format json \
  --resume "$SESSION_ID" \
  --allowedTools "Read,Write,Edit,Bash(pandoc *),WebSearch,WebFetch" \
  --append-system-prompt "Save all deliverables into the current working directory." \
  # cwd = the thread's workdir
```

Then: `result=$(… | jq -r '.result')`, `session=$(… | jq -r '.session_id')`.

## 8. Alternative: Agent SDK instead of subprocess

For structured message objects and tool-approval callbacks (so you could route a
permission prompt to a Discord button), use the Agent SDK. Python sketch:

```python
from claude_agent_sdk import query, ClaudeAgentOptions

async def run(prompt: str, workdir: str, session_id: str | None):
    options = ClaudeAgentOptions(
        cwd=workdir,
        resume=session_id,                       # continue the thread's session
        allowed_tools=["Read", "Write", "Edit", "WebSearch"],
        permission_mode="acceptEdits",
    )
    result_text, new_session = "", session_id
    async for message in query(prompt=prompt, options=options):
        # inspect message objects; accumulate assistant text; capture session id
        ...
    return result_text, new_session
```

TypeScript users: `@anthropic-ai/claude-agent-sdk` exposes an equivalent `query()`.
The subprocess approach in `examples/bot.py` needs no extra dependency beyond the
`claude` CLI, so it's the simplest starting point.

## Troubleshooting

- **Bot sees no message text** → MESSAGE CONTENT INTENT not enabled, or
  `intents.message_content = True` missing in code. Both Portal *and* code must set it.
- **Bot online but silent** → author/guild/channel allowlist rejecting you; log
  the rejected IDs to confirm.
- **Files not uploaded** → Claude saved outside `BRIDGE_WORKDIR`; add the
  `--append-system-prompt` directive, or the file exceeds Discord's size limit.
- **`claude` not found** → not on the bridge process's `PATH`; use an absolute path.
