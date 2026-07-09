---
name: plugin-dev
description: Builds advanced Claude Code plugins that bundle commands, skills, agents, hooks, and MCP servers (API / internal-system integrations) behind a .claude-plugin/plugin.json manifest, then distributes them via a marketplace.json catalog or a ZIP archive. Use when the user wants to build a plugin, scaffold or fix plugin.json, wire an MCP server into a plugin, create a plugin marketplace, or bundle in-house tooling into one shareable, versioned package.
---

# Plugin Dev

## Overview

A Claude Code **plugin** is a self-contained directory that extends Claude Code with reusable functionality: skills, agents, hooks, MCP servers, LSP servers, background monitors, output styles, and themes. A single manifest, `.claude-plugin/plugin.json`, describes it. Because a plugin can bundle **MCP servers** (external tool / API connections) alongside the **skills, commands, and agents** that drive them, it is the right unit for packaging an in-house tool that integrates with an internal system and sharing it across a team — as a git-hosted marketplace or as a `.zip` archive.

Use a plugin (not standalone `.claude/` config) when you want to: share functionality with a team or community, reuse the same skills/agents across projects, ship versioned releases, or connect Claude Code to internal systems via bundled MCP servers. Plugin skills are namespaced (`/plugin-name:skill-name`) to prevent conflicts.

## When to use this skill

Trigger this skill when the user asks to:
- Build, scaffold, or structure a Claude Code plugin
- Write or fix a `.claude-plugin/plugin.json` manifest
- Bundle an MCP server / API integration into a plugin (in-house internal-system tooling)
- Combine commands + skills + agents + hooks + MCP into one shareable package
- Create a plugin marketplace (`marketplace.json`) or a distributable ZIP

## Plugin anatomy

Only `plugin.json` lives inside `.claude-plugin/`. **Every other directory sits at the plugin root** — a common mistake is nesting `skills/` or `.mcp.json` inside `.claude-plugin/`, which breaks the plugin. The plugin root is the plugin's own directory (the one holding `.claude-plugin/plugin.json`); it is never `~/.claude/`.

```text
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED manifest (the only file in here)
├── skills/                  # skills as <name>/SKILL.md dirs (model-invoked)
│   └── deploy/SKILL.md
├── commands/                # flat .md skill files (prefer skills/ for new work)
├── agents/                  # subagent .md definitions
├── hooks/hooks.json         # event handlers (PreToolUse, PostToolUse, ...)
├── .mcp.json                # MCP server definitions (external tools/APIs)
├── .lsp.json                # optional: language servers
├── monitors/monitors.json   # optional: background monitors (experimental)
├── bin/                     # optional: executables added to Bash PATH while enabled
├── settings.json            # optional: only `agent` + `subagentStatusLine` keys apply
├── scripts/                 # helper scripts referenced via ${CLAUDE_PLUGIN_ROOT}
├── README.md                # install + usage docs
├── LICENSE
└── CHANGELOG.md
```

Components in these default locations are auto-discovered — the manifest only needs to point at components in **non-default** paths. A single-skill plugin may place `SKILL.md` at the root (its invocation name comes from the frontmatter `name`). A root `CLAUDE.md` is **not** loaded as context — ship instructions as a skill instead. See `references/manifest-schema.md` for every field.

### Manifest fields (`.claude-plugin/plugin.json`)

The manifest is optional; if omitted, components are auto-discovered and the name is derived from the directory. If present, `name` (kebab-case, no spaces; it becomes the namespace prefix) is the only required field. Common fields:

