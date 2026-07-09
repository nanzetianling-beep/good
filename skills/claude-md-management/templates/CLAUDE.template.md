<!-- Project CLAUDE.md template. Keep it under ~200 lines. Delete sections you don't need.
     Every line should change Claude's behavior — if removing a line wouldn't cause a
     mistake, cut it. This whole comment is stripped before loading, so it costs no context.
     (Note: HTML comments INSIDE fenced code blocks are NOT stripped.) -->

# Project
- <One-line description of what this project is>
- Stack: <framework + version, language, key libraries, e.g. Next.js 15, TypeScript, Drizzle, Postgres>

# Commands
- Install: `<cmd>`
- Dev/run: `<cmd>`
- Test: `<cmd>`  (run a single test: `<cmd> <file>` — prefer over the full suite)
- Lint: `<cmd>`
- Typecheck / build: `<cmd>`

# Code style
<!-- Only rules that differ from language defaults; let linters/formatters handle the rest. -->
- <e.g. Use ES modules (import/export), not CommonJS require>
- <e.g. 2-space indentation>

# Architecture / layout
<!-- Only non-obvious structure Claude can't infer by reading the code. -->
- <e.g. API route handlers live in `src/app/api/`; follow the existing handler pattern>
- <e.g. Shared types in `src/types/`>

# Workflow
- <e.g. Typecheck before committing>
- <e.g. Write a failing test that reproduces a bug before fixing it>
- <e.g. Branch naming / PR conventions>

# Gotchas
<!-- Non-obvious behaviors, required env vars, environment quirks. -->
- <e.g. Requires a local Redis instance for the auth tests>
- <e.g. Set DATABASE_URL before running migrations>

# Imports (optional)
<!-- Pull in other files instead of duplicating. Imports load at launch and do NOT save context.
     If the repo has an AGENTS.md, prefer `@AGENTS.md` here instead of copying its content. -->
- See @README.md for the full project overview
- Git workflow: @docs/git-instructions.md

<!-- Reminders:
     - Team-shared → commit this file. Personal/private → CLAUDE.local.md (gitignored).
     - Never put secrets, API keys, or tokens here.
     - Must-happen-every-time actions belong in a hook, not here.
     - File-type-specific rules belong in .claude/rules/*.md with `paths:` frontmatter.
     - Occasional workflows / domain knowledge belong in a skill (.claude/skills/), loaded on demand. -->
