# Worked example: the `incident-tools` plugin, from zero to distributed

A complete, runnable walkthrough that builds one realistic plugin containing **1 command,
1 skill, 1 hook, and 1 MCP server** (a dependency-free Node stdio script), tests it locally,
and ships it both ways (git marketplace and ZIP). Every file below is shown in full and is
valid as written. All field names verified against the official docs (links at the bottom).

**What it does:** `/incident-tools:declare sev2 API latency spike` opens an incident record
via a bundled MCP server; a `postmortem` skill lets Claude write up resolved incidents; a
`PostToolUse` hook appends an audit-log line whenever an incident is declared.

## 0. Final layout

```text
incident-tools/
├── .claude-plugin/
│   └── plugin.json              # manifest — the ONLY file in .claude-plugin/
├── commands/
│   └── declare.md               # user-invoked: /incident-tools:declare
├── skills/
│   └── postmortem/
│       └── SKILL.md             # model-invoked when a postmortem is needed
├── hooks/
│   └── hooks.json               # PostToolUse audit hook
├── scripts/
│   └── log-incident.sh          # hook script (must be chmod +x)
├── servers/
│   └── incident-server.js       # stdio MCP server, no npm dependencies
├── .mcp.json                    # wires up the MCP server (plugin ROOT, not .claude-plugin/)
└── README.md
```

Everything except `plugin.json` sits at the **plugin root**. All components use default
locations, so the manifest needs **no** `commands`/`skills`/`hooks`/`mcpServers` path fields —
they are auto-discovered.

```bash
mkdir -p incident-tools/.claude-plugin incident-tools/commands \
         incident-tools/skills/postmortem incident-tools/hooks \
         incident-tools/scripts incident-tools/servers
```

## 1. Manifest — `.claude-plugin/plugin.json`

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "incident-tools",
  "displayName": "Incident Tools",
  "version": "0.1.0",
  "description": "Declare, track, and write up production incidents from inside Claude Code",
  "author": { "name": "Platform Team", "email": "platform@example.com" },
  "license": "MIT",
  "keywords": ["incidents", "ops", "internal"]
}
```

`name` sets the namespace: the command becomes `/incident-tools:declare`. Setting `version`
means users only get updates when you **bump it** — for a fast-moving internal plugin, omit
`version` so every git commit ships (see version resolution in `manifest-schema.md`).

## 2. Command — `commands/declare.md`

Flat `.md` files in `commands/` are user-invoked skills. `disable-model-invocation: true`
keeps Claude from declaring incidents on its own; `$ARGUMENTS` captures the text typed after
the command name. Note the **quotes around `argument-hint`**: an unquoted `[a] [b]` is
invalid YAML, and broken frontmatter is silently dropped at runtime (the command loads with
no metadata) — `claude plugin validate` catches it.

```markdown
---
description: Declare a new production incident and record it via the incident-api MCP server
argument-hint: "[sev1|sev2|sev3] [title]"
disable-model-invocation: true
---

Declare a production incident from: $ARGUMENTS

1. Parse the severity (sev1, sev2, or sev3) and the title from the arguments above.
   If either is missing, ask for it before proceeding.
2. Call the `create_incident` tool (from this plugin's bundled `incident-api` MCP
   server) with the severity and title.
3. Report the incident id the server returns.
4. Offer to start an incident timeline file in the project.
```

## 3. Skill — `skills/postmortem/SKILL.md`

Directory name = skill name (`/incident-tools:postmortem`). No `disable-model-invocation`,
so Claude also loads it automatically when the `description` matches the task.

```markdown
---
description: Write a blameless postmortem for a resolved incident. Use when the user asks for a postmortem, incident review, retro, or incident write-up.
---

# Postmortem writer

1. Call the `list_incidents` tool from the bundled `incident-api` MCP server. If the
   user didn't name an incident, ask which one to write up.
2. Gather context from the repository: recent commits around the incident window,
   related config changes, and any timeline notes.
3. Write `postmortems/<yyyy-mm-dd>-<slug>.md` with these sections: Summary, Impact,
   Timeline, Root cause, What went well, What went poorly, Action items (each with an
   owner and due date).