| Field | Purpose |
| :-- | :-- |
| `name` | Unique id + skill namespace (`/name:skill`). Required. |
| `displayName` | Human-readable UI name (v2.1.143+); falls back to `name`. Not used for namespacing. |
| `version` | Semver string. If set, users only update when you **bump it**. Omit to use the git commit SHA (every commit = update). |
| `description` | Shown in the plugin manager. |
| `author` | `{ name, email?, url? }`. |
| `homepage`, `repository`, `license`, `keywords` | Metadata / discovery. |
| `mcpServers` | Inline MCP config or path(s) — merged with the auto-loaded `.mcp.json`. |
| `commands`, `agents`, `skills`, `hooks`, `lspServers`, `outputStyles` | Only for custom (non-default) paths. `skills` **adds** to the default scan; `commands`/`agents`/`outputStyles` **replace** their default dir. |
| `experimental.themes`, `experimental.monitors` | Custom paths for themes / background monitors. |
| `userConfig` | Values Claude Code prompts for at enable time (API endpoints, tokens). |
| `channels` | Message-injection channels, each bound to a plugin MCP server (`server` key). |
| `dependencies` | Other plugins required, e.g. `[{ "name": "secrets-vault", "version": "~2.1.0" }]`. |
| `defaultEnabled` | `false` ships the plugin installed-but-disabled (v2.1.154+; good for plugins that hit external services). |

Claude Code ignores unrecognized top-level fields (surfaced as warnings by `claude plugin validate`; `--strict` promotes them to errors). Wrong-typed fields (e.g. `keywords` as a string) fail to load.

### Bundled MCP servers (the API / internal-system integration)

An MCP server is what lets the plugin talk to an internal system or external API. Define it in `.mcp.json` at the plugin root (auto-loaded), or inline under `mcpServers` in the manifest. Plugin MCP servers **start automatically when the plugin is enabled** and appear as standard MCP tools.

Always reference bundled files with `${CLAUDE_PLUGIN_ROOT}` (the absolute install path — it changes on update, so never hardcode paths and never write state there). For state/dependencies that must survive updates (a `node_modules`, a venv, a cache), use `${CLAUDE_PLUGIN_DATA}`. Prompt for secrets via `userConfig` and inject them as `${user_config.KEY}` rather than committing tokens.

```json
{
  "mcpServers": {
    "internal-api": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/api-server.js"],
      "env": {
        "API_ENDPOINT": "${user_config.api_endpoint}",
        "API_TOKEN": "${user_config.api_token}"
      }
    },
    "remote-http": {
      "type": "http",
      "url": "https://mcp.internal.example.com"
    }
  }
}
```

MCP servers a plugin declares go through the same per-server approval as a project `.mcp.json`. A hook that targets the plugin's **own** bundled MCP server must use the scoped tool name `mcp__plugin_<plugin-name>_<server-name>__<tool>` (and an `mcp_tool` hook's `server` field takes `plugin:<plugin-name>:<server-name>`). See `templates/.mcp.json` and `templates/plugin.json`.

## Step-by-step

### 1. Scaffold
Fastest: `claude plugin init my-tool` scaffolds `~/.claude/skills/my-tool/` with a manifest + starter SKILL.md that auto-loads next session as `my-tool@skills-dir` (no marketplace). Add starter components with `--with skills agents hooks mcp lsp`. For a distributable plugin, create the tree by hand:
```bash
mkdir -p my-plugin/.claude-plugin my-plugin/skills my-plugin/servers
```

### 2. Write the manifest
Create `my-plugin/.claude-plugin/plugin.json` from `templates/plugin.json`. Keep it minimal — set `name`, `description`, `version`, `author`. Add component-path or `userConfig` fields only as needed.

### 3. Add components
- **Skills**: `skills/<name>/SKILL.md` with YAML frontmatter (`description` tells Claude when to use it). Model-invoked automatically.
- **Commands**: flat `.md` files in `commands/` for explicit `/name:cmd` shortcuts.
- **Agents**: `.md` files in `agents/`. Note: plugin agents may **not** declare `hooks`, `mcpServers`, or `permissionMode`; `isolation` only accepts `"worktree"`.
- **Hooks**: `hooks/hooks.json` (same schema as `.claude/settings.json` hooks). Reference scripts as `"${CLAUDE_PLUGIN_ROOT}"/scripts/x.sh` (quote it in shell-form commands).

