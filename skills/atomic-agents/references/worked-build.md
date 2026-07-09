# Worked Build: Competitive-Research Agent (Design → Skeleton Code)

The competitive-research example from `design-phases.md`, taken all the way to compilable skeleton
code. Read this after filling in the Phase 1-2 templates — every constant, schema, and control-flow
decision in the code below traces back to a row in those deliverables.

Style choice: **pydantic** models at every boundary (pick one style and stay consistent; plain
`dataclasses` + manual validation also works, but you lose validation-on-construction). The LLM calls
are stubs (`call_llm`) — the skeleton compiles but isn't runnable until you wire a real client
(Anthropic SDK, an Atomic Agents `AtomicAgent`, etc.). In Atomic Agents terms, each atom below is the
body of an `AtomicAgent[InputSchema, OutputSchema]`; here they're plain functions to keep the skeleton
framework-neutral.

## What the plan decided (recap)

| Decision | Value | Where it lands in code |
|---|---|---|
| Pattern | fan-out fetch/extract, then analyze ↔ report gate loop | `research()` control flow |
| Atoms | fetch (tool), extract (LLM), analyze (LLM), report (plain-code gate) | one function each |
| Retry policy | fetch: 1 retry; LLM atoms: no auto-retry (the loop is the retry) | `FETCH_ATTEMPTS`, `run_step` |
| Failure budget | any URL may fail, but ≥ 3 usable sources or abort | `MIN_SOURCES` floor |
| Stop condition | first pass + max 2 revisions, then return best effort | `MAX_REVISE_LOOPS` |
| Success criteria | ≥ 3 citations, covers positioning/competitors/news | `report_atom` gate |

## The skeleton

