#!/usr/bin/env bash
# Package a Claude Code plugin directory into a distributable .zip archive.
#
# The resulting archive can be shared with a team and loaded directly:
#   claude --plugin-dir ./my-plugin.zip      (Claude Code v2.1.128+)
# or hosted and loaded by URL:
#   claude --plugin-url https://host/my-plugin.zip
#
# Usage:
#   scripts/package.sh <plugin-dir> [output.zip]
#
# Example:
#   scripts/package.sh ./my-plugin ./dist/my-plugin-1.0.0.zip

set -euo pipefail

PLUGIN_DIR="${1:-}"
if [[ -z "$PLUGIN_DIR" || ! -d "$PLUGIN_DIR" ]]; then
  echo "error: pass the path to a plugin directory" >&2
  echo "usage: $0 <plugin-dir> [output.zip]" >&2
  exit 1
fi

PLUGIN_DIR="${PLUGIN_DIR%/}"
MANIFEST="$PLUGIN_DIR/.claude-plugin/plugin.json"
if [[ ! -f "$MANIFEST" ]]; then
  echo "error: no manifest at $MANIFEST — is this a plugin root?" >&2
  exit 1
fi

# Validate first if the CLI is available (non-fatal if not installed).
if command -v claude >/dev/null 2>&1; then
  echo "Validating $PLUGIN_DIR ..."
  claude plugin validate "$PLUGIN_DIR" || {
    echo "error: plugin validation failed" >&2
    exit 1
  }
fi

BASE="$(basename "$PLUGIN_DIR")"
OUT="${2:-./${BASE}.zip}"
mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"

# Zip the plugin, excluding VCS metadata and OS cruft.
( cd "$(dirname "$PLUGIN_DIR")" && \
  zip -r -q "$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")" "$BASE" \
    -x "*/.git/*" -x "*/.git" -x "*/.DS_Store" -x "*/node_modules/*" )

echo "Wrote $OUT"
echo "Share it, then load with:  claude --plugin-dir $OUT"
