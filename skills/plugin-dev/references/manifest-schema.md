# Claude Code plugin manifest & marketplace reference

Condensed from the official Claude Code docs. Source URLs at the bottom.

## `.claude-plugin/plugin.json` — plugin manifest

The manifest is **optional**. If omitted, Claude Code auto-discovers components in default
locations and derives the name from the directory name. If present, `name` is the only
required field. Claude Code ignores unrecognized top-level fields (they surface as warnings
in `claude plugin validate`; `--strict` turns warnings into errors). Wrong-typed fields fail.

### Required
| Field | Type | Notes |
| :-- | :-- | :-- |
| `name` | string | Unique id, kebab-case, no spaces. Becomes the namespace prefix (`/name:skill`, `name:agent`). When a marketplace entry lists the plugin under a different name, the marketplace entry name is what `enabledPlugins` keys and `/plugin` use. |

### Metadata
| Field | Type | Notes |
| :-- | :-- | :-- |
| `$schema` | string | `https://json.schemastore.org/claude-code-plugin-manifest.json`. Ignored at load; enables editor autocomplete. |
| `displayName` | string | Human-readable UI name (v2.1.143+). May contain spaces/any casing. Falls back to `name`. Not used for namespacing. |
| `version` | string | Semver. If set, pins the plugin — users update only when bumped. If omitted, git commit SHA is used (every commit = update). `plugin.json` wins over the marketplace entry. |
| `description` | string | Purpose; shown in plugin manager. |
| `author` | object | `{ name, email?, url? }`. |
| `homepage` | string | Docs URL. |
| `repository` | string | Source URL. |
| `license` | string | SPDX id (e.g. `MIT`, `Apache-2.0`). |
| `keywords` | array | Discovery tags. |
| `defaultEnabled` | boolean | `false` installs disabled until user opts in (v2.1.154+). Defaults to `true`. A user's saved `enabledPlugins` entry and dependency requirements both take precedence over this. |

### Component path fields (only needed for NON-default locations)
| Field | Type | Notes |
| :-- | :-- | :-- |
| `skills` | string\|array | Extra skill dirs (`<name>/SKILL.md`). **Adds** to default `skills/` scan. |
| `commands` | string\|array | Flat `.md` skill files/dirs. **Replaces** default `commands/`. |
| `agents` | string\|array | Agent `.md` files. **Replaces** default `agents/`. |
| `hooks` | string\|array\|object | Hook config path(s) or inline. Own merge rules (adds to `hooks/hooks.json`). |
| `mcpServers` | string\|array\|object | MCP config path(s) or inline. Own merge rules (adds to `.mcp.json`). |
| `lspServers` | string\|array\|object | LSP configs or inline. Default `.lsp.json`. |
| `outputStyles` | string\|array | **Replaces** default `output-styles/`. |
| `experimental.themes` | string\|array | **Replaces** default `themes/`. |
| `experimental.monitors` | string\|array | Background monitors. Default `monitors/monitors.json`. |
| `userConfig` | object | Values prompted at enable time (see below). |
| `channels` | array | Message-injection channels. Each entry's `server` (required) must match a key in `mcpServers`; optional per-channel `userConfig`. |
| `dependencies` | array | Other plugins required, e.g. `["helper-lib", { "name": "secrets-vault", "version": "~2.1.0" }]`. |

All custom paths must be relative to the plugin root and start with `./`. When a plugin has
both a default folder and the matching manifest key, `/doctor` and `claude plugin list` flag
the ignored folder (v2.1.140+); the plugin still loads using the manifest paths.

### `userConfig` option fields
Required per key: `type` (`string`|`number`|`boolean`|`directory`|`file`), `title`, `description`.
Optional: `sensitive` (mask + secure storage), `required`, `default`, `multiple` (string→array),
`min`/`max` (number). Substituted as `${user_config.KEY}` in MCP/LSP/hook/monitor configs
(and non-sensitive ones in skill/agent content); also exported to subprocesses as
`CLAUDE_PLUGIN_OPTION_<KEY>`. Non-sensitive values are stored in `settings.json` under
`pluginConfigs[<plugin-id>].options`; sensitive values go to the system keychain
(or `~/.claude/.credentials.json`), which has a ~2 KB shared limit — keep secrets small.