```python
"""Competitive-research agent -- skeleton build.

Four atoms (fetch -> extract -> analyze -> report) wired by an orchestrator
with schema-validated boundaries, bounded retries, partial-failure
aggregation, and an explicit stop condition on the revise loop.

Style choice: pydantic models at every boundary (validation on construction).
LLM calls are stubs -- the skeleton compiles but is not runnable as-is.
"""

from __future__ import annotations

from typing import Callable, TypeVar

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Budgets & stop conditions (from the Phase 2 plan -- decided before any code)
# ---------------------------------------------------------------------------

FETCH_ATTEMPTS = 2          # bounded retry: 1 try + 1 retry per URL
MIN_SOURCES = 3             # partial-failure floor: fewer extracts => abort
MAX_REVISE_LOOPS = 2        # cap on the analyze <-> report loop
MIN_CITATIONS = 3           # success criterion from the goal spec


# ---------------------------------------------------------------------------
# Schemas -- one model per composition boundary (the load-bearing part)
# ---------------------------------------------------------------------------

class FetchInput(BaseModel):
    url: str


class FetchOutput(BaseModel):
    url: str
    status: int
    text: str


class ExtractInput(BaseModel):
    url: str
    text: str


class ExtractOutput(BaseModel):
    url: str
    facts: list[str] = Field(default_factory=list)


class AnalyzeInput(BaseModel):
    company: str
    extracts: list[ExtractOutput]
    gaps: list[str] = Field(default_factory=list)  # evaluator feedback (revise passes)


class AnalyzeOutput(BaseModel):
    summary: str
    citations: list[str]


class ReportInput(BaseModel):
    company: str
    summary: str
    citations: list[str]


class ReportOutput(BaseModel):
    passed: bool
    gaps: list[str] = Field(default_factory=list)
    markdown: str = ""


# ---------------------------------------------------------------------------
# LLM stub -- swap in your client (Anthropic SDK, an Atomic Agents agent, ...)
# ---------------------------------------------------------------------------

def call_llm(prompt: str) -> str:
    raise NotImplementedError("wire to your LLM client")


# ---------------------------------------------------------------------------
# Atoms -- each is a plain function: InputModel -> OutputModel
# ---------------------------------------------------------------------------

def fetch_atom(inp: FetchInput) -> FetchOutput:
    """Tool atom (no LLM): fetch one URL. May raise -- the orchestrator retries."""
    import urllib.request

    with urllib.request.urlopen(inp.url, timeout=10) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        status = resp.status
    return FetchOutput(url=inp.url, status=status, text=body)


def extract_atom(inp: ExtractInput) -> ExtractOutput:
    """LLM atom: pull competitive facts from one fetched page."""
    raw = call_llm(
        "Extract concrete competitive facts (positioning, competitors, news) "
        f"from this page. One fact per line.\n\nURL: {inp.url}\n\n{inp.text[:20000]}"
    )
    facts = [line.strip("-* ").strip() for line in raw.splitlines() if line.strip()]
    return ExtractOutput(url=inp.url, facts=facts)


def analyze_atom(inp: AnalyzeInput) -> AnalyzeOutput:
    """LLM atom: synthesize a cited summary from all extracts."""
    sources = "\n\n".join(f"[{e.url}]\n" + "\n".join(e.facts) for e in inp.extracts)
    gap_note = f"\nAddress these gaps: {'; '.join(inp.gaps)}" if inp.gaps else ""
    raw = call_llm(
        f"Write a competitive summary of {inp.company} covering positioning, "
        "competitors, and news. Cite sources by URL in [brackets] after each "
        f"claim.{gap_note}\n\nSources:\n{sources}"
    )
    citations = sorted({e.url for e in inp.extracts if e.url in raw})
    return AnalyzeOutput(summary=raw, citations=citations)


def report_atom(inp: ReportInput) -> ReportOutput:
    """Gate atom (plain code, no LLM): check success criteria, format output."""
    gaps: list[str] = []
    if len(inp.citations) < MIN_CITATIONS:
        gaps.append(f"only {len(inp.citations)} citations; need >= {MIN_CITATIONS}")
    for section in ("positioning", "competitors", "news"):
        if section not in inp.summary.lower():
            gaps.append(f"missing coverage: {section}")
    if gaps:
        return ReportOutput(passed=False, gaps=gaps)
    md = (
        f"# Competitive summary: {inp.company}\n\n{inp.summary}\n\n## Sources\n"
        + "\n".join(f"- {c}" for c in inp.citations)
    )
    return ReportOutput(passed=True, markdown=md)


# ---------------------------------------------------------------------------
# Orchestrator -- a predefined code path (this is a workflow, not an agent)
# ---------------------------------------------------------------------------

I = TypeVar("I", bound=BaseModel)
O = TypeVar("O", bound=BaseModel)


class StepFailed(RuntimeError):
    """A step exhausted its retries, or a floor/budget was violated."""


def run_step(atom: Callable[[I], O], inp: I, out_type: type[O],
             attempts: int = 1) -> O:
    """Run one atom with bounded retries and a schema-boundary assert."""
    last_err: Exception | None = None
    for _ in range(attempts):
        try:
            out = atom(inp)
            assert isinstance(out, out_type), (      # boundary contract
                f"{atom.__name__} returned {type(out).__name__}, "
                f"expected {out_type.__name__}"
            )
            return out
        except AssertionError:
            raise                        # contract bugs are not retryable
        except Exception as err:         # tool flakiness is
            last_err = err
    raise StepFailed(f"{atom.__name__} failed after {attempts} attempts: {last_err}")


def research(company: str, urls: list[str]) -> ReportOutput:
    """End-to-end pipeline: fetch/extract fan-out, then a bounded revise loop."""
    # Stage 1+2 -- fetch -> extract per URL, aggregating partial failures.
    extracts: list[ExtractOutput] = []
    failures: list[str] = []
    for url in urls:                     # swap for a thread pool to parallelize
        try:
            page = run_step(fetch_atom, FetchInput(url=url), FetchOutput,
                            attempts=FETCH_ATTEMPTS)
            ext = run_step(extract_atom,
                           ExtractInput(url=page.url, text=page.text),
                           ExtractOutput)
            if ext.facts:
                extracts.append(ext)
        except StepFailed as err:
            failures.append(f"{url}: {err}")   # drop this URL, keep going

    if len(extracts) < MIN_SOURCES:      # partial-failure floor
        raise StepFailed(
            f"only {len(extracts)} usable sources (need {MIN_SOURCES}); "
            f"failed: {failures}"
        )

    # Stage 3+4 -- analyze <-> report loop, bounded by MAX_REVISE_LOOPS.
    gaps: list[str] = []
    report = ReportOutput(passed=False, gaps=["never ran"])
    for _ in range(1 + MAX_REVISE_LOOPS):      # first pass + bounded revisions
        analysis = run_step(
            analyze_atom,
            AnalyzeInput(company=company, extracts=extracts, gaps=gaps),
            AnalyzeOutput,
        )
        report = run_step(
            report_atom,
            ReportInput(company=company, summary=analysis.summary,
                        citations=analysis.citations),
            ReportOutput,
        )
        if report.passed:                # stop condition: success ...
            break
        gaps = report.gaps               # feed gate feedback back into analyze
    return report                        # ... or best effort after the cap
```

