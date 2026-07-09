# CLAUDE.md Audit Checklist

Run `/memory` first to see which files are actually loaded, then read each and score it against the items below. A file that isn't listed by `/memory` is not being loaded — check its location. To trace *why* a file loaded (path-scoped rule, lazy subdirectory file), add the `InstructionsLoaded` hook.

## Discovery
- [ ] Every CLAUDE.md / CLAUDE.local.md / rules file you expect is listed by `/memory`.
- [ ] No stray/unexpected ancestor CLAUDE.md is being pulled in (in monorepos, use `claudeMdExcludes` to skip other teams' files by absolute-path glob).
- [ ] Local/personal content is in `CLAUDE.local.md` and that file is gitignored — not committed in `CLAUDE.md`.

## Mechanical checks (copy-paste one-liners)

Run these over every file `/memory` listed. Set `FILES` first, e.g.:

```bash
FILES="CLAUDE.md CLAUDE.local.md .claude/CLAUDE.md .claude/rules/*.md"   # keep only the ones that exist
```

Caveat: greps also match text inside backticks/code fences (which Claude treats as literal, and import parsing skips) — verify each hit by eye before filing a finding.

### Line count (thresholds: ≤200 pass, 201–350 should-fix, >350 must-fix)

```bash
wc -l $FILES
```

### Secrets (any true hit = must-fix: remove the line AND rotate the credential)

```bash
grep -nEi "sk_live_|sk-(live|proj|ant)-|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_|xox[baprs]-|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|secret|token|password|credential)[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9_/+=-]{12,}" $FILES
```

### Personal absolute paths (break for every other machine)

```bash
grep -nE "(/Users/[A-Za-z]|/home/[A-Za-z]|[A-Za-z]:\\\\Users)" $FILES
```

### Dead @imports (target file missing = must-fix)

```bash
for f in $FILES; do d=$(dirname "$(realpath "$f")")
  grep -oE '(^|[[:space:]])@[A-Za-z0-9_~./-]+' "$f" | sed 's/^[[:space:]]*@//' | while read -r p; do
    case "$p" in "~/"*) t="$HOME/${p#\~/}" ;; /*) t="$p" ;; *) t="$d/$p" ;; esac
    [ -e "$t" ] || echo "$f: MISSING import target @$p"
  done
done
```

(Backtick-wrapped `@paths` are literal, not imports — discard those hits.)

### Stale tool names and commands

```bash
# Package manager named in the file vs lockfile actually present — mismatches are stale
ls package-lock.json yarn.lock pnpm-lock.yaml bun.lockb 2>/dev/null
grep -nE "\b(npm|yarn|pnpm|bun)( run)? " $FILES

# npm scripts referenced in memory that no longer exist in package.json (requires jq)
grep -ohE "\b(npm run|yarn run|pnpm run|bun run|npm|pnpm) [a-z0-9:._-]+" $FILES | awk '{print $NF}' | sort -u \
  | while read -r s; do jq -e --arg s "$s" '.scripts[$s]' package.json >/dev/null 2>&1 || echo "possibly missing script: $s"; done

# Known-dead tooling still referenced (extend the list for your stack)
grep -nEi "tslint|create-react-app|node-sass|bower|gulp|grunt" $FILES

# Paths mentioned in backticks that don't exist on disk
grep -ohE '`[A-Za-z0-9_./-]+/[A-Za-z0-9_./-]*`' $FILES | tr -d '\`' | sort -u \
  | while read -r p; do [ -e "$p" ] || echo "possibly missing path: $p"; done
```

### Duplicates (exact repeats across all loaded files = should-fix)

```bash
cat $FILES | grep -E '^[[:space:]]*[-*] ' | tr '[:upper:]' '[:lower:]' | sed -E 's/[[:space:]]+/ /g; s/ $//' | sort | uniq -dc
```

Also eyeball near-duplicates — the same rule phrased two ways.

### Contradiction candidates (read each hit-cluster together, across files)

```bash
grep -nEi "tabs?\b|spaces\b|semicolons?|npm\b|yarn\b|pnpm\b|bun\b|rebase|merge|squash|commonjs|require\(|es ?modules?" $FILES
grep -nEi "\b(always|never|must not|do not|don.t)\b" $FILES   # pair up hits about the same noun
```

## Size and structure
- [ ] File is under ~200 lines. If longer, split with `@imports` (organization only) or move file-type-specific rules to `.claude/rules/` with `paths:` frontmatter (actually cuts launch context).
- [ ] Content is grouped under markdown headers with short imperative bullets, not dense paragraphs.
- [ ] `IMPORTANT`/`YOU MUST` used only on a few genuinely critical rules, not everywhere.

## Bloat (cut anything that fails this test)
- [ ] Every line passes: "Would removing this cause Claude to make a mistake?" If no, delete it.
- [ ] No generic advice ("write clean code", "follow best practices", "be careful").
- [ ] No standard language/framework conventions Claude already knows.
- [ ] No file-by-file descriptions of the codebase or long tutorials/explanations.
- [ ] No detailed API docs pasted inline (link to docs instead).
- [ ] No content that changes frequently (it will go stale).

## Specificity
- [ ] Rules are concrete and verifiable ("use 2-space indentation", "run `npm test` before committing"), not vague ("format properly", "test your changes").
- [ ] Non-guessable bash commands, required env vars, and setup quirks are captured.
- [ ] Architectural decisions and known gotchas specific to this project are documented.

## Consistency
- [ ] No contradictions within the file.
- [ ] No contradictions across the hierarchy (managed → user → project → local, and nested CLAUDE.md files). Where they conflict, the more-specific/later-loaded file wins — make that intentional, not accidental.

## Correct placement (move, don't just delete)
- [ ] Must-happen-every-time actions (lint on save, block writes to a path) → **hook**, not a memory instruction.
- [ ] Occasional workflows or domain knowledge → **skill** (`.claude/skills/`), loaded on demand.
- [ ] File-type/subtree-specific rules → **`.claude/rules/*.md`** with `paths:` frontmatter.
- [ ] Cross-project personal prefs → `~/.claude/CLAUDE.md`; private per-project → `CLAUDE.local.md`.
- [ ] Learnings Claude should discover on its own (build quirks, debugging insights) can be left to **auto memory** rather than hand-written into CLAUDE.md.

## Imports (@path)
- [ ] Import chains stay within the max depth of 4 hops.
- [ ] Literal path mentions are backtick-wrapped so they aren't imported accidentally.
- [ ] Remember imports don't save context — they only organize. Prefer path-scoped rules to actually reduce launch context.
- [ ] If the repo has `AGENTS.md`, CLAUDE.md imports it (`@AGENTS.md`) rather than duplicating.

## Safety
- [ ] No secrets, API keys, tokens, or credentials anywhere in any memory file.
- [ ] Notes meant only for human maintainers are in stripped HTML comments (`<!-- ... -->`), not plain text. (Comments inside code blocks are NOT stripped.)

## Verify empirically
- [ ] After editing, observe whether Claude's behavior actually changed. If a rule is still ignored, the file is likely too long — prune further or convert the rule to a hook.
- [ ] Instruction that vanished after `/compact`? Project-root CLAUDE.md is re-injected automatically; a nested subdirectory CLAUDE.md reloads only when Claude next reads a file there — and a conversation-only instruction never persisted at all. Add it to CLAUDE.md.
