# Worked Audit: Acme Dashboard

A complete end-to-end example of the AUDIT workflow from SKILL.md: a realistic bad
`CLAUDE.md` → the mechanical checks and their output → the audit report against the
severity rubric → the rewritten file → a change-by-change summary.

## 1. Input: the bad CLAUDE.md (77 lines)

`/memory` lists exactly one file, `./CLAUDE.md`. The repo also contains `package-lock.json`
(no yarn/pnpm lockfile), `docs/testing-guide.md` (exists), no `docs/deploy.md`, an ESLint
config (TSLint was removed years ago), `"engines": { "node": ">=20" }` in `package.json`,
and routes under `src/app/` (the old `src/pages/` is gone).

```markdown
# Acme Dashboard — CLAUDE.md

This is the CLAUDE.md file for the Acme Dashboard project. Claude, please read
this file carefully before doing anything. It is very important that you follow
all of the instructions in this file at all times.

## About the project
Acme Dashboard is a web application. It is a dashboard for Acme customers.
It is written in JavaScript and uses React. We care deeply about code quality,
so always write clean, maintainable, well-documented, high-quality code and
follow industry best practices. Never write bad code.

## Project structure
- `src/` — the source code
- `src/components/` — React components
- `src/components/Button.jsx` — the button component
- `src/components/Modal.jsx` — the modal component
- `src/components/Table.jsx` — the table component
- `src/pages/` — the pages (NOTE: we moved to `src/app/` in 2024)
- `public/` — static assets
- `package.json` — npm configuration
- `README.md` — the readme
- `src/hooks/` — custom React hooks
- `src/utils/` — utility functions

## Dependencies
We use React for the UI, Next.js as the framework, Jest for testing, and
Stripe for payments. These are all listed in package.json. When adding new
dependencies, think carefully about whether they are really needed.

## Setup
Run `npm install` to install dependencies. You need Node 14 or later.
Set the environment variables. For local dev you can use our key:
STRIPE_SECRET_KEY=sk_live_[REDACTED_EXAMPLE]
Ask Priya if you need database access. The database dump lives at
/Users/priya/backups/acme-dump.sql if you need to restore it.

## Commands
- `yarn dev` — start the dev server
- `yarn test` — run the tests with Jest
- `npm run lint` — we use TSLint for linting
- `npm run e2e` — run the end-to-end tests

## Code style
Use 4 spaces for indentation. Format code properly and consistently.
Always use semicolons.
- Indent with 2 spaces (Prettier default)
- Never use semicolons — Prettier strips them
Components should be organized well and named appropriately. Try to keep
functions small. Avoid complexity when possible. Use meaningful variable
names. Comment your code where appropriate but not too much.

## Git workflow
Always rebase your branch on main before opening a PR. Never create merge
commits. When merging PRs, use merge commits so we keep the full history.
Write good commit messages.

## Testing
Testing is very important. Please always test your changes thoroughly.
Make sure everything works before committing. Be careful with edge cases.
See @docs/testing-guide.md for the full testing guide.
See @docs/deploy.md for deployment instructions.

## Deployment
We deploy on Fridays. Deployment is handled by Jenkins at
https://jenkins.internal.acme.test/job/dashboard/ — ask in #eng-dashboard
for credentials. The deploy takes about 20 minutes usually, sometimes 30
if the cache is cold, it depends on the day and how busy the runners are.

## Misc
- Remember to be helpful and thorough.
- IMPORTANT: always double-check your work!
- IMPORTANT: read the whole codebase before making changes.
- IMPORTANT: never break the build.
- IMPORTANT: follow all the rules in this file.
- Try to write code that is easy to understand.
- Always double-check your work.
```

## 2. Mechanical checks (steps 2–6) and what they returned

With `FILES=CLAUDE.md` (the only file `/memory` listed), the one-liners from
`audit-checklist.md` produce:

