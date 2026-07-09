---
name: atomic-agents
description: Guides building complex, multi-tool AI agents from well-typed, composable parts via a phased Design → Plan → Implement method. Grounds it in the atomic-component principle (typed input/output schemas), Anthropic's workflow patterns (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer), and Claude Agent SDK subagents. Use when the user wants to build an agent, a multi-tool agent, orchestrate subagents, design an autonomous workflow, or needs agent architecture help.
---

# Atomic Agents

A design-support skill for building sophisticated AI agents out of small, composable, well-typed
parts. It walks you through **Design → Plan → Implement** so complex multi-tool systems get built
reliably — as engineered software — instead of as one sprawling, unpredictable prompt.

## When to use

- Building an autonomous workflow or a multi-tool integration system.
- Architecting an agent that must call several tools, subagents, or external services.
- A single prompt has grown brittle and needs to be decomposed into reliable, testable steps.
- Choosing between a deterministic workflow and an autonomous agent, or picking an orchestration pattern.

If the task is a single, one-shot LLM call with no tools, you probably don't need this — start simple
and only add structure when a concrete failure demands it.

## Core principle: build atomically

Treat an agent as software, not a monolithic prompt. Build it from **atomic components** — like LEGO
blocks — each doing one thing with a clear contract:

```
input schema  →  processing (LLM call / tool / logic)  →  output schema
```

Every component (agent, tool, context provider) should be, in the Atomic Agents framework's terms,
**single-purpose** (does one thing well), **reusable** (works in multiple pipelines), **composable**
(combines cleanly with others), and **predictable** (produces consistent, validated outputs).

Design rules for every atom:

1. **Single responsibility.** One atom does one job (classify, search, extract, summarize, validate).
   If you can't name its job in a short phrase, split it.
2. **Typed interfaces.** Define an explicit input schema and output schema (e.g. Pydantic models).
   Schemas are contracts: they make behavior predictable and validate data at each boundary. In
   Atomic Agents this is literally the type signature — `AtomicAgent[InputSchema, OutputSchema]`, with
   both schemas subclassing `BaseIOSchema`.
3. **Compose by matching schemas.** Atoms chain when one atom's **output schema matches the next
   atom's input schema** — so an agent's output can feed straight into a tool or another agent. This
   makes components swappable: replace one search tool with another that shares the schema without
   touching the rest.
4. **Tools are typed interfaces too.** Give each tool its own input/output schema, a clear name, and a
   description written *for the model* (the agent-computer interface matters as much as a human API).
5. **Keep context tight.** Give each atom only the information it needs. Isolate long or noisy work
   (large file reads, broad searches) inside a subagent/atom and return only a concise result upward.
   Inject runtime data through a context provider rather than hard-coding it into a prompt.

These combine the composability model of the Atomic Agents framework with Anthropic's guidance to keep
agentic systems simple, transparent, and built from well-documented components.

## The phased method

### Phase 1 — DESIGN (what and why)

1. **Define the goal.** One sentence: what does "done" look like, and how is success measured? Note the
   required inputs and the final output shape.
2. **Decompose into atomic steps.** List the discrete jobs needed to get from input to goal. Each
   becomes a candidate atom with a rough input → output contract. Tag each step as a **tool call**, an
   **LLM judgment**, or **plain code**.
3. **Map dependencies & tools.** Which steps are sequential, which are independent (parallelizable),
   which are conditional? Inventory every external tool/API with what it takes and returns.
4. **Pick a pattern (provisional).** Match the *shape* of the work to a workflow pattern (see below and
   `references/agent-patterns.md`). Prefer the simplest pattern that fits.

Deliverable: a step list, a dependency map, and a chosen pattern.

### Phase 2 — PLAN (how)

1. **Lock the workflow pattern** (details in `references/agent-patterns.md`):
   - **Prompt chaining** — fixed sequence, each step feeds the next; add validation gates between steps.
   - **Routing** — a classifier sends input to one of several specialized handlers.
   - **Parallelization** — run independent subtasks at once (sectioning) or the same task several times and aggregate (voting).
   - **Orchestrator-workers** — a central LLM dynamically decomposes the task, delegates to workers, and synthesizes results. Use when the subtasks can't be predicted in advance.
   - **Evaluator-optimizer** — a generator produces output, an evaluator critiques it; loop until it passes.
