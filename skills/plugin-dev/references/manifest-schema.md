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
| `name` | string | Unique id, kebab-case, no spaces. Becomes the namespace prefix (`/name:skill`, `name:agent`). |

### Metadata
| Field | Type | Notes |
| :-- | :-- | :-- |
| `$schema` | string | `https://json.schemastore.org/claude-code-plugin-manifest.json`. Ignored at load; enables editor autocomplete. |
| `displayName` | string | Human-readable UI name (v2.1.143+). Falls back to `name`. Not used for namespacing. |
| `version` | string | Semver. If set, pins the plugin — users update only when bumped. If omitted, git commit SHA is used (every commit = update). `plugin.json` wins over the marketplace entry. |
| `description` | string | Purpose; shown in plugin manager. |
| `author` | object | `{ name, email?, url? }`. |
| `homepage` | string | Docs URL. |
| `repository` | string | Source URL. |
| `license` | string | SPDX id (e.g. `MIT`, `Apache-2.0`). |
| `keywords` | array | Discovery tags. |
| `defaultEnabled` | boolean | `false` installs disabled until user opts in (v2.1.154+). Good for plugins that hit external services. |

### Component path fields (only needed for NON-default locations)
| Field | Type | Notes |
| :-- | :-- | :-- |
| `skills` | string\|array | Extra skill dirs (`<name>/SKILL.md`). Adds to default `skills/` scan. |
| `commands` | string\|array | Flat `.md` skill files/dirs. Replaces default `commands/`. |
| `agents` | string\|array | Agent `.md` files. Replaces default `agents/`. |
| `hooks` | string\|array\|object | Hook config path(s) or inline. Adds to default `hooks/hooks.json`. |
| `mcpServers` | string\|array\|object | MCP config path(s) or inline. Adds to default `.mcp.json`. |
| `lspServers` | string\|array\|object | LSP configs. Default `.lsp.json`. |
| `outputStyles` | string\|array | Replaces default `output-styles/`. |
| `experimental.themes` | string\|array | Replaces default `themes/`. |
| `experimental.monitors` | string\|array | Background monitors. Default `monitors/monitors.json`. |
| `userConfig` | object | Values prompted at enable time (see below). |
| `channels` | array | Message-injection channels bound to a plugin MCP server. |
| `dependencies` | array | Other plugins required, e.g. `[{ "name": "secrets-vault", "version": "~2.1.0" }]`. |

### `userConfig` option fields
`type` (string|number|boolean|directory|file), `title`, `description` are required per key.
Optional: `sensitive` (mask + keychain), `required`, `default`, `multiple` (string→array),
`min`/`max` (number). Substituted as `${user_config.KEY}` in MCP/LSP/hook/monitor configs
(and non-sensitive ones in skill/agent content); also exported as `CLAUDE_PLUGIN_OPTION_<KEY>`.

## Default component locations (auto-discovered)
| Component | Location |
| :-- | :-- |
| Manifest | `.claude-plugin/plugin.json` |
| Skills | `skills/<name>/SKILL.md` |
| Commands | `commands/*.md` (flat) |
| Agents | `agents/*.md` |
| Hooks | `hooks/hooks.json` |
| MCP servers | `.mcp.json` (plugin root) |
| LSP servers | `.lsp.json` |
| Monitors | `monitors/monitors.json` |
| Executables | `bin/` (added to Bash `PATH` while enabled) |
| Settings | `settings.json` (only `agent`, `subagentStatusLine` keys supported) |

**Only `plugin.json` goes inside `.claude-plugin/`.** All other dirs are at the plugin root.
A single-skill plugin may place `SKILL.md` directly at the root. A root `CLAUDE.md` is NOT
loaded as context — ship instructions as a skill instead.

## Variables in configs / commands
- `${CLAUDE_PLUGIN_ROOT}` — absolute install dir of the plugin. Use for all bundled paths.
  Changes on update; do not store state there. In shell-form hooks/monitors, wrap in quotes.
- `${CLAUDE_PLUGIN_DATA}` — persistent per-plugin data dir.
- `${CLAUDE_PROJECT_DIR}` — the user's project dir.
- `${user_config.KEY}` — a `userConfig` value.
- `${ENV_VAR}` — any environment variable.

## Plugin-shipped agent restriction
Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`,
`disallowedTools`, `skills`, `memory`, `background`, `isolation` (`"worktree"` only).
For security, `hooks`, `mcpServers`, and `permissionMode` are NOT allowed in plugin agents.

## `.claude-plugin/marketplace.json` — marketplace catalog

### Required
| Field | Type | Notes |
| :-- | :-- | :-- |
| `name` | string | Marketplace id, kebab-case. Public-facing (`/plugin install x@name`). One marketplace per name per user. Some names are reserved for Anthropic. |
| `owner` | object | `{ name (req), email? }`. |
| `plugins` | array | Plugin entries. |

### Optional marketplace fields
`$schema`, `description`, `version`, `metadata.pluginRoot` (base dir prepended to relative
`source` paths), `allowCrossMarketplaceDependenciesOn`, `renames` (v2.1.193+).

### Plugin entry
Required: `name`, `source`. May also include any manifest field (`description`, `version`,
`author`, etc.) plus marketplace-specific `category`, `tags`, `strict`, `relevance`,
`displayName`, `defaultEnabled`, and component paths (`skills`, `commands`, `agents`,
`hooks`, `mcpServers`, `lspServers`).

### `source` types
| Source | Form | Fields |
| :-- | :-- | :-- |
| Relative path | `"./plugins/x"` (must start with `./`) | resolved from marketplace root |
| `github` | object | `repo`, `ref?`, `sha?` |
| `url` | object | `url`, `ref?`, `sha?` (git URL) |
| `git-subdir` | object | `url`, `path`, `ref?`, `sha?` (sparse monorepo) |
| `npm` | object | `package`, `version?`, `registry?` |

When both `ref` and `sha` are set, `sha` is the effective pin.

## Install & distribute commands
```bash
# Local dev
claude --plugin-dir ./my-plugin          # load without install (also .zip on v2.1.128+)
claude --plugin-url https://.../x.zip     # load a hosted zip for the session
claude plugin init my-tool                # scaffold an auto-loading skills-dir plugin
claude plugin validate ./my-plugin        # validate (--strict = warnings as errors)
/reload-plugins                           # pick up hook/MCP/agent changes in-session

# Marketplace flow (users)
/plugin marketplace add your-org/your-repo
/plugin marketplace update
/plugin install my-plugin@your-marketplace
```

## Version resolution order
1. `version` in `plugin.json`
2. `version` in the marketplace entry
3. git commit SHA (github/url/git-subdir/relative-path in a git marketplace)
4. `unknown` (npm sources or non-git local dirs)

Explicit `version` → users update only when bumped (published plugins). Omit `version` →
update on every commit (internal, fast-moving plugins).

## Sources
- https://code.claude.com/docs/en/plugins
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-marketplaces
