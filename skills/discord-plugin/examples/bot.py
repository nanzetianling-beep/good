#!/usr/bin/env python3
"""
Minimal Discord <-> Claude Code bridge.

Runs on the HOST machine where Claude Code and your project live. Each message
in a mapped channel/thread becomes a headless `claude -p` invocation; the reply
text plus any newly generated files (images/PDF/Markdown) are sent back to
Discord as attachments. Follow-up messages resume the same Claude session, so you
can review and revise deliverables from your phone.

Requires:
    pip install "discord.py>=2.0"
    claude CLI installed, on PATH, and authenticated

Environment (see references/setup.md):
    DISCORD_BOT_TOKEN   bot token (KEEP SECRET; never commit)
    GUILD_ID            server id the bot is allowed to serve
    CHANNEL_ID          channel id to watch (threads under it inherit access)
    ALLOWED_USER_IDS    comma-separated user ids permitted to command the bot
    BRIDGE_WORKDIR      base working directory for deliverables

SECURITY: this executes Claude Code unattended. Keep the allowlist tight, scope
--allowedTools, run as a low-privilege user, and prefer a sandbox/VM.
"""

import asyncio
import json
import os
import time
from pathlib import Path

import discord

# ---- Configuration (from environment; never hard-code the token) -----------
TOKEN = os.environ["DISCORD_BOT_TOKEN"]
GUILD_ID = int(os.environ["GUILD_ID"])
CHANNEL_ID = int(os.environ["CHANNEL_ID"])
ALLOWED_USER_IDS = {
    int(x) for x in os.environ.get("ALLOWED_USER_IDS", "").split(",") if x.strip()
}
WORKDIR = Path(os.environ.get("BRIDGE_WORKDIR", "~/claude-bridge-workspace")).expanduser()

# Scope what Claude may do without prompting. Widen deliberately, not blindly.
ALLOWED_TOOLS = "Read,Write,Edit,WebSearch,WebFetch,Bash(pandoc *),Bash(ls *)"
SYSTEM_PROMPT = "Save all deliverables (images, PDFs, docs) into the current working directory."
MAX_TURNS = "30"
RUN_TIMEOUT_SEC = 900  # hard cap per request

DISCORD_UPLOAD_LIMIT = 10 * 1024 * 1024  # default guild limit (~10 MB)

# Per-channel Claude session id, so follow-ups resume the same conversation.
SESSIONS: dict[int, str] = {}

# ---- Discord client with the required message-content intent ----------------
intents = discord.Intents.default()
intents.message_content = True  # must ALSO be enabled in the Developer Portal
client = discord.Client(intents=intents)


def is_authorized(message: discord.Message) -> bool:
    if message.author.bot:
        return False
    if message.guild is None or message.guild.id != GUILD_ID:
        return False
    # Allow the mapped channel and any thread whose parent is that channel.
    ch = message.channel
    parent_id = getattr(ch, "parent_id", None)
    if ch.id != CHANNEL_ID and parent_id != CHANNEL_ID:
        return False
    return message.author.id in ALLOWED_USER_IDS


def workdir_for(channel_id: int) -> Path:
    d = WORKDIR / str(channel_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def snapshot(d: Path) -> dict[str, float]:
    """Map file path -> mtime, for detecting new/changed deliverables."""
    return {str(p): p.stat().st_mtime for p in d.rglob("*") if p.is_file()}


async def run_claude(prompt: str, cwd: Path, session_id: str | None):
    """Invoke Claude Code headlessly; return (result_text, new_session_id)."""
    cmd = [
        "claude", "-p", prompt,
        "--output-format", "json",
        "--allowedTools", ALLOWED_TOOLS,
        "--append-system-prompt", SYSTEM_PROMPT,
        "--max-turns", MAX_TURNS,
    ]
    if session_id:
        cmd += ["--resume", session_id]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=RUN_TIMEOUT_SEC)
    except asyncio.TimeoutError:
        proc.kill()
        return "Run timed out.", session_id

    if proc.returncode != 0:
        return f"Claude Code error:\n```\n{stderr.decode()[:1500]}\n```", session_id

    data = json.loads(stdout.decode())
    return data.get("result", "(no result)"), data.get("session_id", session_id)


def collect_new_files(cwd: Path, before: dict[str, float]) -> list[Path]:
    files = []
    for p in cwd.rglob("*"):
        if not p.is_file():
            continue
        if before.get(str(p)) != p.stat().st_mtime:  # new or modified
            files.append(p)
    return files


@client.event
async def on_ready():
    print(f"Bridge online as {client.user} | workdir={WORKDIR}")


@client.event
async def on_message(message: discord.Message):
    if not is_authorized(message):
        return
    prompt = message.content.strip()
    if not prompt:
        return

    cwd = workdir_for(message.channel.id)
    before = snapshot(cwd)

    async with message.channel.typing():
        result_text, new_session = await run_claude(
            prompt, cwd, SESSIONS.get(message.channel.id)
        )
    if new_session:
        SESSIONS[message.channel.id] = new_session

    # Gather generated deliverables that fit Discord's upload limit.
    attachments, skipped = [], []
    for p in collect_new_files(cwd, before):
        if p.stat().st_size <= DISCORD_UPLOAD_LIMIT:
            attachments.append(discord.File(str(p)))
        else:
            skipped.append(p.name)

    # Discord messages cap at 2000 chars; chunk the text.
    body = result_text or "(done)"
    if skipped:
        body += f"\n\n(Skipped {len(skipped)} file(s) over the size limit: {', '.join(skipped)})"

    first = True
    for i in range(0, len(body), 1900):
        chunk = body[i:i + 1900]
        files = attachments if first else None
        await message.reply(chunk, files=files) if first else await message.channel.send(chunk)
        first = False
    if first and attachments:  # empty body but files exist
        await message.reply("Done.", files=attachments)


if __name__ == "__main__":
    client.run(TOKEN)
