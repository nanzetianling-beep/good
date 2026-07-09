---
name: <kebab-case-name-matching-folder>
description: <One or two sentences, third person. State WHAT the skill does and WHEN to use it, with concrete trigger words/phrases and file types the user might mention. Max 1024 chars. No first/second person. No XML tags. Name uses lowercase/numbers/hyphens only, no "anthropic"/"claude".>
# Optional Claude Code fields (delete if unused):
# allowed-tools: Read Grep          # tools granted without a prompt while active
# disable-model-invocation: false   # true = hide from auto-trigger
# paths: "**/*.py"                   # globs that scope auto-activation
---

# <Human Readable Skill Name>

<One-line statement of what this skill produces or accomplishes.>

## When to use

Use this skill when the user wants to:

- <trigger scenario 1>
- <trigger scenario 2>

<Optional: when NOT to use it — e.g. "For one-off X, just do the task directly.">

## Workflow

<Numbered, imperative steps. Match specificity to fragility: prose for flexible tasks, exact commands ("run exactly this", "do not modify") for fragile ones. Explain the WHY, not just the rule. For complex flows, offer a copyable checklist like the one below.>

```
Progress:
- [ ] Step 1: <...>
- [ ] Step 2: <...>
- [ ] Step 3: <...>
```

1. <Step 1>
2. <Step 2>
3. <Step 3>

## Examples

<Provide concrete input/output pairs when output style/quality matters. Delete this section if not needed.>

Input: <example input>
Output:
```
<example output>
```

## Reference files

<Link one level deep to any long or optional material. Delete if the body is self-contained. Give a table of contents to any reference over ~100 lines.>

- `references/<topic>.md` — <what it covers, when to read it>
- `scripts/<name>.py` — <run it, or read it as reference — say which; list any dependencies>