```text
$ wc -l CLAUDE.md
77 CLAUDE.md                     → ≤200: size passes

$ <secrets grep>
34: STRIPE_SECRET_KEY=sk_live_[REDACTED_EXAMPLE]        → MUST-FIX

$ <absolute-path grep>
36: /Users/priya/backups/acme-dump.sql                        → should-fix

$ <dead-import loop>
CLAUDE.md: MISSING import target @docs/deploy.md              → MUST-FIX
(@docs/testing-guide.md on line 61 exists — OK)

$ ls *lock*            → package-lock.json only
$ <pm grep>            → lines 39-40 say `yarn dev` / `yarn test`   → stale, MUST-FIX
$ <stale-tooling grep> → line 41: TSLint (repo has .eslintrc)        → stale, MUST-FIX
$ <backtick-path check>→ possibly missing path: src/pages/ (line 19) → stale, MUST-FIX

$ <duplicate one-liner>
(no exact repeats — but the eyeball pass catches lines 72 vs 77:
"IMPORTANT: always double-check your work!" / "Always double-check your work.")

$ <contradiction grep> — hit clusters to read together:
  45 "4 spaces" vs 47 "2 spaces"                              → MUST-FIX
  46 "Always use semicolons" vs 48 "Never use semicolons"     → MUST-FIX
  54-55 "Never create merge commits" vs "use merge commits"   → MUST-FIX
```

Step 7 (line-by-line judgment) then flags the vague/bloat content the greps can't catch:
the preamble, "About the project" filler, the file-by-file structure listing, the
Dependencies section that restates `package.json`, the vague style/testing paragraphs,
the deployment trivia, and the `IMPORTANT` pile-up.

## 3. The audit report

```markdown
# CLAUDE.md audit — acme-dashboard — 2026-07-09
Loaded files (/memory): ./CLAUDE.md (77 lines)   Missing/not loading: none
Size: 77 lines → pass

## Must-fix
- M1 CLAUDE.md:34 — live Stripe secret key in memory file → delete line AND rotate the
  key (it is in git history); point to the real secret source (.env.example + vault)
- M2 CLAUDE.md:45,47 — contradiction: "4 spaces" vs "2 spaces (Prettier default)" →
  the Prettier config is the source of truth (2 spaces); keep one rule
- M3 CLAUDE.md:46,48 — contradiction: "Always use semicolons" vs "Never use semicolons" →
  keep the Prettier-config answer (no semicolons)
- M4 CLAUDE.md:54-55 — contradiction: "Never create merge commits" vs "use merge
  commits" → team confirms: contributors rebase; the maintainer merges with a merge
  commit. Say exactly that.
- M5 CLAUDE.md:62 — dead import @docs/deploy.md (file does not exist) → remove or restore
- M6 CLAUDE.md:39-41 — stale commands: yarn named but only package-lock.json exists;
  TSLint replaced by ESLint → rewrite as npm commands, say ESLint
- M7 CLAUDE.md:19,32 — stale facts: `src/pages/` no longer exists; "Node 14" vs
  engines ">=20" → state src/app/ and Node >= 20

## Should-fix
- S1 CLAUDE.md:3-5,8-11,49-51,59-60,71-77 — generic filler and vague rules ("clean
  code", "format properly", "test thoroughly", "double-check") → cut; keep only
  verifiable rules
- S2 CLAUDE.md:13-24 — file-by-file structure listing → cut; keep only non-inferable
  facts (where routes live)
- S3 CLAUDE.md:26-29 — Dependencies section restates package.json → cut; Claude reads
  package.json directly
- S4 CLAUDE.md:35-36 — personal absolute path /Users/priya/... and "ask Priya" → move
  to the author's CLAUDE.local.md or replace with a team-usable instruction
- S5 CLAUDE.md:64-68 — deployment schedule/duration trivia: frequently changing,
  changes no Claude behavior → cut
- S6 CLAUDE.md:72,77 — near-duplicate rule ("double-check your work") → covered by S1 cut

## Nice
- N1 CLAUDE.md:72-75 — IMPORTANT on four consecutive bullets dilutes emphasis →
  reserve it for the few genuinely critical rules
- N2 CLAUDE.md:1-5 — title + preamble addressing Claude adds nothing → cut

## Placement moves
- "run lint before committing" → keep in CLAUDE.md as a concrete command; if it must
  NEVER be skipped, a hook is the enforced option (CLAUDE.md is advisory)
- Personal DB-dump note (S4) → CLAUDE.local.md (gitignored)

## Proposed rewrite
(see below)
```

## 4. The rewrite (33 lines)