### 4. Add MCP servers
Create `.mcp.json` at the plugin root (see template). Use `${CLAUDE_PLUGIN_ROOT}` for bundled server paths and `${user_config.*}` for endpoints/secrets declared in `userConfig`. Each `userConfig` value is also exported to subprocesses as `CLAUDE_PLUGIN_OPTION_<KEY>`.

### 5. Test / install locally
```bash
claude --plugin-dir ./my-plugin        # load without installing (also accepts a .zip, v2.1.128+)
claude plugin validate ./my-plugin     # validate; add --strict for CI
```
After edits run `/reload-plugins` (SKILL.md changes apply live; hooks/MCP/agents need a reload or restart; monitors need a session restart). Verify: `/my-plugin:skill-name`, agents under `/context`, hooks fire, MCP tools appear. `claude --debug` shows plugin load + MCP init errors.

### 6. Package & distribute

**Marketplace (recommended for teams).** Create `.claude-plugin/marketplace.json` in a repo listing your plugin(s), push to GitHub/GitLab. Users run:
```bash
/plugin marketplace add your-org/your-repo
/plugin install my-plugin@your-marketplace
```
Host in a **private repo** to keep it internal (auth via git credential helpers; set `GITHUB_TOKEN`/`GITLAB_TOKEN` for background auto-updates). See `templates/marketplace.json`.

**ZIP (quick sharing, no repo).** Zip the plugin directory and share the file. Recipients load it with `claude --plugin-dir ./my-plugin.zip` (v2.1.128+), or serve it and use `claude --plugin-url https://.../my-plugin.zip`. Use `scripts/package.sh` to build the archive.

## Versioning & sharing tips

- **Version resolution order**: `version` in `plugin.json` → `version` in the marketplace entry → git commit SHA → `unknown` (npm / non-git local). `plugin.json` wins over the marketplace entry, so don't set `version` in both.
- **Explicit `version`** (semver) for published plugins with release cycles — you must bump it on every release or users won't update. **Omit `version`** for fast-iterating internal plugins so each git commit ships automatically.
- Keep a `CHANGELOG.md`; follow semver (MAJOR breaking / MINOR feature / PATCH fix).
- Never hardcode absolute paths — always `${CLAUDE_PLUGIN_ROOT}`. Don't write state there (replaced on update; old dir cleaned up ~7 days later); use `${CLAUDE_PLUGIN_DATA}` for persistence.
- Never commit secrets; use `userConfig` with `"sensitive": true` (masked, stored in the keychain, injected as `${user_config.KEY}`).
- A plugin's cache copy can't reference files outside its own directory (`../shared`); symlinks that resolve within the same marketplace are dereferenced into the cache.
- Run `claude plugin validate --strict` in CI before publishing.

## Worked example manifest

`.claude-plugin/plugin.json` for a plugin that bundles a skill, an agent, hooks, and an MCP server connecting to an internal API:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "acme-deploy",
  "displayName": "ACME Deploy Tools",
  "version": "1.2.0",
  "description": "Deploy automation with an MCP bridge to ACME's internal release API",
  "author": { "name": "DevTools Team", "email": "devtools@acme.example" },
  "homepage": "https://docs.acme.example/deploy",
  "repository": "https://github.com/acme/deploy-plugin",
  "license": "Apache-2.0",
  "keywords": ["deployment", "ci-cd", "internal"],
  "userConfig": {
    "api_endpoint": {
      "type": "string",
      "title": "Release API endpoint",
      "description": "Base URL of the internal release API",
      "required": true
    },
    "api_token": {
      "type": "string",
      "title": "API token",
      "description": "Service token for the release API",
      "sensitive": true
    }
  }
}
```

With `.mcp.json`, `skills/`, `agents/`, and `hooks/hooks.json` in default locations, no extra path fields are needed — they're auto-discovered.

## Sources

- Create plugins — https://code.claude.com/docs/en/plugins
- Plugins reference (manifest schema, MCP servers, versioning, CLI) — https://code.claude.com/docs/en/plugins-reference
- Create and distribute a plugin marketplace — https://code.claude.com/docs/en/plugin-marketplaces