2. **Define schemas & tool contracts.** For every atom and tool, specify the exact input and output
   schema — field names and types. This is the load-bearing part of the design; do a **composition
   check** that each atom's output schema matches the next atom's input schema.
3. **Design error handling.** Per step: what happens on tool failure, invalid output, or a failed
   validation gate? Define retries, fallbacks, and stop conditions (max iterations / budget) —
   especially for any loop or autonomous agent.
4. **Decide workflow vs agent** (see below), and record a one-line justification.

Deliverable: schemas for every boundary, tool contracts, the control-flow diagram, and error/stop rules.

### Phase 3 — IMPLEMENT (build and verify)

1. **Build each atom in isolation.** Implement one atom and test it against its schema with real *and*
   adversarial inputs before wiring anything together. An atom that doesn't pass alone won't work in a chain.
2. **Add guardrails.** Validate outputs against schemas at each boundary; enforce the stop conditions
   and budgets from the plan; keep tools least-privilege.
3. **Integrate incrementally.** Connect atoms one boundary at a time (output schema → input schema).
   Test each junction; only then run the full pipeline.
4. **Evaluate end-to-end.** Test against the success measure from Design. Trace failures to a specific
   atom and fix locally — the payoff of atomicity is that you can.

See `references/design-phases.md` for a per-phase checklist and a fully worked example.

## Workflow vs autonomous agent

- **Workflow**: LLMs and tools orchestrated through **predefined code paths**. Predictable, cheaper,
  easier to debug. Prefer this whenever the steps are known in advance — most "agent" problems are
  really a workflow of a few atoms.
- **Autonomous agent**: the LLM **dynamically directs its own process and tool use**, looping on
  environment feedback until done. Use only when the path genuinely can't be predicted and the
  flexibility is worth the cost in latency, tokens, and unpredictability. Always bound it with explicit
  **stop conditions** (task complete, max iterations/turns, budget cap, human checkpoint).

Guiding rule (Anthropic): find the **simplest solution possible, and only increase complexity when it
measurably improves outcomes.**

## Subagents as atoms (Claude Agent SDK)

Subagents are a concrete way to realize atoms with **isolated context**. In the Claude Agent SDK you
define one with an `AgentDefinition`: a `description` (tells the model *when* to use it), a `prompt`
(its system prompt / single job), optional `tools` (restrict to least-privilege), and an optional
`model`. Key properties to exploit:

- **Context isolation** — each subagent starts in a *fresh* context; only its **final message** returns
  to the parent. The only channel in is the prompt string, so pass every needed file path, error, and
  decision explicitly.
- **Parallelization** — independent subagents run concurrently, finishing in the time of the slowest,
  not the sum.
- **Tool restriction** — narrow `tools` (e.g. `Read`, `Grep`, `Glob` for a read-only analyzer) to make
  the atom safe by construction.
- **Bounding** — use `maxTurns` as a stop condition for any subagent that loops.

More detail and the pattern-selection heuristic are in `references/agent-patterns.md`.

## Worked example (short)

Goal: "Given a company name, produce a sourced competitive summary."

- Decompose: (1) generate search queries, (2) web search per query [parallel], (3) fetch & extract per
  result [parallel], (4) synthesize summary, (5) evaluate for coverage & citations.
- Pattern: parallelization for steps 2-3, then evaluator-optimizer wrapping steps 4-5.
- Schemas: `QuerySet{company,queries[]}` → `SearchResults{query,urls[]}` → `Extract{url,facts[]}` →
  `Summary{text,citations[]}` → `Eval{passed,gaps[]}`.
- Errors: retry failed fetches once then skip; loop synth↔eval max 2 times; require ≥3 citations to pass.
- Implement: test each atom alone (especially extract on messy pages), then chain, then bound the loop.

The full version — including composition boundaries and per-step error handling — is in
`references/design-phases.md`.

## Sources

- Anthropic — Building Effective Agents: https://www.anthropic.com/engineering/building-effective-agents
- Atomic Agents (BrainBlend-AI) — GitHub README: https://github.com/BrainBlend-AI/atomic-agents/blob/main/README.md
- Atomic Agents — Documentation (Agents / schemas): https://brainblend-ai.github.io/atomic-agents/
- Claude Agent SDK — Subagents: https://code.claude.com/docs/en/agent-sdk/subagents
- Anthropic — Building agents with the Claude Agent SDK: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