## Default component locations (auto-discovered)
| Component | Location |
| :-- | :-- |
| Manifest | `.claude-plugin/plugin.json` |
| Skills | `skills/<name>/SKILL.md` |
| Commands | `commands/*.md` (flat) |
| Agents | `agents/*.md` |
| Output styles | `output-styles/` |
| Themes | `themes/` |
| Hooks | `hooks/hooks.json` |
| MCP servers | `.mcp.json` (plugin root) |
| LSP servers | `.lsp.json` |
| Monitors | `monitors/monitors.json` |
| Executables | `bin/` (added to Bash `PATH` while enabled) |
| Settings | `settings.json` (only `agent`, `subagentStatusLine` keys supported) |

**Only `plugin.json` goes inside `.claude-plugin/`.** All other dirs are at the plugin root.
A single-skill plugin may place `SKILL.md` directly at the root (v2.1.142+), taking its
invocation name from the frontmatter `name` (else the directory basename). A root `CLAUDE.md`
is NOT loaded as context — ship instructions as a skill instead.

## Variables in configs / commands
Substituted inline in skill/agent content, hook commands, monitor commands, and MCP/LSP configs;
also exported to hook and server subprocesses.
- `${CLAUDE_PLUGIN_ROOT}` — absolute install dir of the plugin. Use for all bundled paths.
  Changes on update (old dir cleaned up ~7 days later); do not store state there. In shell-form
  hooks/monitors, wrap in double quotes.
- `${CLAUDE_PLUGIN_DATA}` — persistent per-plugin data dir that survives updates
  (`~/.claude/plugins/data/<id>/`). Use for `node_modules`, venvs, caches, generated state.
- `${CLAUDE_PROJECT_DIR}` — the user's project root.
- `${user_config.KEY}` — a `userConfig` value.
- `${ENV_VAR}` — any environment variable.

## Plugin-shipped agent restriction
Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`,
`disallowedTools`, `skills`, `memory`, `background`, and `isolation` (`"worktree"` only).
For security, `hooks`, `mcpServers`, and `permissionMode` are NOT allowed in plugin agents.

## Bundled MCP server scoped names
A plugin MCP server's tools appear as `mcp__plugin_<plugin-name>_<server-name>__<tool>`.
Hooks that match the plugin's own MCP tools must use that scoped name; an `mcp_tool` hook's
`server` field takes `plugin:<plugin-name>:<server-name>`. A matcher on the bare server key
never fires.

## `.claude-plugin/marketplace.json` — marketplace catalog

Lives at `.claude-plugin/marketplace.json` in the marketplace repo root.

### Required
| Field | Type | Notes |
| :-- | :-- | :-- |
| `name` | string | Marketplace id, kebab-case. Public-facing (`/plugin install x@name`). One marketplace per name per user (re-adding same name replaces it). Some names are reserved for Anthropic. |
| `owner` | object | `{ name (req), email? }`. |
| `plugins` | array | Plugin entries. |

### Optional marketplace fields
`$schema` (`https://json.schemastore.org/claude-code-marketplace.json`), `description`,
`version`, `metadata.pluginRoot` (base dir prepended to relative `source` paths),
`allowCrossMarketplaceDependenciesOn`, `renames` (v2.1.193+; map old plugin name → new name
or `null`, for automatic migration). `description`/`version` are also accepted under `metadata`.

### Plugin entry
Required: `name`, `source`. May also include any manifest field (`description`, `version`,
`author`, `homepage`, `repository`, `license`, `keywords`, `displayName`, `defaultEnabled`)
plus marketplace-specific `category`, `tags`, `strict`, `relevance`, and component paths
(`skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`).

`strict` (default `true`): `plugin.json` is the authority and the entry supplements it.
`strict: false`: the marketplace entry is the entire definition; the plugin needs no
`plugin.json`, and one that declares components is a conflict.

### `source` types
| Source | Form | Fields |
| :-- | :-- | :-- |
| Relative path | `"./plugins/x"` (must start with `./`) | resolved from marketplace root, no `..` |
| `github` | object | `repo` (req), `ref?`, `sha?` |
| `url` | object | `url` (req, git URL), `ref?`, `sha?` |
| `git-subdir` | object | `url` (req), `path` (req), `ref?`, `sha?` (sparse monorepo clone) |
| `npm` | object | `package` (req), `version?`, `registry?` |

