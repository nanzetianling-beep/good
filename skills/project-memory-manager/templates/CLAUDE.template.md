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

<!-- ════════════════════════════════════════════════════════════════════════
     VARIANT MINI-TEMPLATES — commented alternatives to the generic skeleton
     above. Pick the one matching your repo type, uncomment it, replace the
     generic body, and fill in the <placeholders>. Delete the variants you
     don't use (they're comments, so they cost no context either way).
     ════════════════════════════════════════════════════════════════════════ -->

<!-- VARIANT 1: LIBRARY / PUBLISHED PACKAGE

# <package-name>
- <One-line purpose>; published to <npm/PyPI/crates.io> as `<name>`
- Public API surface is `src/index.ts` only — everything else is internal

# Commands
- Build: `<cmd>`   Test: `<cmd>`   Typecheck: `<cmd>`   Docs: `<cmd>`

# Rules
- No new runtime dependencies without discussion — they ship to every consumer
- Every change to an exported symbol needs <e.g. a changeset: `npx changeset`>
- Breaking public-API changes require a <major-version changeset / RFC>
- Support matrix: <e.g. Node >= 18, dual ESM + CJS build — keep both working>
- Public exports need <JSDoc/docstrings>; internal code does not

# Gotchas
- <e.g. `dist/` is generated — never edit it; run the build instead>
-->

<!-- VARIANT 2: WEB APP

# <app-name>
- <One-line purpose>. Stack: <e.g. Next.js 15 App Router, TypeScript, Tailwind, Drizzle + Postgres>

# Commands
- Dev: `<cmd>` (<http://localhost:PORT>)   Test: `<cmd>`   Lint: `<cmd>`
- E2E: `<cmd>` <(needs the dev server running)>
- DB: `<migrate cmd>` after schema changes in `<schema path>`

# Rules
- <e.g. Server components by default; add "use client" only when needed>
- <e.g. All DB access through `src/db/queries/` — no inline SQL in routes>
- <e.g. API route handlers live in `src/app/api/`; follow the existing pattern>

# Environment
- Copy `.env.example` to `<.env.local>`; real values from <vault> — never commit keys
- <e.g. Auth tests require a local Redis instance>
-->

<!-- VARIANT 3: MONOREPO ROOT
     Keep the root file to cross-cutting rules only. Package-specific rules go in
     <pkg>/CLAUDE.md (subdirectory files load on demand when Claude reads files
     there) or in .claude/rules/*.md with `paths:` globs scoped to that package.

# <monorepo-name>
- <Workspace tool: pnpm workspaces / Turborepo / Nx>. Apps in `apps/`, shared packages in `packages/`

# Commands (root)
- Install: `<cmd>` (run at the root only — never inside a package)
- Build all: `<cmd>`   Test all: `<cmd>`
- One package: `<e.g. pnpm --filter <pkg> test>`

# Cross-cutting rules
- <e.g. Shared config lives in `packages/config-*` — change it there, not per-package copies>
- <e.g. Cross-package imports only via workspace package names, never relative ../../ paths>
- Package-specific conventions: see each package's own CLAUDE.md / .claude/rules entry
-->

<!-- Monorepo tip: if another team's ancestor CLAUDE.md is polluting your sessions,
     skip it with `claudeMdExcludes` (absolute-path glob) in your settings layer. -->