4. Keep it blameless: name systems and processes, never people.
```

## 4. MCP server

### 4a. `.mcp.json` (plugin root)

```json
{
  "mcpServers": {
    "incident-api": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/incident-server.js"],
      "env": {
        "INCIDENTS_FILE": "${CLAUDE_PLUGIN_DATA}/incidents.json"
      }
    }
  }
}
```

Two rules demonstrated: bundled files are referenced via `${CLAUDE_PLUGIN_ROOT}` (the install
path changes on every update), and **state** lives in `${CLAUDE_PLUGIN_DATA}` (survives
updates). The server starts automatically when the plugin is enabled; its tools appear as
`mcp__plugin_incident-tools_incident-api__create_incident` and `..._list_incidents`.

### 4b. `servers/incident-server.js`

A stdio MCP server is just a process that speaks JSON-RPC 2.0, one message per line, on
stdin/stdout. This one needs no `npm install` (for servers with dependencies, install them
into `${CLAUDE_PLUGIN_DATA}` from a `SessionStart` hook and point `NODE_PATH` at it — see
the persistent-data pattern in the plugins reference).

```javascript
#!/usr/bin/env node
// Minimal dependency-free MCP stdio server: two tools backed by a JSON file.
// Speaks JSON-RPC 2.0, one message per line, over stdin/stdout.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

// Set by .mcp.json to ${CLAUDE_PLUGIN_DATA}/incidents.json so state
// survives plugin updates (never write state to CLAUDE_PLUGIN_ROOT).
const FILE = process.env.INCIDENTS_FILE || path.join(process.cwd(), "incidents.json");

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; }
}
function save(incidents) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(incidents, null, 2));
}

const TOOLS = [
  {
    name: "create_incident",
    description: "Open a new incident record with a title and severity",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "One-line incident summary" },
        severity: { type: "string", enum: ["sev1", "sev2", "sev3"] }
      },
      required: ["title", "severity"]
    }
  },
  {
    name: "list_incidents",
    description: "List all recorded incidents, newest first",
    inputSchema: { type: "object", properties: {} }
  }
];

function callTool(name, args) {
  if (name === "create_incident") {
    const incidents = load();
    const incident = {
      id: "INC-" + String(incidents.length + 1).padStart(4, "0"),
      title: args.title,
      severity: args.severity,
      status: "open",
      declaredAt: new Date().toISOString()
    };
    incidents.push(incident);
    save(incidents);
    return "Declared " + incident.id + " (" + incident.severity + "): " + incident.title;
  }
  if (name === "list_incidents") {
    const incidents = load().slice().reverse();
    return incidents.length ? JSON.stringify(incidents, null, 2) : "No incidents recorded.";
  }
  throw new Error("Unknown tool: " + name);
}

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { return; }
  if (req.id === undefined) return; // notification (e.g. notifications/initialized)

  try {
    if (req.method === "initialize") {
      send({ jsonrpc: "2.0", id: req.id, result: {
        protocolVersion: req.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: "incident-api", version: "0.1.0" }
      } });
    } else if (req.method === "tools/list") {
      send({ jsonrpc: "2.0", id: req.id, result: { tools: TOOLS } });
    } else if (req.method === "tools/call") {
      const text = callTool(req.params.name, req.params.arguments || {});
      send({ jsonrpc: "2.0", id: req.id, result: { content: [{ type: "text", text: text }] } });
    } else {
      send({ jsonrpc: "2.0", id: req.id,
        error: { code: -32601, message: "Method not found: " + req.method } });
    }
  } catch (err) {
    send({ jsonrpc: "2.0", id: req.id,
      error: { code: -32603, message: String(err && err.message || err) } });
  }
});
```

## 5. Hook

### 5a. `hooks/hooks.json`

The hook fires after every successful `create_incident` call. Two gotchas demonstrated:
the matcher must use the **scoped** MCP tool name (`mcp__plugin_<plugin>_<server>__<tool>` —
a matcher on a bare `incident-api` never fires), and in shell-form commands
`${CLAUDE_PLUGIN_ROOT}` must be wrapped in escaped double quotes.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__plugin_incident-tools_incident-api__create_incident",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}\"/scripts/log-incident.sh"
          }
        ]
      }
    ]
  }
}
```

### 5b. `scripts/log-incident.sh`

```bash
#!/usr/bin/env bash
# PostToolUse hook: append an audit line each time an incident is declared.
# Hook input arrives as JSON on stdin. CLAUDE_PLUGIN_DATA is exported to
# hook processes, so state written here survives plugin updates.
set -euo pipefail
mkdir -p "${CLAUDE_PLUGIN_DATA}"
{
  printf '%s ' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq -c '.tool_input' 2>/dev/null || echo '{}'
} >> "${CLAUDE_PLUGIN_DATA}/audit.log"
```