## Why the skeleton looks like this

- **Schemas first, atoms second.** The eight models are the Phase 2 deliverable rendered directly
  into code. Note the deliberate mismatch handling at each junction: `FetchOutput` → `ExtractInput`
  drops `status` (extract doesn't need it), and the orchestrator does the mapping explicitly —
  boundaries are where you *choose* what flows forward, which is also how you keep context tight.
- **`run_step` is the only place retries and boundary asserts live.** Atoms stay pure
  (`InputModel -> OutputModel`, raise on failure); policy is orchestrator-side. Contract violations
  (`AssertionError`) re-raise immediately — retrying a type bug just burns budget. Pydantic already
  validates field types on construction; the `isinstance` assert catches the other class of bug,
  an atom returning the wrong *model* entirely.
- **Partial failure is aggregated, not fatal.** A dead URL is dropped and recorded; only breaching
  the `MIN_SOURCES` floor aborts the run — that floor is the "failure budget" row of the goal spec.
- **The evaluator is plain code.** `report_atom` gates on mechanically checkable criteria
  (citation count, section coverage). Only make the evaluator an LLM when the criteria genuinely
  need judgment; a code gate is cheaper, deterministic, and can't rubber-stamp.
- **The loop is bounded and degrades gracefully.** `1 + MAX_REVISE_LOOPS` passes, then it returns
  the last report *with `passed=False` and its gaps intact* — the caller decides what a best-effort
  result is worth. Never let a quality loop be the thing that hangs the pipeline.
- **Workflow, not agent.** Every step was known at design time, so this is predefined code — no
  model decides control flow. If you later need dynamic source discovery, that's the moment to
  consider promoting stage 1 to an orchestrator-workers pattern, not before.

## What to build next (Phase 3 order)

1. Replace `call_llm` with a real client; unit-test `extract_atom` on messy/paywalled pages and
   `report_atom` on a citation-less summary (it must fail it).
2. Junction tests: feed a canned `FetchOutput` into extract, canned `ExtractOutput[]` into analyze.
3. Failure injection: make fetch raise twice (retry path), kill enough URLs to breach `MIN_SOURCES`
   (floor path), force `passed=False` three times (loop-cap path).
4. Parallelize the fan-out (`concurrent.futures.ThreadPoolExecutor`) — the per-URL body is already
   independent, so this is a mechanical change. In a Claude Agent SDK build, each fetch+extract
   branch maps naturally onto a subagent: noisy page content stays in the subagent's context and
   only the compact `ExtractOutput` returns to the parent.
5. Run end-to-end on 3 real companies against the goal-spec success criteria.
