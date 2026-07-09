---
name: atomic-agents
description: Guides designing and building complex AI agents that combine multiple tools, using a phased Design → Plan → Implement method grounded in atomic/composable components and proven workflow patterns. Use when the user wants to build an agent, a multi-tool agent, orchestrate subagents, an autonomous workflow, or needs help with agent architecture and decomposing a complex agentic system.
---

# Atomic Agents

A design-support skill for building sophisticated AI agents out of small, composable, well-typed
parts. It walks you through **Design → Plan → Implement** so complex multi-tool systems get built
reliably instead of as one sprawling, unpredictable prompt.

## When to use

- Building an autonomous workflow or a multi-tool integration system.
- Architecting an agent that must call several tools, subagents, or services.
- A single prompt has grown brittle and you need to decompose it into reliable steps.
- Choosing between a deterministic workflow and an autonomous agent, or picking an orchestration pattern.

If the task is a single, one-shot LLM call with no tools, you probably don't need this — start simple.

## Core principle: build atomically

Treat an agent as software, not a monolithic prompt. Build it from **atomic components** — like LEGO
blocks — each with a single responsibility and a clear contract:

```
input schema  →  processing (LLM call / tool / logic)  →  output schema
```

Design rules for every atom:

1. **Single responsibility.** One atom does one job (classify, search, summarize, validate). If you
   can't name its job in a short phrase, split it.
2. **Typed interfaces.** Define an explicit input schema and output schema (e.g. Pydantic models).
   Schemas are contracts: they make behavior predictable and validate data at each boundary.
3. **Compose by matching schemas.** Atoms chain when one atom's output schema matches the next atom's
   input schema. This makes components swappable — replace one search tool with another without
   touching the rest.
4. **Tools are typed interfaces too.** Give each tool its own input/output schema, a clear name, and a
   description written for the model (the agent-computer interface matters as much as a human API).
5. **Keep context tight.** Give each atom only the information it needs. Isolate long or noisy work
   (file reads, large searches) inside a subagent/atom and return only a concise result upward.

These are the composability principles of the Atomic Agents framework combined with Anthropic's
guidance to keep systems simple and transparent.

## The phased method

### Phase 1 — DESIGN (what and why)

1. **Define the goal.** Write one sentence: what does "done" look like, and how is success measured?
   Note the required inputs and the final output shape.
2. **Decompose into atomic steps.** List the discrete jobs needed to get from input to goal. Each
   becomes a candidate atom with a rough input → output contract. Identify which steps need a tool,
   which need an LLM judgment, and which are plain code.
3. **Map dependencies & tools.** Which steps are sequential, which are independent (parallelizable),
   which are conditional? List every external tool/API and what it takes and returns.
4. **Pick a pattern (provisional).** Match the shape of the work to a workflow pattern (see below).
   Prefer the simplest pattern that fits.

Deliverable: a step list, a dependency map, and a chosen pattern.

### Phase 2 — PLAN (how)

1. **Choose the workflow pattern** (details in `references/agent-patterns.md`):
   - **Prompt chaining** — fixed sequence, each step feeds the next; add validation gates between steps.
   - **Routing** — a classifier sends input to one of several specialized handlers.
   - **Parallelization** — run independent subtasks at once (sectioning) or the same task several times and aggregate (voting).
   - **Orchestrator-workers** — a central LLM dynamically decomposes the task, delegates to workers, and synthesizes results. Use when subtasks can't be predicted in advance.
   - **Evaluator-optimizer** — a generator produces output, an evaluator critiques it, loop until it passes.
2. **Define schemas & tool contracts.** For every atom and tool, specify the exact input and output
   schema. Nail down field names and types — this is the load-bearing part of the design.
3. **Design error handling.** Per step: what happens on tool failure, invalid output, or a failed
   validation gate? Define retries, fallbacks, and stop conditions (max iterations / budget) —
   especially for any loop or autonomous agent.
4. **Decide workflow vs agent** (see below).

Deliverable: schemas for every boundary, tool contracts, the control-flow diagram, and error/stop rules.

### Phase 3 — IMPLEMENT (build and verify)

1. **Build each atom in isolation.** Implement one atom, test it against its schema with real and
   adversarial inputs, before wiring anything together. An atom that doesn't pass alone won't work in a chain.
2. **Add guardrails.** Validate outputs against schemas at each boundary; enforce the stop conditions
   and budgets from the plan; keep tools least-privilege.
3. **Integrate incrementally.** Connect atoms one boundary at a time (output schema → input schema).
   Test each junction; only then run the full pipeline.
4. **Evaluate end-to-end.** Test against the success measure from Design. Trace failures to a specific
   atom and fix locally — the point of atomicity is that you can.

See `references/design-phases.md` for a step-by-step checklist and a worked example.

## Workflow vs autonomous agent

- **Workflow**: LLMs and tools orchestrated through **predefined code paths**. Predictable, cheaper,
  easier to debug. Prefer this whenever the steps are known in advance.
- **Autonomous agent**: the LLM **dynamically directs its own process and tool use**, looping until
  done. Use only when the path genuinely can't be predicted and flexibility is worth the cost in
  latency, tokens, and unpredictability. Always bound it with clear stop conditions.

Guiding rule (Anthropic): find the **simplest solution possible, and only increase complexity when
needed.** Many "agent" problems are really a workflow of a few atoms.

## Worked example (short)

Goal: "Given a company name, produce a sourced competitive summary."

- Decompose: (1) generate search queries, (2) web search per query [parallel], (3) fetch & extract
  per result, (4) synthesize summary, (5) evaluate for coverage & citations.
- Pattern: parallelization for steps 2-3, then evaluator-optimizer wrapping step 4-5.
- Schemas: `Query{topic}` → `SearchResults{urls[]}` → `Extract{url,facts[]}` →
  `Summary{text,citations[]}` → `Eval{pass:bool,gaps[]}`.
- Errors: retry failed fetches once then skip; loop synth↔eval max 2 times; require ≥3 citations to pass.
- Implement: test each atom alone (esp. extract on messy pages), then chain, then bound the eval loop.

A fuller version is in `references/design-phases.md`.

## Sources

- Anthropic — Building Effective Agents: https://www.anthropic.com/engineering/building-effective-agents
- Atomic Agents (BrainBlend-AI) — GitHub: https://github.com/BrainBlend-AI/atomic-agents
- Atomic Agents — Documentation: https://brainblend-ai.github.io/atomic-agents/
- Claude Agent SDK — Subagents: https://code.claude.com/docs/en/agent-sdk/subagents
- Anthropic — Building agents with the Claude Agent SDK: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