Make it executable — the single most common reason hooks silently don't run:

```bash
chmod +x incident-tools/scripts/log-incident.sh
```

## 6. `README.md`

```markdown
# Incident Tools

Declare, track, and write up production incidents from inside Claude Code.

## Install
/plugin marketplace add your-org/incident-plugins
/plugin install incident-tools@platform-plugins

## Use
- `/incident-tools:declare sev2 API latency spike` — open an incident
- Ask for "a postmortem for INC-0001" — Claude uses the postmortem skill
- Audit log: `~/.claude/plugins/data/<plugin-id>/audit.log`
```

## 7. Local test loop

```bash
# 1. Static validation (add --strict in CI: warnings become errors)
claude plugin validate ./incident-tools

# 2. Smoke-test the MCP server outside Claude Code — it must answer initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | node incident-tools/servers/incident-server.js

# 3. Load without installing
claude --plugin-dir ./incident-tools
```

Inside the session:

1. `/help` — `declare` and `postmortem` listed under the `incident-tools` namespace.
2. `/incident-tools:declare sev2 API latency spike` — Claude calls `create_incident`;
   approve the MCP server when prompted (plugin servers go through normal MCP approval).
3. After the tool call, check the hook fired:
   `cat ~/.claude/plugins/data/*/audit.log` (exact dir = plugin id, e.g. `incident-tools`).
4. Say "write a postmortem for that incident" — the skill should activate on its own.

Iterating: `SKILL.md` edits apply live; after changing `hooks/`, `.mcp.json`, `agents/`,
or `commands/`, run `/reload-plugins` (or restart). If something doesn't appear, start
`claude --debug` and read the plugin-load and MCP-init lines; see the troubleshooting
table in `manifest-schema.md`.

## 8. Distribution path A — git marketplace (recommended for teams)

Create a repo (private for internal use) with the plugin and a catalog:

```text
incident-plugins/                     # git repo root
├── .claude-plugin/
│   └── marketplace.json              # catalog — this exact path, at the REPO root
└── plugins/
    └── incident-tools/               # the whole plugin dir from above
```

`.claude-plugin/marketplace.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "platform-plugins",
  "owner": { "name": "Platform Team", "email": "platform@example.com" },
  "metadata": {
    "description": "Platform team's internal Claude Code plugins"
  },
  "plugins": [
    {
      "name": "incident-tools",
      "source": "./plugins/incident-tools",
      "description": "Declare, track, and write up production incidents",
      "category": "ops",
      "tags": ["incidents", "internal"]
    }
  ]
}
```

Do **not** repeat `version` here — `plugin.json` already sets it and silently wins.
Validate the whole catalog from the repo root, then push:

```bash
cd incident-plugins
claude plugin validate .      # validates marketplace.json + every entry
git init && git add -A && git commit -m "platform-plugins marketplace"
git remote add origin git@github.com:your-org/incident-plugins.git
git push -u origin main
```

Users install with:

```text
/plugin marketplace add your-org/incident-plugins
/plugin install incident-tools@platform-plugins
```

(or non-interactively: `claude plugin install incident-tools@platform-plugins --scope project`
to share via the project's `.claude/settings.json`). Ship an update by committing changes
**and bumping `version`** in `plugin.json` (or drop `version` entirely so every commit is an
update); users pick it up via `/plugin marketplace update` or background auto-update.

## 9. Distribution path B — ZIP (no repo needed)

```bash
skills/plugin-dev/scripts/package.sh ./incident-tools
# -> validates, then writes ./incident-tools-0.1.0.zip
```

Recipients either load the file directly (Claude Code v2.1.128+):

```bash
claude --plugin-dir ./incident-tools-0.1.0.zip
```

or, if you host it (internal file server, CI artifact), load it by URL for one session:

```bash
claude --plugin-url https://ci.example.com/artifacts/incident-tools-0.1.0.zip
```

ZIPs are a point-in-time snapshot — no update channel. For anything long-lived, use path A.

## Sources

- https://code.claude.com/docs/en/plugins (quickstart, structure, local testing)
- https://code.claude.com/docs/en/plugins-reference (hooks/MCP schemas, variables, CLI)
- https://code.claude.com/docs/en/plugin-marketplaces (catalog schema, hosting)
- https://code.claude.com/docs/en/skills (command/skill frontmatter, $ARGUMENTS)