When both `ref` and `sha` are set, `sha` is the effective pin. Relative-path sources only work
when the marketplace is added from git or a local dir — a URL-only marketplace downloads just
`marketplace.json`, so use github/url/npm sources there.

## Install & distribute commands
```bash
# Local dev
claude --plugin-dir ./my-plugin          # load without install (also .zip on v2.1.128+)
claude --plugin-url https://.../x.zip     # load a hosted zip for the session
claude plugin init my-tool                # scaffold an auto-loading skills-dir plugin
                                          #   --with skills agents hooks mcp lsp output-style channel
claude plugin validate ./my-plugin        # validate (--strict = warnings as errors)
claude plugin validate .                  # from a marketplace dir: validate marketplace.json + entries
/reload-plugins                           # pick up hook/MCP/agent changes in-session

# Marketplace flow (users)
/plugin marketplace add your-org/your-repo   # or a git URL, ./local path, or URL to marketplace.json
/plugin marketplace update
/plugin install my-plugin@your-marketplace   # --scope user|project|local
```

## Version resolution order
1. `version` in `plugin.json`
2. `version` in the marketplace entry
3. git commit SHA (github/url/git-subdir/relative-path in a git marketplace)
4. `unknown` (npm sources or non-git local dirs)

Explicit `version` → users update only when bumped (published plugins). Omit `version` →
update on every commit (internal, fast-moving plugins). Don't set `version` in both places —
`plugin.json` silently wins.

## Troubleshooting: the 10 most common validation & loading errors

Diagnose with `claude plugin validate ./my-plugin` (add `--strict` to promote warnings to
errors) and `claude --debug` (shows plugin loading, manifest errors, component registration,
and MCP server initialization). See `worked-example.md` for a known-good plugin to diff against.

### 1. `plugin.json` at the wrong path
- **Symptom**: Plugin doesn't load at all, or loads under an auto-derived name ignoring your manifest.
- **Cause**: Manifest at `my-plugin/plugin.json` (root) or `my-plugin/.claude/plugin.json` instead of `my-plugin/.claude-plugin/plugin.json`.
- **Fix**: `mkdir .claude-plugin && mv plugin.json .claude-plugin/`. The only file that belongs inside `.claude-plugin/` is `plugin.json` (plus `marketplace.json` in a marketplace repo root).

### 2. Components nested inside `.claude-plugin/`
- **Symptom**: Plugin loads (shows in `/plugin`) but its skills/commands/agents/hooks are missing.
- **Cause**: `skills/`, `commands/`, `agents/`, `hooks/`, or `.mcp.json` placed inside `.claude-plugin/`. They must sit at the plugin root.
- **Fix**: Move them up one level, next to `.claude-plugin/`. Then `/reload-plugins`.

### 3. Manifest or frontmatter fails to parse
- **Symptom**: `Invalid JSON syntax: Unexpected token ...`, `Validation errors: name: Required`, "corrupt manifest" on load — or, for command/skill `.md` files, `YAML frontmatter failed to parse ... At runtime this command loads with empty metadata (all frontmatter fields silently dropped)`.
- **Cause**: Trailing comma / unquoted string in JSON (no comments except string-valued `"//"` keys), missing `name`, a wrong-typed field (e.g. `keywords` as a string) — or invalid YAML in frontmatter, classically an unquoted `argument-hint: [a] [b]` (two adjacent flow sequences).
- **Fix**: `jq . .claude-plugin/plugin.json` to find the JSON error; quote bracketed frontmatter values (`argument-hint: "[a] [b]"`); then `claude plugin validate --strict`. `name` must be kebab-case with no spaces.

