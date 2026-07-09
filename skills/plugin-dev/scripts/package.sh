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
#
# Requires: zip. Optional: jq (version-stamped default filename),
#           claude CLI (pre-package validation).

set -euo pipefail

err() { echo "error: $*" >&2; exit 1; }

PLUGIN_DIR="${1:-}"
if [[ -z "$PLUGIN_DIR" ]]; then
  echo "usage: $0 <plugin-dir> [output.zip]" >&2
  exit 1
fi
[[ -d "$PLUGIN_DIR" ]] || err "'$PLUGIN_DIR' is not a directory"

PLUGIN_DIR="${PLUGIN_DIR%/}"
MANIFEST="$PLUGIN_DIR/.claude-plugin/plugin.json"
if [[ ! -f "$MANIFEST" ]]; then
  err "no manifest at $MANIFEST — is this a plugin root?
       (the manifest must live at <plugin>/.claude-plugin/plugin.json)"
fi

# --- dependency checks: fail early with actionable messages -----------------
command -v zip >/dev/null 2>&1 || err "'zip' is not installed.
       Install it first:  apt-get install zip  |  dnf install zip  |  brew install zip"

HAVE_JQ=1
if ! command -v jq >/dev/null 2>&1; then
  HAVE_JQ=0
  if [[ -z "${2:-}" ]]; then
    err "'jq' is not installed and no output filename was given.
       Either install jq (apt-get/dnf/brew install jq) so the archive can be
       named from the manifest version, or pass an explicit output path:
         $0 $PLUGIN_DIR ./my-plugin.zip"
  fi
  echo "note: jq not found — skipping manifest sanity check" >&2
fi

# Cheap JSON sanity check before zipping (validate does more when available).
if [[ $HAVE_JQ -eq 1 ]]; then
  jq empty "$MANIFEST" 2>/dev/null || err "$MANIFEST is not valid JSON (run: jq . $MANIFEST)"
fi

# Validate first if the CLI is available (non-fatal if not installed).
# --strict promotes manifest warnings (e.g. misspelled fields) to errors.
if command -v claude >/dev/null 2>&1; then
  echo "Validating $PLUGIN_DIR ..."
  claude plugin validate "$PLUGIN_DIR" --strict || err "plugin validation failed — fix the issues above before packaging"
else
  echo "note: claude CLI not found — skipping 'claude plugin validate'" >&2
fi

BASE="$(basename "$PLUGIN_DIR")"

# Default output name includes the manifest version when jq is available.
if [[ -n "${2:-}" ]]; then
  OUT="$2"
else
  VERSION="$(jq -r '.version // empty' "$MANIFEST")"
  OUT="./${BASE}${VERSION:+-$VERSION}.zip"
fi

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"

# Zip the plugin, excluding VCS metadata and OS cruft.
( cd "$(dirname "$PLUGIN_DIR")" && \
  zip -r -q "$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")" "$BASE" \
    -x "*/.git/*" -x "*/.git" -x "*/.DS_Store" -x "*/node_modules/*" )

SIZE="$(du -h "$OUT" | cut -f1)"
echo
echo "Packaged: $OUT ($SIZE)"
echo
echo "Next steps:"
echo "  1. Smoke-test the archive locally:"
echo "       claude --plugin-dir $OUT"
echo "  2. Share the file directly (recipients run the same command), or"
echo "     host it and have users load it per-session:"
echo "       claude --plugin-url https://your-host/$(basename "$OUT")"
echo "  3. For long-lived distribution with updates, publish via a marketplace"
echo "     instead (see references/manifest-schema.md and worked-example.md §8)."
