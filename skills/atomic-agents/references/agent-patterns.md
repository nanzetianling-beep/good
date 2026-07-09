# Agent & Workflow Patterns

Reference for Phase 2 (PLAN). Patterns are drawn from Anthropic's *Building Effective Agents* and the
composability model of the *Atomic Agents* framework. Pick the **simplest pattern that fits**; combine
or nest them for complex systems.

## The building block: the augmented LLM

Every atom is, at minimum, an LLM augmented with some of: **retrieval**, **tools**, and **memory**.
Before reaching for a multi-step pattern, make sure each atom's augmentations are well defined: a clear
tool contract (typed input/output + a model-facing description) and only the context it needs.

## Workflow patterns

### 1. Prompt chaining
Decompose a task into a **fixed sequence** of steps; each LLM call processes the previous output.
Add programmatic **gates** between steps to validate intermediate results and halt on failure.

- Use when: the task splits cleanly into predictable, ordered subtasks.
- Trades latency for accuracy by making each call easier.
- Atomic view: atoms whose output schema feeds the next atom's input schema.

### 2. Routing
A classifier (LLM or code) inspects the input and directs it to **one of several specialized handlers**.

- Use when: inputs fall into distinct categories best served by different prompts/tools/models.
- Benefit: separation of concerns — optimize each route independently without cross-interference.
- Atomic view: one router atom → N specialized downstream atoms.

### 3. Parallelization
Run multiple LLM calls **simultaneously**, then aggregate. Two forms:
- **Sectioning** — split the task into independent subtasks that run at once.
- **Voting** — run the same task several times to get diverse outputs, then aggregate (consensus/best-of).

- Use when: subtasks are independent (speed) or you want confidence via multiple attempts.
- With subagents, independent branches finish in the time of the slowest one, not the sum.

### 4. Orchestrator-workers
A central **orchestrator** LLM **dynamically** breaks the task into subtasks, delegates each to a
**worker**, and synthesizes the results.

- Use when: you cannot predict the subtasks in advance (they depend on the input).
- Key difference from parallelization: subtasks are **determined at runtime**, not pre-defined.
- Atomic view: orchestrator owns global planning/state; each worker is a single-responsibility atom
  with clear inputs/outputs. Pass workers everything they need explicitly — a fresh worker has none of
  the orchestrator's context.

### 5. Evaluator-optimizer
One LLM **generates** a response; another **evaluates** it and returns feedback; loop until it passes.

- Use when: you have clear evaluation criteria and iterative refinement measurably helps (like a human
  editing draft after feedback).
- Always bound the loop with a max-iteration / budget stop condition.

## Autonomous agents

An agent plans and executes **on its own**, using tools in a loop and deciding its next step from the
environment's feedback, until a stop condition is met.

- Use when: the number and order of steps genuinely can't be predicted, and open-endedness is worth
  the cost in latency, tokens, and unpredictability.
- Requirements: a solid tool set with good descriptions (the agent-computer interface), a way to get
  ground-truth feedback, and **explicit stop conditions** (task complete, max iterations, budget cap,
  human checkpoint). Test in a sandbox with guardrails.

## Subagents as atoms (Claude Agent SDK)

Subagents are a concrete way to build atoms with **isolated context**:
- A subagent starts with a **fresh context window**; the only channel in is the prompt string — include
  all needed file paths, errors, and decisions explicitly.
- Intermediate tool calls stay inside the subagent; only its **final message** returns to the parent,
  keeping the main context clean (e.g. a research atom reads many files, returns one summary).
- Give each subagent **one job** and a tailored system prompt; let an orchestrator coordinate global
  planning and state. Independent subagents can run **concurrently**.

## Choosing a pattern (quick heuristic)

| Situation | Pattern |
|---|---|
| Known ordered steps | Prompt chaining |
| Distinct input categories | Routing |
| Independent subtasks / want consensus | Parallelization |
| Subtasks unknown until runtime | Orchestrator-workers |
| Clear criteria + iterate to improve | Evaluator-optimizer |
| Path truly unpredictable, open-ended | Autonomous agent |

When in doubt, start with the simplest row that fits and only escalate if it fails.