### 4. Hardcoded paths instead of `${CLAUDE_PLUGIN_ROOT}`
- **Symptom**: Hook/MCP server works on your machine (or via `--plugin-dir`) but breaks for installed users, or stops working after a plugin update.
- **Cause**: Relative paths (`./scripts/x.sh`) or absolute paths (`/Users/me/...`) in `.mcp.json` / `hooks.json`. Installed plugins run from a cache dir that moves on every update.
- **Fix**: Prefix every bundled-file reference with `${CLAUDE_PLUGIN_ROOT}`. In shell-form hook commands wrap it in escaped double quotes: `"\"${CLAUDE_PLUGIN_ROOT}\"/scripts/x.sh"`.

### 5. MCP server not starting / tools not appearing
- **Symptom**: No `mcp__plugin_...` tools; `/mcp` or `claude --debug` shows a failed/timed-out server.
- **Cause**: `command` binary not on PATH, script path missing `${CLAUDE_PLUGIN_ROOT}`, the server crashing on boot, or it never answering `initialize` on stdout (stray `console.log` output corrupts the stdio protocol).
- **Fix**: Run the server manually and pipe it an `initialize` request (see worked-example.md §7); it must reply with one JSON-RPC line. Log to **stderr** only. Then check `claude --debug` init output, and remember plugin MCP servers need per-server approval on first use.

### 6. Hook never fires
- **Symptom**: Event happens, script doesn't run; no error shown.
- **Cause** (in observed order): script not executable; wrong event-name case (`postToolUse`); matcher regex not matching the tool (`bash` vs `Bash`); invalid `hooks.json`; edited hooks not reloaded.
- **Fix**: `chmod +x scripts/*.sh`; event names are case-sensitive (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, ...); test the script standalone with sample JSON on stdin; run `/reload-plugins` after edits.

### 7. Hook on the plugin's own MCP tools uses the bare name
- **Symptom**: A matcher like `"incident-api"` or `"mcp__incident-api__create_incident"` never fires for the plugin's bundled server.
- **Cause**: Plugin MCP tools are scoped: `mcp__plugin_<plugin-name>_<server-name>__<tool>`.
- **Fix**: Match the full scoped name (e.g. `mcp__plugin_incident-tools_incident-api__create_incident`); an `mcp_tool` hook's `server` field takes `plugin:<plugin-name>:<server-name>`.

### 8. Command/skill name expectations & collisions
- **Symptom**: `/deploy` "not found" though the plugin ships it; or two sources of the same name behave unexpectedly.
- **Cause**: Plugin skills are always namespaced — the plugin's is `/my-plugin:deploy`; bare `/deploy` is a project/user skill. Same-named `.claude/agents/` definitions override plugin agents; a `--plugin-dir` plugin with the same name as an installed one takes precedence for the session.
- **Fix**: Invoke via `/plugin-name:skill-name` (check `/help` for the actual name). After migrating standalone config into a plugin, delete the originals from `.claude/` to avoid shadowing.

### 9. Custom component paths wrong, or defaults silently dropped
- **Symptom**: `Warning: No commands found in plugin ... custom directory`, "Path errors", or default-dir components vanish after adding a manifest key.
- **Cause**: Custom paths must be relative to the plugin root and start with `./` (absolute paths are invalid). `commands`/`agents`/`outputStyles` keys **replace** the default directory scan (`skills` adds to it).
- **Fix**: Use `"./dir/"` form. To keep defaults plus extras, list both: `"commands": ["./commands/", "./extras/"]`. `/doctor` flags a default folder being ignored because of a manifest key (v2.1.140+).

### 10. Users never receive your updates (or `Plugin directory not found`)
- **Symptom**: You push commits but `/plugin update` says "already at the latest version"; or installs fail with `Plugin directory not found at path: ./plugins/x`.
- **Cause**: `version` set in `plugin.json` but never bumped (the version string is the cache key); or the marketplace entry's `source` path doesn't match the repo layout (e.g. `metadata.pluginRoot` **and** a `./plugins/...` source — the root is prepended, doubling the prefix); or a relative-path source in a marketplace added by bare URL (only `marketplace.json` is downloaded).
- **Fix**: Bump `version` on every release or omit it entirely (git SHA versioning); set `version` in only one place — `plugin.json` silently wins. With `pluginRoot: "./plugins"` write `"source": "x"`, without it write `"source": "./plugins/x"`. Validate from the marketplace repo root: `claude plugin validate .`.

## Sources
- https://code.claude.com/docs/en/plugins
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-marketplaces
