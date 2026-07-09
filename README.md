# Claude Code Skills Pack

A pack of **10 productivity Skills** for [Claude Code](https://code.claude.com/docs),
each researched and synthesized from multiple authoritative sources. Skills are
"detailed instruction manuals" that Claude loads on demand to complete a specific
kind of task. This repo is also packaged as an installable **plugin** so you can add
all 10 skills at once.

> These are custom skills. They complement — and do not replace — Claude Code's
> built-in document skills (PPTX, Excel, Word, PDF).

## Invocation & model compatibility

All 10 skills are set to **manual invocation only** (`disable-model-invocation: true`
in each `SKILL.md`). Claude will **not** auto-trigger them — you run a skill
explicitly by name:

```
/frontend-design a pricing page for a coffee subscription
/playwright watch this product page for price drops
```

Skills are plain Markdown instruction files that the **currently active model reads** —
they pin no model, so they work on **any Claude model that runs Claude Code**
(Opus 4.8, Sonnet, Haiku, Fable 5, …), not just one. Switching models (`/model`)
does not affect whether a skill loads or runs. The only model names that appear in
the pack are illustrative `model:` values inside `cc-setup-advisor`'s **subagent
example recipes** (e.g. `sonnet` / `haiku` / `opus` / `inherit`), which configure a
subagent you might create — they do not tie any skill to a specific model.

## The 10 skills

| Skill | What it does |
| --- | --- |
| [`frontend-design`](skills/frontend-design/SKILL.md) | Build distinctive, polished web UI/UX (HTML/CSS/JS) that avoids the generic "AI-generated" look; learn and follow an existing design system. |
| [`playwright`](skills/playwright/SKILL.md) | Natural-language browser automation: scrape sites, log in, fill forms, monitor pages on a schedule, run e2e flows, capture screenshots/PDFs. |
| [`cc-setup-advisor`](skills/cc-setup-advisor/SKILL.md) | Setup consultant — inspects a project and recommends the best approach across MCP, Skill, Hook, Agent, and Command, with concrete file locations. |
| [`skill-builder`](skills/skill-builder/SKILL.md) | Scaffolds and refines new skills: interview → valid `SKILL.md` → reference files → quality-evaluation-and-revision loop. |
| [`plugin-dev`](skills/plugin-dev/SKILL.md) | Build and package plugins that bundle commands, skills, agents, hooks, and MCP servers; distribute via `marketplace.json` or ZIP. |
| [`project-memory-manager`](skills/project-memory-manager/SKILL.md) | Create, audit, and optimize `CLAUDE.md` memory files (project, user, org) and `@imports`; prune bloat and contradictions. |
| [`superpowers`](skills/superpowers/SKILL.md) | A structured-reasoning harness for hard/ambiguous/high-stakes work: multiple angles, steelman + red-team, verify before committing. |
| [`natural-japanese`](skills/natural-japanese/SKILL.md) | Rewrite stiff, AI-sounding Japanese into natural human Japanese following a chosen tone; can follow a Reference Folder style sample. |
| [`security-guidance`](skills/security-guidance/SKILL.md) | Defensive guardrail — audit an external skill/repo before install, spot dangerous code or secret exfiltration, defend against prompt injection. |
| [`atomic-agents`](skills/atomic-agents/SKILL.md) | Design and build complex multi-tool agents with a phased Design → Plan → Implement method and proven workflow patterns. |

Each skill folder contains a focused `SKILL.md` plus supporting `references/`,
`templates/`, `examples/`, or `scripts/` (progressive disclosure — long material
lives one level down and is linked from `SKILL.md`). Every `SKILL.md` ends with a
`## Sources` section citing the real references it was built from.

## Install

### Option A — as a plugin (installs all 10 skills at once)

```
# In Claude Code:
/plugin marketplace add nanzetianling-beep/good
/plugin install claude-code-skills-pack@good-skills-marketplace
```

The plugin manifest is `.claude-plugin/plugin.json`; the marketplace listing is
`.claude-plugin/marketplace.json`.

### Option B — copy individual skills

Copy any skill folder into your skills directory:

```
# Personal (all projects):
cp -r skills/frontend-design ~/.claude/skills/

# Project-scoped (this repo only):
mkdir -p .claude/skills && cp -r skills/frontend-design .claude/skills/
```

Claude Code discovers skills in `~/.claude/skills/<name>/SKILL.md` and
`.claude/skills/<name>/SKILL.md`. Restart Claude Code (or run `/reload-plugins`
for the plugin), then invoke a skill explicitly with `/<skill-name>` (these skills
are manual-only; see **Invocation & model compatibility** above). This works the
same on any model — Opus 4.8, Sonnet, Haiku, or Fable 5.

## Repository layout

```
.
├── .claude-plugin/
│   ├── plugin.json          # plugin manifest (bundles ./skills)
│   └── marketplace.json     # marketplace listing
└── skills/
    ├── frontend-design/
    ├── playwright/
    ├── cc-setup-advisor/
    ├── skill-builder/
    ├── plugin-dev/
    ├── project-memory-manager/
    ├── superpowers/
    ├── natural-japanese/
    ├── security-guidance/
    └── atomic-agents/
```

## Safety note

Before installing any skill from any source (including this one), review it — a
skill runs with the agent's full access. The [`security-guidance`](skills/security-guidance/SKILL.md)
skill documents exactly how to audit a skill before you trust it.