```markdown
# Acme Dashboard

Customer-facing dashboard. Next.js (App Router), React, TypeScript.

# Commands
- Install: `npm install` (repo uses npm — package-lock.json)
- Dev: `npm run dev` (http://localhost:3000)
- Test: `npm test` (Jest; single file: `npm test <file>` — prefer over full suite)
- Lint: `npm run lint` (ESLint)
- E2E: `npm run e2e` (requires the dev server running)

# Code style
- Prettier defaults: 2-space indentation, no semicolons — don't fight the formatter
- One component per file in `src/components/`, PascalCase filenames

# Architecture
- Routes live in `src/app/` (App Router); `src/pages/` no longer exists
- Payments go through `src/lib/stripe.ts` — never call the Stripe SDK directly elsewhere

# Workflow
- Rebase your branch on `main` before opening a PR; maintainers merge PRs with a
  merge commit — don't merge your own
- Run `npm run lint && npm test` before committing

# Environment
- Node >= 20
- Copy `.env.example` to `.env.local`; get real values from the team vault
  ("Acme Dashboard dev"). Never commit or paste keys into this file.
- E2E tests need `STRIPE_SECRET_KEY` set to the **test** key, not live

# Testing
- Write a failing test that reproduces a bug before fixing it
- Full guide: @docs/testing-guide.md
```

(Plus, outside the shared file: the DB-dump note moved to the author's own
`CLAUDE.local.md`, and the leaked live key was rotated.)

## 5. Change-by-change summary

| Original (lines) | Change | Why (rubric) |
| --- | --- | --- |
| 1–5 title + preamble ("read carefully", "follow all instructions") | Deleted | N2 — zero behavior change; CLAUDE.md is already always read |
| 8–11 "clean, maintainable, best practices, never write bad code" | Deleted | S1 — generic filler; unverifiable |
| 13–24 file-by-file structure listing | Deleted; kept only `src/app/` + components facts | S2 — Claude infers structure by reading code; listings go stale |
| 19 "`src/pages/` — the pages" | Replaced with "`src/app/` … `src/pages/` no longer exists" | M7 — stale path was a false instruction |
| 26–29 Dependencies prose | Deleted | S3 — restates package.json |
| 32 "Node 14 or later" | "Node >= 20" | M7 — contradicted `engines` in package.json |
| 34 live Stripe key | Deleted; replaced with .env.example + vault pointer; key rotated | M1 — secret in a committed memory file (and in git history) |
| 35–36 "ask Priya" + `/Users/priya/...` | Moved to author's `CLAUDE.local.md` | S4 — personal, machine-specific; useless to teammates |
| 39–40 `yarn dev` / `yarn test` | `npm run dev` / `npm test` | M6 — only package-lock.json exists; yarn is stale |
| 41 "TSLint" | "ESLint" | M6 — tool was replaced; repo has an ESLint config |
| 45–48 4-space+semicolons vs 2-space+no-semicolons | Single rule: "Prettier defaults: 2-space, no semicolons" | M2/M3 — contradiction resolved by the formatter config (source of truth) |
| 49–51 "organized well… meaningful names… comment appropriately" | Deleted; kept the one verifiable rule (one component per file, PascalCase) | S1 — vague; the rest is default good behavior |
| 54–56 rebase-never-merge vs use-merge-commits | "Contributors rebase; maintainers merge with a merge commit" | M4 — contradiction; team confirmed each half applied to a different actor |
| 59–60 "test thoroughly… be careful" | Replaced with "failing test before fix" + exact pre-commit command | S1 — vague → concrete and verifiable |
| 62 `@docs/deploy.md` | Removed | M5 — import target does not exist |
| 64–68 Friday deploys, Jenkins URL, duration musings | Deleted | S5 — frequently-changing trivia; changes no Claude behavior |
| 70–77 Misc / IMPORTANT pile + near-duplicate | Deleted | S1/S6/N1 — filler, duplicate, emphasis dilution |
| (new) "Payments go through `src/lib/stripe.ts`" | Added | Audit interview surfaced a real recurring mistake — the kind of rule CLAUDE.md exists for |

Net: 77 → 33 lines. Every surviving line is concrete, verifiable, and true; every cut
line failed "would removing this cause a mistake?"; every move landed in the layer the
placement table prescribes.
