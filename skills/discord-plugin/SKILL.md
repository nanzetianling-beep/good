---
name: discord-plugin
description: Bridges a Discord bot to Claude Code so a user can operate their host PC's Claude Code remotely from a phone. Use when the user wants to control Claude Code from Discord, run automation/document/news tasks from mobile, receive deliverables (images/PDF) as attachments, or set up a Discord-to-Claude-Code bridge for remote/on-the-go operation.
---

# Discord Plugin

Operate Claude Code on your home/office PC from anywhere via Discord. You send a
natural-language instruction from the Discord mobile app; a small bridge process
running on the host invokes Claude Code in headless mode (`claude -p`), streams
the reply back into the channel, and uploads any generated files (images, PDF,
Markdown) as Discord attachments you can review and revise from your phone.

## When to use

- "Control Claude Code from Discord / from my phone."
- "Run a document-creation or news-delivery task remotely and get the result as a PDF/image."
- "Set up a Discord bot that bridges to Claude Code."
- Reviewing or revising deliverables while away from the machine.

## Architecture

```
Phone (Discord app)
      │  message in a mapped channel / thread
      ▼
Discord Gateway ──► Bridge process (runs on the HOST PC)
                        │  1. auth-check author (allowed user + guild + channel)
                        │  2. claude -p "<prompt>" --output-format json
                        │        --resume <session-id>   (per-thread session)
                        │        --allowedTools ...       (scoped permissions)
                        │  3. parse JSON: .result + .session_id
                        │  4. diff the work dir → collect new/changed files
                        ▼
Discord channel ◄── reply text + discord.File attachments (png/pdf/md)
```

Key points:

- **The bridge runs on the host**, where Claude Code and your project files live.
  Discord is only the remote UI. Nothing about your machine is exposed publicly —
  the bot makes an **outbound** Gateway (WebSocket) connection to Discord, so no
  inbound ports or tunnels are needed.
- **One thread/channel = one Claude Code session.** The bridge stores a
  `channel_id -> session_id` map and passes `--resume <session_id>` so follow-up
  messages continue the same conversation (revise-on-phone workflow).
- **Headless invocation.** Each message becomes a single `claude -p` batch call.
  `--output-format json` returns `{ "result", "session_id", "total_cost_usd", ... }`
  so the bridge can print the answer and remember the session.
- **File delivery by dir-diff.** Claude writes deliverables into a per-thread
  working directory. The bridge snapshots the dir before/after each run and
  uploads anything new or modified as attachments (Discord's default upload limit
  is ~10 MB / 25 MB on boosted guilds).

You can swap the subprocess call for the **Agent SDK** (Python/TypeScript) if you
want structured message objects and tool-approval callbacks instead of parsing
CLI JSON — see `references/setup.md`.

## Setup (summary)

1. **Create the Discord application + bot.** Developer Portal → New Application →
   Bot → *Reset Token* to get the token. Under **Privileged Gateway Intents**,
   enable **MESSAGE CONTENT INTENT** (required to read message text).
2. **Invite the bot.** OAuth2 → URL Generator → scope `bot`; permissions
   *View Channels*, *Send Messages*, *Attach Files*, *Read Message History*,
   *Create Public/Private Threads*. Open the URL and add it to your guild.
3. **Get your IDs.** Enable Developer Mode in Discord, right-click your user and
   the target channel → *Copy ID*. These lock the bot to you and one channel.
4. **Configure the host.** `export DISCORD_BOT_TOKEN=...`, set `ALLOWED_USER_IDS`,
   `GUILD_ID`, `CHANNEL_ID`, and a `WORKDIR`. Never hard-code the token.
5. **Run the bridge on the host** (`python examples/bot.py`) inside `tmux`/a
   service so it survives disconnects. Ensure `claude` is on `PATH` and logged in.
6. **Operate from mobile.** Message the mapped channel; replies and files come back.

Full, copy-pasteable steps and an Agent-SDK variant are in
[`references/setup.md`](references/setup.md). A complete runnable bot is in
[`examples/bot.py`](examples/bot.py).

## Security considerations

Remote code execution over a chat app is powerful and dangerous. Treat the
bridge as a privileged shell into your machine.

- **Allowlist the author on every message.** Reject unless
  `author.id ∈ ALLOWED_USER_IDS` **and** `guild.id == GUILD_ID` **and**
  `channel.id ∈ allowed channels`. Ignore bots/DMs unless explicitly intended.
  Do this check *before* spawning Claude.
- **Protect the token.** It grants full control of the bot identity. Keep it in
  an env var or secrets manager, never in git, logs, or Discord messages. If it
  leaks, reset it in the Developer Portal immediately.
- **Scope permissions; avoid blanket bypass.** Prefer `--allowedTools` with
  specific rules (e.g. `Read,Edit,Write,Bash(git status *)`) or
  `--permission-mode acceptEdits`. `--dangerously-skip-permissions` /
  `--permission-mode dontAsk`-style full bypass turns any Discord message into
  unattended arbitrary command execution — only use it in a sandbox.
- **Sandbox the workspace.** Run the bridge as a low-privilege user, pin `WORKDIR`
  to a dedicated project folder, and consider a container/VM. Because permission
  prompts can't be answered from Discord, anything Claude can do runs unattended.
- **Confirm destructive actions.** For irreversible operations (deletes, force
  pushes, deploys), gate them behind a Discord confirmation — e.g. a reaction or
  a `!confirm` reply / button interaction — rather than auto-running.
- **Bound cost and blast radius.** Consider `--max-turns`, a timeout on the
  subprocess, rate-limiting per user, and logging every prompt + result.

## How deliverables (images / PDF) get delivered back

1. Claude writes output into the thread's `WORKDIR` (tell it to, e.g. "save the
   report as report.pdf").
2. The bridge records file mtimes/paths before the run and re-scans after.
3. New or modified files are wrapped in `discord.File(path)` and sent with the
   reply: `await message.reply(content=result_text, files=[discord.File(p) for p in new_files])`.
4. Images render inline in Discord; PDFs/Markdown appear as downloadable
   attachments. On mobile you preview the deliverable, then reply with revisions
   ("make the title bigger, regenerate the PDF") which continue the same session.

## Sources

- Claude Code — Run Claude Code programmatically (headless `claude -p`, `--output-format json`/`stream-json`, `--resume`, `--allowedTools`, `--permission-mode`, `--bare`): https://code.claude.com/docs/en/headless
- discord.py — Gateway intents / MESSAGE CONTENT INTENT primer: https://discordpy.readthedocs.io/en/stable/intents.html
- naichilab/discord-bridge-server — relay server & skill to remotely operate Claude Code / Codex CLI over Discord (channel↔session mapping, `allowedUserIds`, MESSAGE CONTENT INTENT, Attach Files): https://github.com/naichilab/discord-bridge-server
- ebibibi/claude-code-discord-bridge — Discord threads as isolated Claude Code CLI sessions: https://github.com/ebibibi/claude-code-discord-bridge
