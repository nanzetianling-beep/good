# Design Phases — Checklist & Worked Example

Companion to SKILL.md. Work top to bottom; don't advance a phase until its deliverable is complete.

## Phase 1 — DESIGN checklist

- [ ] **Goal statement** — one sentence describing "done" and the success measure.
- [ ] **Inputs / final output** — what comes in, what shape goes out.
- [ ] **Step decomposition** — list every discrete job (aim for atoms with one responsibility each).
- [ ] For each step: rough `input → output`, and is it a **tool call**, an **LLM judgment**, or **plain code**?
- [ ] **Dependency map** — sequential vs independent vs conditional edges between steps.
- [ ] **Tool inventory** — every external API/tool, with what it takes and returns.
- [ ] **Provisional pattern** — the simplest workflow pattern matching the dependency map.

Deliverable: step list + dependency map + chosen pattern.

## Phase 2 — PLAN checklist

- [ ] **Pattern locked** (see `references/agent-patterns.md`); nesting/combination noted if complex.
- [ ] **Schemas** — explicit input & output schema (field names + types) for **every atom and tool**
      (in Atomic Agents, `BaseIOSchema` subclasses; the pair is the agent's `[InputSchema, OutputSchema]`).
- [ ] **Composition check** — each atom's output schema matches the next atom's input schema.
- [ ] **Error handling per step** — on tool failure / invalid output / failed gate: retry? fallback? abort?
- [ ] **Stop conditions** — for every loop or autonomous agent: max iterations/turns, budget, human checkpoint.
- [ ] **Workflow vs agent decision** — recorded with a one-line justification.

Deliverable: schema set + tool contracts + control-flow diagram + error/stop rules.

## Phase 3 — IMPLEMENT checklist

- [ ] **Build each atom in isolation**; unit-test against its schema with real + adversarial inputs.
- [ ] **Guardrails** — schema validation at each boundary; enforce stop conditions/budgets; least-privilege tools.
- [ ] **Incremental integration** — connect one schema boundary at a time; test each junction.
- [ ] **End-to-end evaluation** against the Phase 1 success measure.
- [ ] **Failure tracing** — when it breaks, isolate the responsible atom and fix locally.

Deliverable: a working, tested system whose parts remain independently swappable.

---

## Worked example: multi-tool competitive-research agent

**Goal:** Given a company name, produce a competitive summary with at least 3 cited sources. Success =
the summary covers positioning, top competitors, and recent news, each backed by a citation.

### Design
Steps:
1. Generate 3-5 search queries from the company name. *(LLM)*
2. Web search each query. *(tool — independent → parallel)*
3. Fetch & extract key facts from each top result. *(tool + LLM — parallel)*
4. Synthesize the competitive summary. *(LLM)*
5. Evaluate the summary for coverage + citations; if gaps, request another pass. *(LLM)*

Dependency map: `1 → (2,3 parallel) → 4 ↔ 5 (loop)`.
Tools: `web_search(query) -> urls[]`, `fetch(url) -> text`.
Provisional pattern: **parallelization** (steps 2-3) nested with **evaluator-optimizer** (steps 4-5).

### Plan
Schemas (composition boundaries):
```
QuerySet      { company: str, queries: list[str] }
SearchResults { query: str, urls: list[str] }
Extract       { url: str, facts: list[str] }
Summary       { text: str, citations: list[str] }
Eval          { passed: bool, gaps: list[str] }
```
- Output of 1 (`QuerySet.queries`) fans out to 2; each `SearchResults` feeds 3; `Extract[]` feeds 4;
  `Summary` feeds 5; `Eval.gaps` (if not passed) feeds back into 4.
- Composition check: `generate_queries.output_schema == QuerySet`, which the search step consumes;
  `synthesize.output_schema == Summary == evaluate.input_schema`.
- Error handling: `fetch` fails → retry once, then drop that URL; empty `SearchResults` → widen query once.
- Stop conditions: synth↔eval loop max 2 iterations; require `len(citations) >= 3` to pass; overall
  tool-call budget cap.
- Workflow vs agent: **workflow** — the steps are known, so predefined code paths beat an autonomous loop.

### Implement
1. Build `generate_queries` atom; test it returns sensible, deduped queries.
2. Build `extract` atom; test on messy/paywalled pages (adversarial) — it must degrade gracefully.
   Because fetch+extract is noisy and long, run it inside a subagent so only the concise `Extract`
   returns to the parent, keeping context clean; independent URLs extract concurrently.
3. Build `synthesize` and `evaluate`; test that evaluate correctly flags a citation-less summary.
4. Wire `1 → 2 → 3` (parallel), verify each boundary; then add the `4 ↔ 5` loop with its cap.
5. Run end-to-end on 3 real companies; check the success measure; trace any miss to one atom.

Because each atom is typed and isolated, swapping `web_search` for a different provider (same schema),
or upgrading `extract`, requires no changes elsewhere — the payoff of building atomically.
