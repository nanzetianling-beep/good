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

### Deliverable template — goal spec

Fill this in before decomposing. If a row is hard to fill, the goal isn't ready yet.

| Field | Entry |
|---|---|
| **Goal (one sentence)** | Given ___, produce ___. |
| **Success criteria** | Measurable checks — countable, gateable (e.g. "≥ 3 citations; covers X, Y, Z"). |
| **Inputs** | `name: type` — and where each comes from. |
| **Final output** | `name: type/schema` — and who/what consumes it. |
| **Failure budget** | Which partial failures are tolerable vs run-fatal (e.g. "any single fetch may fail; < 3 usable sources aborts"). |
| **Out of scope** | Explicitly excluded work, so atoms don't grow. |

Filled in for the worked example:

| Field | Entry |
|---|---|
| Goal | Given a company name, produce a sourced competitive summary. |
| Success criteria | ≥ 3 citations; covers positioning, top competitors, recent news. |
| Inputs | `company: str` (user), `urls: list[str]` (from search step). |
| Final output | `ReportOutput{passed, gaps[], markdown}` — consumed by the caller/UI. |
| Failure budget | Any URL may fail (retry once, then drop); < 3 usable sources = abort; revise loop capped at 2. |
| Out of scope | Financial analysis, real-time monitoring, non-public sources. |

## Phase 2 — PLAN checklist

- [ ] **Pattern locked** (see `references/agent-patterns.md`); nesting/combination noted if complex.
- [ ] **Schemas** — explicit input & output schema (field names + types) for **every atom and tool**
      (in Atomic Agents, `BaseIOSchema` subclasses; the pair is the agent's `[InputSchema, OutputSchema]`).
- [ ] **Composition check** — each atom's output schema matches the next atom's input schema.
- [ ] **Error handling per step** — on tool failure / invalid output / failed gate: retry? fallback? abort?
- [ ] **Stop conditions** — for every loop or autonomous agent: max iterations/turns, budget, human checkpoint.
- [ ] **Workflow vs agent decision** — recorded with a one-line justification.

Deliverable: schema set + tool contracts + control-flow diagram + error/stop rules.

### Deliverable template — decomposition worksheet

One row per atom. This table **is** the plan — if you can't fill a cell, that atom isn't designed yet.
The composition check is mechanical: row *n*'s output schema must equal (or be explicitly mapped to)
row *n+1*'s input schema.

| # | Step name | Input schema | Output schema | Tool / LLM / code | Failure mode | Retry policy |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

Filled in for the worked example:

| # | Step name | Input schema | Output schema | Tool / LLM / code | Failure mode | Retry policy |
|---|---|---|---|---|---|---|
| 1 | fetch | `FetchInput{url}` | `FetchOutput{url,status,text}` | tool (HTTP) | timeout, 4xx/5xx | retry once, then drop URL |
| 2 | extract | `ExtractInput{url,text}` | `ExtractOutput{url,facts[]}` | LLM | empty/garbage facts on messy pages | no retry; empty facts ⇒ drop URL |
| 3 | analyze | `AnalyzeInput{company,extracts[],gaps[]}` | `AnalyzeOutput{summary,citations[]}` | LLM | thin summary, missing citations | no auto-retry — the gate loop is the retry |
| 4 | report (gate) | `ReportInput{company,summary,citations[]}` | `ReportOutput{passed,gaps[],markdown}` | plain code | none (deterministic) | n/a; failing gate feeds `gaps` back to 3, max 2 loops |

Boundary mappings to note in the worksheet: 1→2 drops `status`; 2→3 aggregates many `ExtractOutput`
into one list (with a `MIN_SOURCES` floor); 4→3 is the only backward edge and carries only `gaps`.

## Phase 3 — IMPLEMENT checklist

- [ ] **Build each atom in isolation**; unit-test against its schema with real + adversarial inputs.
- [ ] **Guardrails** — schema validation at each boundary; enforce stop conditions/budgets; least-privilege tools.
- [ ] **Incremental integration** — connect one schema boundary at a time; test each junction.
- [ ] **End-to-end evaluation** against the Phase 1 success measure.
- [ ] **Failure tracing** — when it breaks, isolate the responsible atom and fix locally.

Deliverable: a working, tested system whose parts remain independently swappable.

### Deliverable template — integration test plan

Cover four layers, in order: atoms alone → junctions → injected failures → end-to-end. Write the
failure-injection rows straight from the worksheet's "failure mode" column.

| # | Layer | Test | Given | Expect |
|---|---|---|---|---|
| U-n | atom unit | one per atom, incl. an adversarial input | canned input model | valid output model (or clean raise) |
| J-n | junction | one per schema boundary | canned upstream output | downstream atom accepts it unchanged |
| F-n | failure injection | one per failure-mode row | forced tool error / bad LLM output | retry → drop → floor/abort behaves per plan |
| S-n | stop condition | one per loop/budget | gate that never passes | loop exits at cap with best-effort output |
| E-n | end-to-end | 2-3 realistic runs | real inputs | goal-spec success criteria met |

Filled in for the worked example (abridged):

| # | Layer | Test | Given | Expect |
|---|---|---|---|---|
| U-2 | atom unit | extract on a paywalled page | canned `ExtractInput` with junk text | `facts == []`, no crash |
| U-4 | atom unit | gate rejects citation-less summary | `ReportInput` with 0 citations | `passed=False`, gap names the criterion |
| J-2 | junction | fetch → extract boundary | canned `FetchOutput` | `ExtractInput` built without touching `status` |
| F-1 | failure injection | fetch raises twice | mocked timeout | URL dropped, run continues |
| F-2 | failure injection | too many dead URLs | only 2 usable sources | run aborts citing the `MIN_SOURCES` floor |
| S-1 | stop condition | gate never passes | evaluator forced to fail | exits after 1 + 2 passes, returns `passed=False` + gaps |
| E-1 | end-to-end | 3 real companies | live tools | ≥ 3 citations, all sections covered |

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

This example is carried all the way to compilable skeleton code — pydantic schemas, orchestrator,
retries, partial-failure aggregation, and the bounded revise loop — in `worked-build.md`.
